/**
 * helpers.js
 * Pure utility functions shared across all modules.
 */

import { COLORS, state } from './state.js';

// DOM references — set by initDomRefs() inside DOMContentLoaded
export let dataField, imageUrlInput, emptyState, svg, imgEl;

export function initDomRefs() {
    dataField     = document.getElementById('fp360_hotspots_data');
    imageUrlInput = document.getElementById('fp360_image_url');
    svg           = document.getElementById('fp360-svg-overlay');
    imgEl         = document.getElementById('fp360-floorplan-img');
    emptyState    = document.getElementById('fp360-empty-state');
}

// render.js registers its renderSVG here to avoid circular imports.
let _renderSVG = () => {};
export function registerRenderFn(fn) { _renderSVG = fn; }

export function saveHotspots() {
    if (dataField) dataField.value = JSON.stringify(state.hotspots);
}

export function generateId() {
    if (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) {
        return self.crypto.randomUUID();
    }
    return 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function nextColor() {
    return COLORS[ state.colorIndex++ % COLORS.length ];
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

/**
 * Minimal DOM element factory.
 * el('div', { className: 'foo', style: 'color:red', 'data-id': '1' }, 'text')
 * Handles: className, style (cssText), all other attrs via setAttribute.
 * For CSS custom properties use el(...) then el.style.setProperty().
 */
export function el(tag, attrs = {}, text = '') {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') e.className = v;
        else if (k === 'style') e.style.cssText = v;
        else e.setAttribute(k, v);
    }
    if (text) e.textContent = text;
    return e;
}
