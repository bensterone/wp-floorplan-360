/**
 * ui.js
 * All button bindings, SVG event listeners, and toolbar state management.
 * Exports setDetectionStatus for use by detection modules.
 */

import { SNAP_DISTANCE, state } from './state.js';
import {
    saveHotspots, generateId, nextColor, requestRedraw,
    getNormalizedPos, svg, imgEl, imageUrlInput, emptyState, el,
} from './helpers.js';
import { renderHotspotList } from './render.js';
import { closeShape } from './tools/polygon.js';
import { finishRect } from './tools/rectangle.js';
import { mergePolygons } from './tools/merge.js';
import { detectRooms } from './detection/auto.js';
import { runSeedFill } from './detection/seed.js';
import { setFloorplanBackground } from './helpers/floorplan-background.js';

/* global fp360Admin, wp */

/**
 * Shows a non-blocking confirmation dialog styled to match the WP admin UI.
 * Calls onConfirm() when the user clicks OK; does nothing on Cancel.
 *
 * @param {string}   message    The confirmation message to display.
 * @param {Function} onConfirm  Callback executed when the user confirms.
 */
function fp360Confirm(message, onConfirm) {
    const i18n = fp360Admin.i18n;

    const overlay   = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;' });
    const dialog    = el('div', { style: 'background:#fff;border-radius:4px;padding:24px;max-width:420px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' });
    const msg       = el('p',   { style: 'margin:0 0 20px;font-size:14px;line-height:1.5;color:#1d2327;' }, message);
    const btnRow    = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;' });
    const cancelBtn = el('button', { className: 'button' },         i18n.cancel || 'Cancel');
    const okBtn     = el('button', { className: 'button button-primary' }, i18n.ok || 'OK');

    const close = () => document.body.removeChild(overlay);
    cancelBtn.addEventListener('click', close);
    okBtn.addEventListener('click', () => { close(); onConfirm(); });
    // Allow Escape to cancel
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    btnRow.append(cancelBtn, okBtn);
    dialog.append(msg, btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
}

/**
 * Shows a brief error message in the existing detect-status bar.
 * Replaces alert() so the browser UI thread is never blocked.
 *
 * @param {string} message  The message to display.
 */
function fp360Alert(message) {
    const statusEl = document.getElementById('fp360-detect-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('fp360-status--info', 'fp360-status--success', 'fp360-status--warn');
    statusEl.classList.add('fp360-status--error');
    statusEl.style.display = '';
}

/**
 * Clear _fp360_svg_markup (and related DXF meta) on the current post via REST.
 * Called when the user picks a raster image to replace the vector floorplan.
 */
async function clearSvgMeta() {
    const postId = fp360Admin.postId;
    if (!postId) return;
    return wp.apiFetch({
        path:   `/wp/v2/floorplan/${postId}`,
        method: 'POST',
        data:   {
            meta: {
                _fp360_svg_markup:        '',
                _fp360_dxf_attachment_id: 0,
                _fp360_dxf_layers:        '',
            },
        },
    });
}

/**
 * Upload a DXF File object to the WordPress media library.
 * Returns the new attachment ID (integer).
 *
 * @param {File}   file
 * @param {number} postId  Attach the media to this post.
 * @returns {Promise<number>}
 */
async function uploadDxfToMedia(file, postId) {
    const formData = new FormData();
    formData.append('file', file);
    if (postId) formData.append('post', String(postId));

    const response = await wp.apiFetch({
        path:   '/wp/v2/media',
        method: 'POST',
        body:   formData,
    });

    const attachmentId = response && response.id ? response.id : 0;

    if (attachmentId && postId) {
        await wp.apiFetch({
            path:   `/wp/v2/floorplan/${postId}`,
            method: 'POST',
            data:   { meta: { _fp360_dxf_attachment_id: attachmentId } },
        });
    }
    return attachmentId;
}

/**
 * Build a tiny placeholder rectangle around a normalised centre point.
 * Used when pre-populating rooms from DXF text labels.
 *
 * @param {number} cx  0-1 normalised X
 * @param {number} cy  0-1 normalised Y
 * @returns {Array<{x:number, y:number}>}
 */
function centreToRect(cx, cy) {
    const hw = 0.06, hh = 0.04;
    return [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx + hw, y: cy + hh },
        { x: cx - hw, y: cy + hh },
    ];
}

export function initUI() {

    // Cache all toolbar element references once.
    const btnPickImage   = document.getElementById('fp360_pick_image');
    const btnImportDxf   = document.getElementById('fp360-import-dxf');
    const btnUndo        = document.getElementById('fp360-undo-point');
    const btnPoly        = document.getElementById('fp360-poly-tool');
    const btnRect        = document.getElementById('fp360-rect-tool');
    const btnMerge       = document.getElementById('fp360-merge-rooms');
    const btnSeed        = document.getElementById('fp360-seed-mode');
    const btnRunFill     = document.getElementById('fp360-run-fill');
    const btnClearSeeds  = document.getElementById('fp360-clear-seeds');
    const btnDetect      = document.getElementById('fp360-detect-rooms');
    const btnClearRooms  = document.getElementById('fp360-clear-rooms');
    const btnExpToggle   = document.getElementById('fp360-experimental-toggle');
    const elExpPanel     = document.getElementById('fp360-experimental-panel');
    const elDetectStatus = document.getElementById('fp360-detect-status');
    const elTolerance    = document.getElementById('fp360-detect-tolerance');
    const elToleranceVal = document.getElementById('fp360-detect-tolerance-val');

    // --- Media frames ---
    // wp.media() frames are expensive — each call creates a new Backbone view
    // that accumulates in memory. We create each frame once and reuse it.
    // The per-room 360° picker reuses a single frame by swapping the select
    // callback each time so the correct room ID is always captured.

    let floorplanFrame = null;

    if (btnPickImage) {
        btnPickImage.addEventListener('click', function (e) {
            e.preventDefault();
            if (typeof wp === 'undefined' || !wp.media) return;

            if (!floorplanFrame) {
                floorplanFrame = wp.media({ title: fp360Admin.i18n.selectFloorplan || 'Select Floorplan', multiple: false });
                floorplanFrame.on('select', function () {
                    const attachment = floorplanFrame.state().get('selection').first().toJSON();
                    if (imageUrlInput) imageUrlInput.value = attachment.url;

                    // Raster replaces vector: clear SVG meta via REST then update the canvas
                    clearSvgMeta().finally(() => {
                        const container = document.getElementById('fp360-canvas-container');
                        setFloorplanBackground(container, { imageUrl: attachment.url });
                        requestRedraw();
                    });
                });
            }
            floorplanFrame.open();
        });
    }

    // --- Import DXF button ---
    if (btnImportDxf) {
        btnImportDxf.addEventListener('click', async function () {
            const { mountDxfImporter } = await import('./dxf/index.js');
            const container = document.getElementById('fp360-canvas-container');

            mountDxfImporter(document.body, {
                onCancel() { /* modal already removed itself */ },
                async onApply(svgMarkup, rooms, dxfFile, layersJson) {
                    const i18n   = fp360Admin.i18n;
                    const postId = fp360Admin.postId;

                    setDetectionStatus('processing');
                    if (elDetectStatus) {
                        elDetectStatus.textContent  = i18n.dxfSaving || 'Saving…';
                        elDetectStatus.style.display = '';
                    }

                    try {
                        // 1. Save SVG markup + clear raster image URL
                        await wp.apiFetch({
                            path:   `/wp/v2/floorplan/${postId}`,
                            method: 'POST',
                            data:   {
                                meta: {
                                    _fp360_svg_markup: svgMarkup,
                                    _fp360_dxf_layers: layersJson,
                                    _fp360_image:      '',
                                },
                            },
                        });

                        // 2. Upload DXF to media library for archival (non-blocking)
                        if (dxfFile) {
                            uploadDxfToMedia(dxfFile, postId).catch(err => {
                                console.warn('[fp360-dxf] DXF media upload failed (archival only):', err);
                            });
                        }

                        // 3. Update the editor canvas
                        if (imageUrlInput) imageUrlInput.value = '';
                        setFloorplanBackground(container, { svgMarkup });
                        requestRedraw();

                        // 4. Pre-populate rooms if list is empty
                        if (rooms.length > 0 && state.hotspots.length === 0) {
                            rooms.forEach(room => {
                                state.hotspots.push({
                                    id:       generateId(),
                                    label:    room.label,
                                    image360: '',
                                    color:    nextColor(),
                                    points:   centreToRect(room.normX, room.normY),
                                });
                            });
                            saveHotspots();
                            renderHotspotList();
                            requestRedraw();
                        }

                        setDetectionStatus('idle');
                        if (elDetectStatus) {
                            elDetectStatus.textContent = i18n.dxfSaved || 'DXF floorplan saved.';
                            elDetectStatus.classList.remove('fp360-status--error', 'fp360-status--info');
                            elDetectStatus.classList.add('fp360-status--success');
                            elDetectStatus.style.display = '';
                        }

                    } catch (err) {
                        console.error('[fp360-dxf] Save error:', err);
                        setDetectionStatus('idle');
                        if (elDetectStatus) {
                            elDetectStatus.textContent = i18n.dxfSaveError || 'Failed to save the DXF floorplan. Please try again.';
                            elDetectStatus.classList.remove('fp360-status--success', 'fp360-status--info');
                            elDetectStatus.classList.add('fp360-status--error');
                            elDetectStatus.style.display = '';
                        }
                    }
                },
            });
        });
    }

    // --- SVG mouse events ---
    if (svg) {
        svg.addEventListener('mousemove', function (e) {
            const pos = getNormalizedPos(e);

            if (state.dragging && state.dragHotspotId !== null) {
                const hs = state.hotspots.find(h => h.id === state.dragHotspotId);
                if (hs && state.dragPointIdx !== null) {
                    hs.points[state.dragPointIdx] = {
                        x: Math.max(0, Math.min(1, pos.x)),
                        y: Math.max(0, Math.min(1, pos.y)),
                    };
                    requestRedraw();
                }
                return;
            }

            if (state.rectMode && state.rectStart) {
                state.rectCurrent = pos;
                requestRedraw();
                return;
            }

            if (!state.drawing) return;
            state.mousePos = pos;
            if (state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                svg.classList.toggle('fp360-snap-active',
                    Math.hypot(pos.x - first.x, pos.y - first.y) < SNAP_DISTANCE);
            }
            requestRedraw();
        });

        svg.addEventListener('mousedown', function (e) {
            if (!state.rectMode || state.dragging) return;
            e.preventDefault();
            const pos = getNormalizedPos(e);
            state.rectStart = state.rectCurrent = pos;
            requestRedraw();
        });

        svg.addEventListener('mouseup', function () {
            if (state.rectMode && state.rectStart && state.rectCurrent) {
                const s = state.rectStart, c = state.rectCurrent;
                if (Math.abs(c.x - s.x) > 0.02 && Math.abs(c.y - s.y) > 0.02) {
                    finishRect(s, c);
                }
                state.rectStart = state.rectCurrent = null;
                requestRedraw();
                return;
            }
            if (state.dragging) {
                state.dragging      = false;
                state.dragHotspotId = null;
                state.dragPointIdx  = null;
                saveHotspots();
            }
        });

        svg.addEventListener('mouseleave', function () {
            if (state.dragging) {
                state.dragging      = false;
                state.dragHotspotId = null;
                state.dragPointIdx  = null;
                saveHotspots();
            }
            if (state.rectMode && state.rectStart) {
                state.rectStart = state.rectCurrent = null;
                requestRedraw();
            }
        });

        svg.addEventListener('click', function (e) {
            if (state.dragging || state.rectMode) return;
            if (!imgEl || !imgEl.src || (emptyState && emptyState.style.display !== 'none')) return;
            const pos = getNormalizedPos(e);

            // Seed mode click
            if (state.seedMode) {
                state.seeds.push({ x: pos.x, y: pos.y });
                if (btnRunFill) btnRunFill.disabled = false;
                requestRedraw();
                return;
            }

            // Polygon drawing — only active when polyMode is on.
            // Without this guard any accidental canvas click starts drawing.
            if (!state.polyMode) return;

            if (state.drawing && state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                if (Math.hypot(pos.x - first.x, pos.y - first.y) < SNAP_DISTANCE) {
                    closeShape();
                    return;
                }
            }
            state.drawing = true;
            state.currentPoints.push(pos);
            requestRedraw();
        });

        svg.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (state.drawing && state.currentPoints.length >= 3) closeShape();
        });
    }

    // --- Toolbar buttons ---

    if (btnUndo) {
        btnUndo.addEventListener('click', function () {
            state.currentPoints.pop();
            if (state.currentPoints.length === 0) {
                state.drawing = false;
                if (svg) svg.classList.remove('fp360-snap-active');
            }
            requestRedraw();
        });
    }

    // Polygon tool toggle
    if (btnPoly) {
        btnPoly.addEventListener('click', function () {
            state.polyMode = !state.polyMode;
            if (state.polyMode) {
                // Exit other active modes
                state.rectMode    = false;
                state.seedMode    = false;
                state.rectStart   = null;
                state.rectCurrent = null;
                if (btnRect) { btnRect.classList.remove('is-active'); btnRect.textContent = fp360Admin.i18n.rectTool || 'Rectangle'; }
                if (btnSeed) { btnSeed.classList.remove('is-active'); btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms'; }
                btnPoly.classList.add('is-active');
                btnPoly.textContent = fp360Admin.i18n.polyModeActive || '✕ Cancel Polygon';
                if (svg) svg.style.cursor = 'crosshair';
            } else {
                // Cancelling — discard any in-progress drawing
                state.drawing       = false;
                state.currentPoints = [];
                if (svg) svg.classList.remove('fp360-snap-active');
                btnPoly.classList.remove('is-active');
                btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon';
                if (svg) svg.style.cursor = '';
            }
            requestRedraw();
        });
    }

    // Rectangle tool toggle
    if (btnRect) {
        btnRect.addEventListener('click', function () {
            state.rectMode = !state.rectMode;
            if (state.rectMode) {
                state.drawing       = false;
                state.currentPoints = [];
                state.seedMode      = false;
                state.polyMode      = false;
                if (svg) svg.classList.remove('fp360-snap-active');
                if (btnSeed) { btnSeed.classList.remove('is-active'); btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms'; }
                if (btnPoly) { btnPoly.classList.remove('is-active'); btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon'; }
                btnRect.classList.add('is-active');
                btnRect.textContent = fp360Admin.i18n.rectModeActive || 'Cancel Rectangle';
                if (svg) svg.style.cursor = 'crosshair';
            } else {
                btnRect.classList.remove('is-active');
                btnRect.textContent = fp360Admin.i18n.rectTool || 'Rectangle';
                if (svg) svg.style.cursor = '';
            }
            requestRedraw();
        });
    }

    // Experimental panel toggle
    if (btnExpToggle && elExpPanel) {
        btnExpToggle.addEventListener('click', function () {
            const open = elExpPanel.style.display !== 'none';
            elExpPanel.style.display = open ? 'none' : '';
            btnExpToggle.classList.toggle('is-active', !open);
            const arrow = btnExpToggle.querySelector('.fp360-exp-arrow');
            if (arrow) arrow.textContent = open ? '▾' : '▴';
        });
    }

    if (btnMerge) {
        btnMerge.addEventListener('click', function () {
            if (state.selectedIds.size !== 2) return;
            const ids = [...state.selectedIds];
            const a   = state.hotspots.find(h => h.id === ids[0]);
            const b   = state.hotspots.find(h => h.id === ids[1]);
            if (!a || !b) return;
            const merged = mergePolygons(a, b);
            if (!merged) {
                fp360Alert(fp360Admin.i18n.mergeError || 'Rooms must overlap or share an edge.');
                return;
            }
            state.hotspots = state.hotspots.filter(h => !state.selectedIds.has(h.id));
            state.hotspots.push({
                id:       generateId(),
                points:   merged,
                label:    a.label    || fp360Admin.i18n.newRoom || 'New Room',
                image360: a.image360 || '',
                color:    a.color    || nextColor(),
            });
            state.selectedIds.clear();
            saveHotspots();
            renderHotspotList();
            requestRedraw();
        });
    }

    if (btnSeed) {
        btnSeed.addEventListener('click', function () {
            state.seedMode = !state.seedMode;
            if (state.seedMode) {
                state.drawing       = false;
                state.currentPoints = [];
                state.polyMode      = false;
                if (svg) svg.classList.remove('fp360-snap-active');
                if (btnPoly) { btnPoly.classList.remove('is-active'); btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon'; }
                btnSeed.classList.add('is-active');
                btnSeed.textContent = fp360Admin.i18n.seedModeActive || 'Cancel Seed Mode';
                if (svg) svg.style.cursor = 'crosshair';
                if (btnRunFill) btnRunFill.disabled = state.seeds.length === 0;
                setDetectionStatus('seed-mode');
            } else {
                btnSeed.classList.remove('is-active');
                btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms';
                if (svg) svg.style.cursor = '';
                if (btnRunFill) btnRunFill.disabled = true;
                setDetectionStatus('idle');
            }
            requestRedraw();
        });
    }

    if (btnRunFill) {
        btnRunFill.addEventListener('click', function () {
            if (state.seeds.length === 0) return;
            const tolerance = parseInt(elTolerance ? elTolerance.value : '3', 10) || 3;
            state.seedMode = false;
            if (btnSeed) { btnSeed.classList.remove('is-active'); btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms'; }
            if (svg) svg.style.cursor = '';
            btnRunFill.disabled = true;
            runSeedFill(state.seeds, tolerance);
        });
    }

    if (btnClearSeeds) {
        btnClearSeeds.addEventListener('click', function () {
            state.seeds = [];
            if (btnRunFill) btnRunFill.disabled = true;
            requestRedraw();
        });
    }

    if (btnDetect) {
        btnDetect.addEventListener('click', function () {
            const tolerance = parseInt(elTolerance ? elTolerance.value : '3', 10) || 3;
            if (state.hotspots.length > 0) {
                fp360Confirm(fp360Admin.i18n.detectConfirmClear || 'Clear existing rooms and re-detect?', () => {
                    state.hotspots = [];
                    state.selectedIds.clear();
                    saveHotspots();
                    renderHotspotList();
                    requestRedraw();
                    detectRooms(tolerance);
                });
                return;
            }
            detectRooms(tolerance);
        });
    }

    if (btnClearRooms) {
        btnClearRooms.addEventListener('click', function () {
            if (state.hotspots.length === 0) return;
            fp360Confirm(fp360Admin.i18n.clearAllConfirm || 'Delete all rooms?', () => {
                state.hotspots = [];
                state.selectedIds.clear();
                saveHotspots();
                renderHotspotList();
                requestRedraw();
            });
        });
    }

    if (elTolerance && elToleranceVal) {
        elTolerance.addEventListener('input', function () {
            elToleranceVal.textContent = elTolerance.value;
        });
    }

    // --- Delegated handlers ---
    // Buttons inside the hotspot list are created dynamically by renderHotspotList,
    // so we delegate to document rather than binding to each element directly.

    let pick360Frame   = null;
    let pick360Handler = null;

    document.addEventListener('click', function (e) {
        // Pick 360° image
        const pickBtn = e.target.closest('.fp360-hs-pick360');
        if (pickBtn) {
            e.preventDefault();
            const id = pickBtn.dataset.id;

            if (!pick360Frame) {
                pick360Frame = wp.media({ title: fp360Admin.i18n.pick360 || 'Select 360 Image', multiple: false });
            }

            // Remove the previous select handler and attach one for this room.
            if (pick360Handler) pick360Frame.off('select', pick360Handler);
            pick360Handler = function () {
                const attachment = pick360Frame.state().get('selection').first().toJSON();
                const hs = state.hotspots.find(h => h.id === id);
                if (hs) { hs.image360 = attachment.url; saveHotspots(); renderHotspotList(); }
            };
            pick360Frame.on('select', pick360Handler);
            pick360Frame.open();
            return;
        }

        // Delete room
        const deleteBtn = e.target.closest('.fp360-hs-delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            fp360Confirm(fp360Admin.i18n.deleteRoomConfirm || 'Delete this room?', () => {
                state.hotspots = state.hotspots.filter(h => h.id !== id);
                state.selectedIds.delete(id);
                saveHotspots();
                renderHotspotList();
                requestRedraw();
            });
        }
    });

    document.addEventListener('input', function (e) {
        const target = e.target.closest('.fp360-hs-label, .fp360-hs-img360');
        if (!target) return;
        const id = target.dataset.id;
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label    = document.querySelector(`.fp360-hs-label[data-id="${id}"]`)?.value ?? '';
            hs.image360 = document.querySelector(`.fp360-hs-img360[data-id="${id}"]`)?.value ?? '';
            saveHotspots();
            requestRedraw();
        }
    });

    window.addEventListener('resize', requestRedraw);
}

/** Updates the status bar. Called by detection modules and toolbar toggles. */
export function setDetectionStatus(status, count) {
    /* global fp360Admin */
    const btnDetect = document.getElementById('fp360-detect-rooms');
    const elStatus  = document.getElementById('fp360-detect-status');
    const i18n      = fp360Admin.i18n;

    const cfgMap = {
        processing:  { btn: i18n.detecting   || 'Detecting...', disabled: true,  cls: 'fp360-status--info'    },
        done:        { btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: 'fp360-status--success' },
        'none-found':{ btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: 'fp360-status--warn'    },
        'no-image':  { btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: 'fp360-status--warn'    },
        error:       { btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: 'fp360-status--error'   },
        'seed-mode': { btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: 'fp360-status--info'    },
        idle:        { btn: i18n.detectRooms  || 'Auto-Detect',  disabled: false, cls: ''                      },
    };

    const msgMap = {
        processing:   i18n.detecting        || 'Detecting rooms...',
        done:         (i18n.detectedRooms   || 'Detected {n} room(s).').replace('{n}', count),
        'none-found': i18n.noRoomsFound     || 'No rooms detected.',
        'no-image':   i18n.noImageForDetect || 'Please upload a floorplan image first.',
        error:        i18n.detectionError   || 'Detection failed. Draw rooms manually.',
        'seed-mode':  i18n.seedModeHint     || 'Click inside each room, then click Run Fill.',
        idle:         '',
    };

    const cfg = cfgMap[status] || cfgMap.error;

    if (btnDetect) {
        btnDetect.disabled     = cfg.disabled;
        btnDetect.textContent  = cfg.btn;
    }

    if (elStatus) {
        elStatus.textContent = msgMap[status] || '';
        ['fp360-status--info', 'fp360-status--success', 'fp360-status--warn', 'fp360-status--error']
            .forEach(c => elStatus.classList.remove(c));
        if (cfg.cls) elStatus.classList.add(cfg.cls);
        elStatus.style.display = '';
    }
}
