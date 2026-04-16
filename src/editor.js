/**
 * src/editor.js
 * Entry point for the floorplan editor.
 * Webpack bundles this to assets/js/editor.js.
 *
 * Module map:
 *   state.js              — shared state & constants (imports nothing)
 *   helpers.js            — DOM refs, utilities, requestRedraw
 *   render.js             — renderSVG, renderHotspotList
 *   tools/polygon.js      — click-by-click polygon drawing
 *   tools/rectangle.js    — drag rectangle with wall snapping
 *   tools/merge.js        — merge two rectangles into L-shape
 *   detection/image.js    — shared pixel ops (morph, Otsu, Moore, RDP)
 *   detection/auto.js     — fully automatic room detection
 *   detection/seed.js     — click-to-seed watershed fill
 *   ui.js                 — all button handlers & SVG events
 */

import { state } from './editor/state.js';
import { initDomRefs } from './editor/helpers.js';
import { renderSVG, renderHotspotList } from './editor/render.js';
import { initUI } from './editor/ui.js';
import { setFloorplanBackground } from './editor/helpers/floorplan-background.js';

document.addEventListener('DOMContentLoaded', function () {

    // 1. Wire up DOM references
    initDomRefs();

    // 2. Load initial hotspot data from hidden field
    const dataField = document.getElementById('fp360_hotspots_data');
    try {
        const raw = dataField ? dataField.value : '';
        state.hotspots = raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('FP360: Error parsing hotspot data', e);
        state.hotspots = [];
    }

    // 3. Bind all UI events and button handlers
    initUI();

    // 4. Restore SVG background if a vector floorplan was previously saved.
    //    The server already injected #fp360-svg-background into the DOM if
    //    _fp360_svg_markup exists, so we only need to ensure the overlay
    //    SVG and empty-state visibility are correct.
    const svgBgEl = document.getElementById('fp360-svg-background');
    if (svgBgEl) {
        const overlayEl    = document.getElementById('fp360-svg-overlay');
        const emptyStateEl = document.getElementById('fp360-empty-state');
        if (overlayEl)    overlayEl.style.display    = 'block';
        if (emptyStateEl) emptyStateEl.style.display = 'none';
    }

    // 5. Initial render
    renderHotspotList();
    renderSVG();
});
