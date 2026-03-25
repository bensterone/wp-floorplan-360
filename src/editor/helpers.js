/**
 * helpers.js
 * Pure utility functions shared across all modules.
 */

import { COLORS, state } from './state.js';

// DOM references — set by initDomRefs() inside document.ready
export let $dataField, $imageUrlInput, svg, imgEl, $emptyState;

export function initDomRefs() {
    const $ = window.jQuery;
    $dataField     = $('#fp360_hotspots_data');
    $imageUrlInput = $('#fp360_image_url');
    svg            = document.getElementById('fp360-svg-overlay');
    imgEl          = document.getElementById('fp360-floorplan-img');
    $emptyState    = $('#fp360-empty-state');
}

// render.js registers its renderSVG here to avoid circular imports.
let _renderSVG = () => {};
export function registerRenderFn(fn) { _renderSVG = fn; }

export function saveHotspots() {
    $dataField.val(JSON.stringify(state.hotspots));
}

export function generateId() {
    if (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) {
        return self.crypto.randomUUID();
    }
    return 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function nextColor() {
    return COLORS[ state.hotspots.length % COLORS.length ];
}

export function requestRedraw() {
    if (!state.needsRedraw) {
        state.needsRedraw = true;
        requestAnimationFrame(_renderSVG);
    }
}

export function getNormalizedPos(e) {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
    };
}

export function getCentroid(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
}