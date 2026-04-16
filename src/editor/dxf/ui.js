/**
 * dxf/ui.js
 * Modal panel for DXF import: file picker, Web Worker progress,
 * layer toggles, SVG preview, rooms list, Apply/Cancel.
 *
 * Exported: mountDxfImporter(container, { onApply, onCancel })
 */

import { resolveInserts, calculateBBox, toSvgSpace } from './transformer.js';
import { renderSvg, layerCounts }                    from './renderer.js';
import { el }                                         from '../helpers.js';

// Layers that should be checked ON by default in the toggle list + used for room labels.
const DEFAULT_ON = new Set(['walls', 'doors', 'windows', 'texts', 'roomitems', 'nocategory']);

// Layer display order in the checkbox list (matches the painter render order).
const LAYER_DISPLAY_ORDER = [
    'walls', 'doors', 'windows', 'texts',
    'wallitems', 'roomitems', 'plumbing', 'furnitures', 'nocategory',
];

// Timeout for worker parse (30 s).
const WORKER_TIMEOUT_MS = 30_000;

// File size limits.
const MAX_FILE_BYTES  = 10 * 1024 * 1024;  // 10 MB hard reject
const WARN_FILE_BYTES =  5 * 1024 * 1024;  //  5 MB soft warning

// Maximum resolved geometry items (after INSERT expansion).
// A DXF with deeply nested block references can explode a modest file into
// hundreds of thousands of draw calls — this cap prevents that.
const MAX_ENTITIES = 50_000;

// ---------------------------------------------------------------------------
// Internal state (per-mount instance)
// ---------------------------------------------------------------------------

let _parsed        = null;   // raw parser output
let _transformed   = null;   // toSvgSpace() output
let _visibleLayers = new Set(DEFAULT_ON);
let _worker        = null;
let _workerTimer   = null;
let _dxfFile       = null;
let _layerState    = {};     // { layerName: boolean } for persistence

// ---------------------------------------------------------------------------
// Modal markup
// ---------------------------------------------------------------------------

function buildModal(callbacks) {
    /* ---- Overlay ---- */
    const overlay = el('div', {
        id:    'fp360-dxf-modal',
        style: 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;' +
               'display:flex;align-items:center;justify-content:center;' +
               'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    });

    /* ---- Dialog ---- */
    const dialog = el('div', {
        style: 'background:#fff;border-radius:4px;width:90%;max-width:860px;' +
               'max-height:90vh;display:flex;flex-direction:column;' +
               'box-shadow:0 8px 32px rgba(0,0,0,.35);overflow:hidden;',
    });

    /* ---- Header ---- */
    const header = el('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;' +
               'padding:14px 20px;border-bottom:1px solid #e0e0e0;background:#f9f9f9;',
    });
    const title  = el('h3', { style: 'margin:0;font-size:15px;color:#1d2327;' }, 'Import DXF Floorplan');
    const closeBtn = el('button', {
        style: 'background:none;border:none;cursor:pointer;font-size:20px;color:#666;padding:0;',
    }, '×');
    closeBtn.addEventListener('click', callbacks.onCancel);
    header.append(title, closeBtn);

    /* ---- File row ---- */
    const fileRow = el('div', { style: 'padding:12px 20px;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;gap:12px;' });
    const fileInput = el('input', { type: 'file', accept: '.dxf', style: 'flex:1;' });
    const fileLabel = el('span', { style: 'font-size:13px;color:#666;' }, 'No file selected');
    fileRow.append(fileInput, fileLabel);

    /* ---- Body (preview + sidebar) ---- */
    const body = el('div', {
        style: 'display:flex;flex:1;overflow:hidden;min-height:0;',
    });

    /* Preview pane */
    const previewPane = el('div', {
        style: 'flex:1;background:#f0f0f0;overflow:auto;position:relative;min-width:0;',
    });
    const previewBg = el('div', {
        style: 'position:absolute;inset:0;background:' +
               'repeating-conic-gradient(#ccc 0% 25%,#e8e8e8 0% 50%) 0 0/20px 20px;',
    });
    const previewEl = el('div', { id: 'fp360-dxf-preview', style: 'position:relative;z-index:1;padding:8px;' });
    previewPane.append(previewBg, previewEl);

    /* Sidebar */
    const sidebar = el('div', {
        style: 'width:240px;flex-shrink:0;display:flex;flex-direction:column;' +
               'border-left:1px solid #e0e0e0;overflow-y:auto;',
    });

    const layerSection = el('div', { style: 'padding:12px;border-bottom:1px solid #eee;' });
    const layerTitle   = el('p', { style: 'margin:0 0 8px;font-size:12px;font-weight:600;color:#1d2327;text-transform:uppercase;letter-spacing:.5px;' }, 'Layers');
    const layerList    = el('div', { id: 'fp360-dxf-layers', style: 'display:flex;flex-direction:column;gap:4px;' });
    layerSection.append(layerTitle, layerList);

    const roomSection = el('div', { style: 'padding:12px;' });
    const roomTitle   = el('p', { style: 'margin:0 0 8px;font-size:12px;font-weight:600;color:#1d2327;text-transform:uppercase;letter-spacing:.5px;' }, 'Rooms detected');
    const roomNote    = el('p', { style: 'font-size:11px;color:#888;margin:-4px 0 8px 0;' },
        'Labels are taken from layers: texts, roomitems, nocategory');
    const roomList    = el('ul', { id: 'fp360-dxf-rooms', style: 'margin:0;padding:0;list-style:none;font-size:13px;color:#444;' });
    roomSection.append(roomTitle, roomNote, roomList);

    sidebar.append(layerSection, roomSection);
    body.append(previewPane, sidebar);

    /* ---- Footer ---- */
    const footer = el('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;' +
               'padding:10px 20px;border-top:1px solid #e0e0e0;background:#f9f9f9;',
    });

    const progressWrap = el('div', { style: 'flex:1;display:flex;align-items:center;gap:10px;' });
    const progressBar  = el('div', {
        id: 'fp360-dxf-progress-bar',
        style: 'flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;',
    });
    const progressFill = el('div', {
        style: 'height:100%;width:0;background:#0073aa;transition:width .15s;',
    });
    progressBar.appendChild(progressFill);
    const progressText = el('span', { style: 'font-size:12px;color:#666;white-space:nowrap;' });
    progressWrap.append(progressBar, progressText);

    const btnGroup  = el('div', { style: 'display:flex;gap:8px;' });
    const cancelBtn = el('button', { className: 'button', style: 'margin-left:12px;' }, 'Cancel');
    const applyBtn  = el('button', { className: 'button button-primary', disabled: 'disabled' }, 'Apply');
    cancelBtn.addEventListener('click', callbacks.onCancel);
    applyBtn.addEventListener('click',  () => callbacks.onApply());
    btnGroup.append(cancelBtn, applyBtn);
    footer.append(progressWrap, btnGroup);

    dialog.append(header, fileRow, body, footer);
    overlay.appendChild(dialog);

    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) callbacks.onCancel(); });

    return {
        overlay, fileInput, fileLabel,
        previewEl, layerList, roomList,
        progressFill, progressText, applyBtn,
    };
}

// ---------------------------------------------------------------------------
// Layer toggle UI
// ---------------------------------------------------------------------------

let _reRenderTimer = null;

function buildLayerToggles(layerList, layerNames, counts, onToggle) {
    layerList.innerHTML = '';

    for (const name of LAYER_DISPLAY_ORDER) {
        if (!layerNames.has(name) && name !== 'walls') continue;
        if (name === '0') continue;

        const count   = counts[name] || 0;
        const checked = _visibleLayers.has(name);

        const row   = el('label', { style: 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;' });
        const cb    = el('input', { type: 'checkbox' });
        cb.checked  = checked;
        const label = el('span', {}, `${name}`);
        const badge = el('span', { style: 'margin-left:auto;font-size:11px;color:#999;' }, String(count));
        row.append(cb, label, badge);
        layerList.appendChild(row);

        cb.addEventListener('change', () => {
            if (cb.checked) _visibleLayers.add(name);
            else            _visibleLayers.delete(name);
            _layerState[name] = cb.checked;

            // Debounced re-render
            clearTimeout(_reRenderTimer);
            _reRenderTimer = setTimeout(onToggle, 200);
        });
    }
}

// ---------------------------------------------------------------------------
// Preview re-render (called on layer toggle)
// ---------------------------------------------------------------------------

function rerenderPreview(previewEl) {
    if (!_transformed) return;
    const svg = renderSvg(_transformed, _visibleLayers);
    previewEl.innerHTML = svg;
}

// ---------------------------------------------------------------------------
// Rooms list
// ---------------------------------------------------------------------------

function buildRoomList(roomList, texts) {
    roomList.innerHTML = '';
    const roomTexts = texts.filter(t =>
        t.layer === 'texts' ||
        t.layer === 'roomitems' ||
        t.layer === '0' ||
        t.layer === 'nocategory'
    );
    if (roomTexts.length === 0) {
        const li = el('li', { style: 'color:#999;font-style:italic;' }, 'No room labels found');
        roomList.appendChild(li);
        return;
    }
    for (const t of roomTexts) {
        // Seed editable label from parsed text; mutations are written back to t.label.
        t.label = t.text;
        const li    = el('li', { style: 'padding:2px 0;' });
        const input = el('input', {
            type:  'text',
            style: 'width:100%;font-size:13px;border:1px solid #ddd;padding:2px 4px;border-radius:2px;box-sizing:border-box;',
        });
        input.value = t.label;
        input.addEventListener('input', () => { t.label = input.value; });
        li.appendChild(input);
        roomList.appendChild(li);
    }
}

// ---------------------------------------------------------------------------
// Worker management
// ---------------------------------------------------------------------------

function terminateWorker() {
    if (_worker) { _worker.terminate(); _worker = null; }
    if (_workerTimer) { clearTimeout(_workerTimer); _workerTimer = null; }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Mount the DXF importer modal inside `container`.
 *
 * @param {HTMLElement} container
 * @param {{ onApply: Function, onCancel: Function }} callbacks
 *   onApply(svgMarkup: string, rooms: Array) — called when user clicks Apply.
 *   onCancel() — called when user cancels.
 */
export function mountDxfImporter(container, { onApply, onCancel, savedLayersJson = '' }) {
    // Reset instance state
    _parsed        = null;
    _transformed   = null;
    _visibleLayers = new Set(DEFAULT_ON);
    _dxfFile       = null;
    terminateWorker();

    // Restore previously saved layer visibility, falling back to DEFAULT_ON
    // for any layer not present in the saved state.
    try {
        _layerState = savedLayersJson ? JSON.parse(savedLayersJson) : {};
    } catch (e) {
        _layerState = {};
    }

    const dom = buildModal({
        onCancel() {
            terminateWorker();
            if (dom.overlay.parentNode) dom.overlay.parentNode.removeChild(dom.overlay);
            onCancel();
        },
        onApply() {
            if (!_transformed) return;
            const svgMarkup = renderSvg(_transformed, _visibleLayers);
            const rooms = _transformed.texts
                .filter(t =>
                    t.layer === 'texts' ||
                    t.layer === 'roomitems' ||
                    t.layer === '0' ||
                    t.layer === 'nocategory'
                )
                .map(t => ({
                    label: t.label || t.text,
                    normX: t.x / 1000,
                    normY: t.y / (_transformed.svgHeight || 1000),
                }));
            onApply(svgMarkup, rooms, _dxfFile, JSON.stringify(_layerState));
            if (dom.overlay.parentNode) dom.overlay.parentNode.removeChild(dom.overlay);
        },
    });

    document.body.appendChild(dom.overlay);

    // ---- File input handler ----
    dom.fileInput.addEventListener('change', function () {
        const file = this.files && this.files[0];
        if (!file) return;

        _dxfFile = file;
        dom.fileLabel.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

        // Hard reject above 10 MB
        if (file.size > MAX_FILE_BYTES) {
            dom.fileInput.value = '';
            dom.fileLabel.textContent = 'No file selected';
            setStatus(dom, 'error',
                `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
                `Maximum allowed size is ${MAX_FILE_BYTES / 1024 / 1024} MB. ` +
                `Export only the floor plan layers to reduce file size.`
            );
            return;
        }

        // Soft warning for 5–10 MB
        if (file.size > WARN_FILE_BYTES) {
            if (!confirm(`This is a large file (${(file.size / 1024 / 1024).toFixed(1)} MB). Parsing may take a moment. Continue?`)) {
                dom.fileInput.value = '';
                dom.fileLabel.textContent = 'No file selected';
                return;
            }
        }

        dom.progressText.textContent = 'Reading file…';
        dom.progressFill.style.width = '0%';
        dom.applyBtn.disabled = true;
        dom.previewEl.innerHTML = '';

        terminateWorker();

        const reader = new FileReader();
        reader.onload = function () {
            startWorker(reader.result, dom);
        };
        reader.onerror = function () {
            setStatus(dom, 'error', 'Failed to read the file.');
        };
        // Force Windows-1252 for DXF R2000 compatibility
        reader.readAsText(file, 'windows-1252');
    });
}

// ---------------------------------------------------------------------------
// Worker start & message handling
// ---------------------------------------------------------------------------

function startWorker(text, dom) {
    dom.progressText.textContent = 'Parsing…';

    _worker = new Worker(new URL('./parser.worker.js', import.meta.url));

    _workerTimer = setTimeout(() => {
        terminateWorker();
        setStatus(dom, 'error', 'Failed to parse the DXF file. The file may be too complex or in an unsupported format.');
    }, WORKER_TIMEOUT_MS);

    _worker.postMessage({ type: 'parse', text });

    _worker.onmessage = function (e) {
        const msg = e.data;

        if (msg.type === 'progress') {
            dom.progressFill.style.width = `${msg.percent}%`;
            dom.progressText.textContent = `Parsing… ${msg.percent}%`;
            return;
        }

        if (msg.type === 'error') {
            terminateWorker();
            setStatus(dom, 'error', msg.message || 'Parse error.');
            return;
        }

        if (msg.type === 'result') {
            clearTimeout(_workerTimer);
            _worker = null;
            handleParseResult(msg.parsed, dom);
        }
    };

    _worker.onerror = function (err) {
        terminateWorker();
        setStatus(dom, 'error', 'Failed to parse the DXF file. The file may be too complex or in an unsupported format.');
        console.error('[fp360-dxf] Worker error:', err);
    };
}

// ---------------------------------------------------------------------------
// Post-parse processing
// ---------------------------------------------------------------------------

function handleParseResult(parsed, dom) {
    _parsed = parsed;

    // Validate
    const ents = parsed.entities;
    const totalEntities =
        ents.polylines.length + ents.lines.length + ents.arcs.length +
        ents.circles.length + ents.inserts.length;

    if (totalEntities === 0) {
        setStatus(dom, 'error', "This file doesn't appear to be a valid DXF floorplan. Please check the file and try again.");
        return;
    }

    dom.progressText.textContent = 'Processing…';

    // Resolve INSERTs
    const resolved = resolveInserts(parsed.entities, parsed.blocks);

    // Guard against deeply-nested block references that expand into an
    // unmanageable number of draw calls. Check after INSERT resolution
    // because a small file can still explode via repeated block usage.
    const resolvedCount =
        resolved.polylines.length + resolved.lines.length +
        resolved.arcs.length     + resolved.circles.length;

    if (resolvedCount > MAX_ENTITIES) {
        setStatus(dom, 'error',
            `This DXF is too complex (${resolvedCount.toLocaleString()} entities after resolving blocks; ` +
            `maximum is ${MAX_ENTITIES.toLocaleString()}). ` +
            `Export only the floor plan layers, or reduce block references, and try again.`
        );
        return;
    }

    // Check for wall geometry
    const hasWalls = resolved.polylines.some(p => p.layer === 'walls') ||
                     resolved.lines.some(l => l.layer === 'walls');
    if (!hasWalls) {
        console.warn('[fp360-dxf] No wall geometry found on "walls" layer.');
    }

    // Compute bbox and transform to SVG space
    const bbox = calculateBBox(resolved);
    _transformed = toSvgSpace(resolved, bbox);

    // Build layer names set from parsed data
    const layerNames = new Set(Object.keys(parsed.layers));
    // Also gather from entities in case layers table was incomplete
    for (const g of _transformed.geometry)  layerNames.add(g.layer);
    for (const t of _transformed.texts)     layerNames.add(t.layer);
    layerNames.delete('0');

    // Seed visible layers: use saved preference when available,
    // fall back to DEFAULT_ON for any layer not in the saved state.
    _visibleLayers = new Set();
    for (const name of layerNames) {
        const isVisible = name in _layerState ? _layerState[name] : DEFAULT_ON.has(name);
        if (isVisible) _visibleLayers.add(name);
    }

    // Sync _layerState to reflect the final resolved visibility
    for (const name of layerNames) {
        _layerState[name] = _visibleLayers.has(name);
    }

    // Build UI
    const counts = layerCounts(_transformed);
    buildLayerToggles(dom.layerList, layerNames, counts, () => rerenderPreview(dom.previewEl));
    buildRoomList(dom.roomList, _transformed.texts);
    rerenderPreview(dom.previewEl);

    setStatus(dom, 'ok', 'Parsed OK');
    dom.applyBtn.disabled = false;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function setStatus(dom, type, msg) {
    dom.progressText.textContent = msg;
    dom.progressText.style.color = type === 'error' ? '#cc1818' : '#468847';
    if (type === 'error') {
        dom.progressFill.style.width = '0%';
        dom.progressFill.style.background = '#cc1818';
    } else {
        dom.progressFill.style.width = '100%';
        dom.progressFill.style.background = '#0073aa';
    }
}
