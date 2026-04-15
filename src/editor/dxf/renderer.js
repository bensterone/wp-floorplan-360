/**
 * renderer.js
 * Converts SVG-space geometry (output of transformer.toSvgSpace) into a
 * sanitised SVG string ready for storage as post meta.
 */

import DOMPurify from 'dompurify';
import { SVG_WIDTH }             from './transformer.js';
import { bulgeToSvgArc, arcToSvgPath, escapeXml, r2 } from './utils.js';

// ---------------------------------------------------------------------------
// Layer style map
// ---------------------------------------------------------------------------

const LAYER_STYLES = {
    walls:      { stroke: '#1a1a1a', strokeWidth: 2.5 },
    doors:      { stroke: '#444444', strokeWidth: 1.0 },
    windows:    { stroke: '#555555', strokeWidth: 0.8 },
    wallitems:  { stroke: '#777777', strokeWidth: 0.5 },
    roomitems:  { stroke: '#888888', strokeWidth: 0.5 },
    plumbing:   { stroke: '#999999', strokeWidth: 0.5 },
    furnitures: { stroke: '#aaaaaa', strokeWidth: 0.4 },
    nocategory: { stroke: '#aaaaaa', strokeWidth: 0.4 },
    texts:      { stroke: 'none',    strokeWidth: 0   },
};

function styleFor(layer) {
    return LAYER_STYLES[layer] || { stroke: '#888888', strokeWidth: 0.5 };
}

// Painter's algorithm: layers further down the list are rendered on top.
const LAYER_ORDER = [
    'wallitems', 'nocategory', 'furnitures', 'roomitems',
    'plumbing', 'walls', 'windows', 'doors',
];

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

/**
 * Build the `d` attribute string for a single polyline / closed polygon.
 */
function polylineToPathD(vertices, closed) {
    if (vertices.length < 2) return '';

    let d = `M ${r2(vertices[0].x)} ${r2(vertices[0].y)}`;

    for (let i = 0; i < vertices.length - 1; i++) {
        const v    = vertices[i];
        const next = vertices[i + 1];

        if (v.bulge && Math.abs(v.bulge) >= 0.01) {
            const arc = bulgeToSvgArc(v, next, v.bulge);
            d += ` A ${r2(arc.radius)} ${r2(arc.radius)} 0 ${arc.largeArc} ${arc.sweep} ${r2(next.x)} ${r2(next.y)}`;
        } else {
            d += ` L ${r2(next.x)} ${r2(next.y)}`;
        }
    }

    if (closed && vertices.length > 1) {
        // Handle bulge on the last vertex back to first
        const last  = vertices[vertices.length - 1];
        const first = vertices[0];
        if (last.bulge && Math.abs(last.bulge) >= 0.01) {
            const arc = bulgeToSvgArc(last, first, last.bulge);
            d += ` A ${r2(arc.radius)} ${r2(arc.radius)} 0 ${arc.largeArc} ${arc.sweep} ${r2(first.x)} ${r2(first.y)}`;
        }
        d += ' Z';
    }

    return d;
}

/**
 * Convert one geometry item to an SVG element string.
 */
function geometryToSvg(item) {
    switch (item.type) {
        case 'polyline': {
            const d = polylineToPathD(item.vertices, item.closed);
            return d ? `<path d="${d}"/>` : '';
        }
        case 'line':
            return `<line x1="${r2(item.x1)}" y1="${r2(item.y1)}" x2="${r2(item.x2)}" y2="${r2(item.y2)}"/>`;
        case 'arc': {
            const d = arcToSvgPath(item.cx, item.cy, item.radius, item.startAngle, item.endAngle);
            return `<path d="${d}"/>`;
        }
        case 'circle':
            return `<circle cx="${r2(item.cx)}" cy="${r2(item.cy)}" r="${r2(item.r)}"/>`;
        default:
            return '';
    }
}

/**
 * Render a single text entity as an SVG <text> element.
 */
function textToSvg(t) {
    const transform = t.rotation
        ? ` transform="rotate(${r2(t.rotation)},${r2(t.x)},${r2(t.y)})"`
        : '';
    return `<text x="${r2(t.x)}" y="${r2(t.y)}" ` +
           `font-family="Arial,Helvetica,sans-serif" ` +
           `font-size="${r2(t.height)}" fill="#333333"${transform}>` +
           `${escapeXml(t.text)}</text>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render the full SVG string for the given transformed data.
 *
 * @param {{ geometry: Array, texts: Array, svgHeight: number }} transformedData
 *   Output of transformer.toSvgSpace()
 * @param {Set<string>} visibleLayers
 *   Set of layer names that should be rendered
 * @returns {string}  DOMPurify-sanitised SVG markup
 */
export function renderSvg(transformedData, visibleLayers) {
    const { geometry, texts, svgHeight } = transformedData;

    const groups = [];

    // Geometry layers in painter order
    for (const layerName of LAYER_ORDER) {
        if (!visibleLayers.has(layerName)) continue;

        const style = styleFor(layerName);
        const items = geometry
            .filter(g => g.layer === layerName)
            .map(geometryToSvg)
            .filter(Boolean);

        if (items.length === 0) continue;

        groups.push(
            `  <g id="layer-${layerName}" ` +
            `stroke="${style.stroke}" stroke-width="${style.strokeWidth}" fill="none">` +
            `\n    ${items.join('\n    ')}\n  </g>`
        );
    }

    // Text layer — always on top
    if (visibleLayers.has('texts')) {
        const textItems = texts
            .filter(t => t.layer === 'texts' || t.layer === '0')
            .map(textToSvg);

        if (textItems.length > 0) {
            groups.push(
                `  <g id="layer-texts">\n    ${textItems.join('\n    ')}\n  </g>`
            );
        }
    }

    const svgStr =
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `viewBox="0 0 ${SVG_WIDTH} ${r2(svgHeight)}" ` +
        `width="100%" class="fp360-dxf-svg">\n` +
        groups.join('\n') +
        `\n</svg>`;

    return DOMPurify.sanitize(svgStr, {
        USE_PROFILES: { svg: true, svgFilters: false },
        ADD_TAGS: ['use'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
    });
}

/**
 * Return per-layer entity counts from resolved geometry.
 * @param {{ geometry: Array, texts: Array }} transformedData
 * @returns {Object<string, number>}
 */
export function layerCounts(transformedData) {
    const counts = {};
    for (const item of transformedData.geometry) {
        counts[item.layer] = (counts[item.layer] || 0) + 1;
    }
    for (const t of transformedData.texts) {
        counts[t.layer] = (counts[t.layer] || 0) + 1;
    }
    return counts;
}
