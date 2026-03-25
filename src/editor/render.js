/**
 * render.js
 * SVG canvas rendering and room list rendering.
 */

import { COLORS, state } from './state.js';
import {
    registerRenderFn, saveHotspots, requestRedraw,
    getCentroid, svg, imgEl
} from './helpers.js';

export function renderSVG() {
    state.needsRedraw = false;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    state.hotspots.forEach(hs => {
        if (!hs.points || hs.points.length < 3) return;

        const color      = hs.color || COLORS[0];
        const isSelected = state.selectedIds.has(hs.id);
        const pts        = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
        const poly       = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

        poly.setAttribute('points',       pts);
        poly.setAttribute('fill',         isSelected ? color + 'cc' : color + '40');
        poly.setAttribute('stroke',       color);
        poly.setAttribute('stroke-width', isSelected ? '0.6' : '0.3');
        poly.setAttribute('class',        isSelected ? 'hs-poly active' : 'hs-poly');
        poly.style.setProperty('vector-effect', 'non-scaling-stroke');

        poly.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.shiftKey) {
                if (state.selectedIds.has(hs.id)) state.selectedIds.delete(hs.id);
                else state.selectedIds.add(hs.id);
            } else {
                state.selectedIds.clear();
                state.selectedIds.add(hs.id);
            }
            requestRedraw();
            renderHotspotList();
            document.querySelector('.hs-item.is-active')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        svg.appendChild(poly);

        // Drag handles — single selection only
        if (isSelected && state.selectedIds.size === 1) {
            hs.points.forEach((p, idx) => {
                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                handle.setAttribute('cx',     p.x * 100);
                handle.setAttribute('cy',     p.y * 100);
                handle.setAttribute('r',      '1.6');
                handle.setAttribute('class',  'hs-handle');
                handle.setAttribute('fill',   '#fff');
                handle.setAttribute('stroke', color);
                handle.setAttribute('stroke-width', '0.5');
                handle.style.setProperty('vector-effect', 'non-scaling-stroke');
                handle.style.cursor = 'move';

                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    state.dragging      = true;
                    state.dragHotspotId = hs.id;
                    state.dragPointIdx  = idx;
                });

                svg.appendChild(handle);
            });
        }

        if (hs.label) {
            const center = getCentroid(hs.points);
            const text   = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x',                 center.x * 100);
            text.setAttribute('y',                 center.y * 100);
            text.setAttribute('text-anchor',       'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size',         '3');
            text.setAttribute('font-weight',       'bold');
            text.setAttribute('fill',              '#ffffff');
            text.setAttribute('stroke',            '#000000');
            text.setAttribute('stroke-width',      '0.5');
            text.setAttribute('paint-order',       'stroke');
            text.setAttribute('pointer-events',    'none');
            text.textContent = hs.label;
            svg.appendChild(text);
        }
    });

    // Polygon drawing in progress
    if (state.currentPoints.length > 0) {
        const pointsWithMouse = [...state.currentPoints];
        if (state.drawing) pointsWithMouse.push(state.mousePos);

        const pts  = pointsWithMouse.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', pts);
        line.setAttribute('class',  'drawing-line');
        svg.appendChild(line);

        state.currentPoints.forEach((p, i) => {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx',    p.x * 100);
            c.setAttribute('cy',    p.y * 100);
            c.setAttribute('r',     i === 0 ? 1.5 : 0.8);
            c.setAttribute('class', i === 0 ? 'node node-first' : 'node');
            svg.appendChild(c);
        });
    }

    // Rectangle drag preview
    if (state.rectMode && state.rectStart && state.rectCurrent) {
        const x1 = state.rectStart.x   * 100;
        const y1 = state.rectStart.y   * 100;
        const x2 = state.rectCurrent.x * 100;
        const y2 = state.rectCurrent.y * 100;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x',              Math.min(x1, x2));
        rect.setAttribute('y',              Math.min(y1, y2));
        rect.setAttribute('width',          Math.abs(x2 - x1));
        rect.setAttribute('height',         Math.abs(y2 - y1));
        rect.setAttribute('fill',           'rgba(34,113,177,0.15)');
        rect.setAttribute('stroke',         '#2271b1');
        rect.setAttribute('stroke-width',   '0.5');
        rect.setAttribute('stroke-dasharray', '1.5 1');
        rect.setAttribute('pointer-events', 'none');
        rect.style.setProperty('vector-effect', 'non-scaling-stroke');
        svg.appendChild(rect);
    }

    // Seed markers
    if (state.seedMode || state.seeds.length > 0) {
        state.seeds.forEach((s, i) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx',           s.x * 100);
            circle.setAttribute('cy',           s.y * 100);
            circle.setAttribute('r',            '2.2');
            circle.setAttribute('fill',         '#fff');
            circle.setAttribute('stroke',       '#333');
            circle.setAttribute('stroke-width', '0.5');
            circle.style.setProperty('vector-effect', 'non-scaling-stroke');

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x',                 s.x * 100);
            label.setAttribute('y',                 s.y * 100);
            label.setAttribute('text-anchor',       'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.setAttribute('font-size',         '2.5');
            label.setAttribute('font-weight',       'bold');
            label.setAttribute('fill',              '#333');
            label.setAttribute('pointer-events',    'none');
            label.textContent = String(i + 1);

            g.appendChild(circle);
            g.appendChild(label);
            svg.appendChild(g);
        });
    }
}

export function renderHotspotList() {
    const $ = window.jQuery;
    /* global fp360Admin */
    const $ul = $('#fp360-hotspot-items').empty();

    $('#fp360-merge-rooms').toggle(state.selectedIds.size === 2);

    state.hotspots.forEach(hs => {
        const isSelected = state.selectedIds.has(hs.id);
        const color      = hs.color || COLORS[0];
        const $li        = $('<li>').addClass('hs-item').toggleClass('is-active', isSelected);

        $li[0].style.setProperty('--hs-color', color);

        const $swatch   = $('<span>').addClass('hs-color-swatch').css('background-color', color);
        const $label    = $('<input>', {
            type: 'text', class: 'hs-label', 'data-id': hs.id,
            placeholder: fp360Admin.i18n.roomLabel || 'Room Label',
        }).val(hs.label);
        const $row      = $('<div>').addClass('hs-input-row');
        const $urlInput = $('<input>', {
            type: 'text', class: 'hs-img360', 'data-id': hs.id,
            placeholder: '360 Image URL',
        }).val(hs.image360);
        const $pickBtn  = $('<button>', {
            type: 'button', class: 'button hs-pick-360', 'data-id': hs.id,
            text: fp360Admin.i18n.pick360,
        });
        const $deleteBtn = $('<button>', {
            type: 'button', class: 'button button-link-delete hs-delete', 'data-id': hs.id,
            text: fp360Admin.i18n.deleteRoom,
        });

        const $header = $('<div>').addClass('hs-header').append($swatch, $label);
        $row.append($urlInput, $pickBtn);
        $li.append($header, $row, $deleteBtn);
        $ul.append($li);
    });
}

// Register renderSVG with helpers so requestRedraw can call it
// without creating a circular import.
registerRenderFn(renderSVG);