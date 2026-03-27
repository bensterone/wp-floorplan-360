/**
 * tools/polygon.js
 * Click-by-click polygon drawing tool.
 */

import { state } from '../state.js';
import { saveHotspots, generateId, nextColor, requestRedraw } from '../helpers.js';
import { renderHotspotList } from '../render.js';

export function closeShape() {
    if (state.currentPoints.length < 3) return;
    /* global fp360Admin */
    state.hotspots.push({
        id:       generateId(),
        points:   [...state.currentPoints],
        label:    fp360Admin.i18n.newRoom || 'New Room',
        image360: '',
        color:    nextColor(),
    });

    state.currentPoints = [];
    state.drawing = false;

    const svg = document.getElementById('fp360-svg-overlay');
    if (svg) svg.classList.remove('fp360-snap-active');

    saveHotspots();
    renderHotspotList();
    requestRedraw();
}