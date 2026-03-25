/**
 * ui.js
 * All button bindings, SVG event listeners, and toolbar state management.
 * Exports setDetectionStatus for use by detection modules.
 */

import { SNAP_DISTANCE, state } from './state.js';
import {
    saveHotspots, generateId, nextColor, requestRedraw,
    getNormalizedPos, svg, imgEl, $imageUrlInput, $emptyState,
} from './helpers.js';
import { renderHotspotList } from './render.js';
import { closeShape } from './tools/polygon.js';
import { finishRect } from './tools/rectangle.js';
import { mergePolygons } from './tools/merge.js';
import { detectRooms } from './detection/auto.js';
import { runSeedFill } from './detection/seed.js';

/* global fp360Admin, wp */

export function initUI() {
    const $ = window.jQuery;

    // --- Image picker ---
    $('#fp360_pick_image').on('click', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) return;
        const frame = wp.media({ title: 'Select Floorplan', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            $imageUrlInput.val(attachment.url);
            if (imgEl) { imgEl.src = attachment.url; $(imgEl).show(); }
            if (svg) $(svg).show();
            if ($emptyState) $emptyState.hide();
            requestRedraw();
        });
        frame.open();
    });

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
            if (!imgEl || !imgEl.src || ($emptyState && $emptyState.is(':visible'))) return;
            const pos = getNormalizedPos(e);

            // Seed mode click
            if (state.seedMode) {
                state.seeds.push({ x: pos.x, y: pos.y });
                $('#fp360-run-fill').prop('disabled', false);
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

    $('#fp360-undo-point').on('click', function () {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) {
            state.drawing = false;
            if (svg) svg.classList.remove('fp360-snap-active');
        }
        requestRedraw();
    });

    // Polygon tool toggle
    $('#fp360-poly-tool').on('click', function () {
        state.polyMode = !state.polyMode;
        if (state.polyMode) {
            // Exit other active modes
            state.rectMode      = false;
            state.seedMode      = false;
            state.rectStart     = null;
            state.rectCurrent   = null;
            $('#fp360-rect-tool').removeClass('is-active')
                .text(fp360Admin.i18n.rectTool || 'Rectangle');
            $('#fp360-seed-mode').removeClass('is-active')
                .text(fp360Admin.i18n.seedMode || 'Seed Rooms');
            $(this).addClass('is-active')
                .text(fp360Admin.i18n.polyModeActive || '✕ Cancel Polygon');
            if (svg) svg.style.cursor = 'crosshair';
        } else {
            // Cancelling — discard any in-progress drawing
            state.drawing       = false;
            state.currentPoints = [];
            if (svg) svg.classList.remove('fp360-snap-active');
            $(this).removeClass('is-active')
                .text(fp360Admin.i18n.polyTool || 'Polygon');
            if (svg) svg.style.cursor = '';
        }
        requestRedraw();
    });

    $('#fp360-rect-tool').on('click', function () {
        state.rectMode = !state.rectMode;
        if (state.rectMode) {
            state.drawing       = false;
            state.currentPoints = [];
            state.seedMode      = false;
            state.polyMode      = false;
            if (svg) svg.classList.remove('fp360-snap-active');
            $('#fp360-seed-mode').removeClass('is-active')
                .text(fp360Admin.i18n.seedMode || 'Seed Rooms');
            $('#fp360-poly-tool').removeClass('is-active')
                .text(fp360Admin.i18n.polyTool || 'Polygon');
            $(this).addClass('is-active')
                .text(fp360Admin.i18n.rectModeActive || 'Cancel Rectangle');
            if (svg) svg.style.cursor = 'crosshair';
        } else {
            $(this).removeClass('is-active')
                .text(fp360Admin.i18n.rectTool || 'Rectangle');
            if (svg) svg.style.cursor = '';
        }
        requestRedraw();
    });

    // Experimental panel toggle
    $('#fp360-experimental-toggle').on('click', function () {
        const $panel = $('#fp360-experimental-panel');
        const open   = $panel.is(':visible');
        $panel.toggle(!open);
        $(this)
            .toggleClass('is-active', !open)
            .find('.fp360-exp-arrow')
            .text(open ? '▾' : '▴');
    });

    $('#fp360-merge-rooms').on('click', function () {
        if (state.selectedIds.size !== 2) return;
        const ids = [...state.selectedIds];
        const a   = state.hotspots.find(h => h.id === ids[0]);
        const b   = state.hotspots.find(h => h.id === ids[1]);
        if (!a || !b) return;
        const merged = mergePolygons(a, b);
        if (!merged) {
            alert(fp360Admin.i18n.mergeError || 'Rooms must overlap or share an edge.');
            return;
        }
        state.hotspots = state.hotspots.filter(h => !state.selectedIds.has(h.id));
        state.hotspots.push({
            id:       generateId(),
            points:   merged,
            label:    a.label   || fp360Admin.i18n.newRoom || 'New Room',
            image360: a.image360 || '',
            color:    a.color   || nextColor(),
        });
        state.selectedIds.clear();
        saveHotspots();
        renderHotspotList();
        requestRedraw();
    });

    $('#fp360-seed-mode').on('click', function () {
        state.seedMode = !state.seedMode;
        if (state.seedMode) {
            state.drawing       = false;
            state.currentPoints = [];
            state.polyMode      = false;
            if (svg) svg.classList.remove('fp360-snap-active');
            $('#fp360-poly-tool').removeClass('is-active')
                .text(fp360Admin.i18n.polyTool || 'Polygon');
            $(this).addClass('is-active')
                .text(fp360Admin.i18n.seedModeActive || 'Cancel Seed Mode');
            if (svg) svg.style.cursor = 'crosshair';
            $('#fp360-run-fill').prop('disabled', state.seeds.length === 0);
            setDetectionStatus('seed-mode');
        } else {
            $(this).removeClass('is-active')
                .text(fp360Admin.i18n.seedMode || 'Seed Rooms');
            if (svg) svg.style.cursor = '';
            $('#fp360-run-fill').prop('disabled', true);
            setDetectionStatus('idle');
        }
        requestRedraw();
    });

    $('#fp360-run-fill').on('click', function () {
        if (state.seeds.length === 0) return;
        const tolerance = parseInt($('#fp360-detect-tolerance').val(), 10) || 3;
        state.seedMode = false;
        $('#fp360-seed-mode').removeClass('is-active')
            .text(fp360Admin.i18n.seedMode || 'Seed Rooms');
        if (svg) svg.style.cursor = '';
        $('#fp360-run-fill').prop('disabled', true);
        runSeedFill(state.seeds, tolerance);
    });

    $('#fp360-clear-seeds').on('click', function () {
        state.seeds = [];
        $('#fp360-run-fill').prop('disabled', true);
        requestRedraw();
    });

    $('#fp360-detect-rooms').on('click', function () {
        const tolerance = parseInt($('#fp360-detect-tolerance').val(), 10) || 3;
        if (state.hotspots.length > 0) {
            if (!confirm(fp360Admin.i18n.detectConfirmClear || 'Clear existing rooms and re-detect?')) return;
            state.hotspots = [];
            state.selectedIds.clear();
            saveHotspots();
            renderHotspotList();
            requestRedraw();
        }
        detectRooms(tolerance);
    });

    $('#fp360-clear-rooms').on('click', function () {
        if (state.hotspots.length === 0) return;
        if (confirm(fp360Admin.i18n.clearAllConfirm || 'Delete all rooms?')) {
            state.hotspots = [];
            state.selectedIds.clear();
            saveHotspots();
            renderHotspotList();
            requestRedraw();
        }
    });

    $('#fp360-detect-tolerance').on('input', function () {
        $('#fp360-detect-tolerance-val').text($(this).val());
    });

    // --- Delegated handlers ---

    $(document).on('click', '.fp360-hs-pick360', function (e) {
        e.preventDefault();
        const id    = $(this).data('id');
        const frame = wp.media({ title: 'Select 360 Image', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const hs = state.hotspots.find(h => h.id === id);
            if (hs) { hs.image360 = attachment.url; saveHotspots(); renderHotspotList(); }
        });
        frame.open();
    });

    $(document).on('click', '.fp360-hs-delete', function () {
        if (confirm(fp360Admin.i18n.deleteRoomConfirm)) {
            const id = $(this).data('id');
            state.hotspots = state.hotspots.filter(h => h.id !== id);
            state.selectedIds.delete(id);
            saveHotspots();
            renderHotspotList();
            requestRedraw();
        }
    });

    $(document).on('input', '.fp360-hs-label, .fp360-hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label    = $(`.fp360-hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.fp360-hs-img360[data-id="${id}"]`).val();
            saveHotspots();
            requestRedraw();
        }
    });

    window.addEventListener('resize', requestRedraw);
}

/** Updates the status bar. Called by detection modules and toolbar toggles. */
export function setDetectionStatus(status, count) {
    const $ = window.jQuery;
    /* global fp360Admin */
    const $btn    = $('#fp360-detect-rooms');
    const $status = $('#fp360-detect-status');
    const i18n    = fp360Admin.i18n;

    const cfgMap = {
        processing: { btn: i18n.detecting  || 'Detecting...', disabled: true,  cls: 'fp360-status--info'    },
        done:       { btn: i18n.detectRooms || 'Auto-Detect',  disabled: false, cls: 'fp360-status--success' },
        'none-found':{ btn: i18n.detectRooms|| 'Auto-Detect',  disabled: false, cls: 'fp360-status--warn'    },
        'no-image': { btn: i18n.detectRooms || 'Auto-Detect',  disabled: false, cls: 'fp360-status--warn'    },
        error:      { btn: i18n.detectRooms || 'Auto-Detect',  disabled: false, cls: 'fp360-status--error'   },
        'seed-mode':{ btn: i18n.detectRooms || 'Auto-Detect',  disabled: false, cls: 'fp360-status--info'    },
        idle:       { btn: i18n.detectRooms || 'Auto-Detect',  disabled: false, cls: ''                      },
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
    $btn.prop('disabled', cfg.disabled).text(cfg.btn);
    $status
        .text(msgMap[status] || '')
        .removeClass('fp360-status--info fp360-status--success fp360-status--warn fp360-status--error')
        .addClass(cfg.cls)
        .show();
}