/**
 * transformer.js
 * Resolves INSERT entities, computes the bounding box, and converts all DXF
 * geometry from DXF world-space (Y-up, metres) to SVG viewport-space (Y-down).
 *
 * SVG internal coordinate space: width = SVG_WIDTH px, height proportional.
 */

export const SVG_WIDTH = 1000;

// ---------------------------------------------------------------------------
// INSERT resolution
// ---------------------------------------------------------------------------

/**
 * Transform a single point from block-local space to drawing space.
 * @param {number} px  Block-local X
 * @param {number} py  Block-local Y
 * @param {{scaleX,scaleY,rotation,x,y}} ins  INSERT parameters
 * @returns {{x:number, y:number}}
 */
function transformPoint(px, py, ins) {
    const rad = (ins.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const sx  = px * ins.scaleX;
    const sy  = py * ins.scaleY;
    return {
        x: sx * cos - sy * sin + ins.x,
        y: sx * sin + sy * cos + ins.y,
    };
}

/**
 * Adjust bulge sign for mirrored inserts (negative scale product).
 * When scaleX * scaleY < 0 the geometry is mirrored, reversing arc direction.
 */
function adjustBulge(bulge, ins) {
    return (ins.scaleX * ins.scaleY < 0) ? -bulge : bulge;
}

/**
 * Expand all INSERT entities in `rawEntities` by looking up their block
 * definitions and transforming every block-entity into drawing space.
 *
 * Returns a flat entity bucket with the same shape as the parser output but
 * with no inserts — just resolved geometry (polylines, lines, arcs, circles,
 * texts).
 *
 * @param {object} rawEntities  Parser-produced entity bucket
 * @param {object} blocks       Parser-produced blocks map
 * @returns {object}  Resolved entity bucket (no inserts key)
 */
export function resolveInserts(rawEntities, blocks) {
    const out = {
        polylines: [...rawEntities.polylines],
        lines:     [...rawEntities.lines],
        arcs:      [...rawEntities.arcs],
        circles:   [...rawEntities.circles],
        texts:     [...rawEntities.texts],
    };

    for (const ins of rawEntities.inserts) {
        const block = blocks[ins.blockName];
        if (!block) {
            console.warn('[fp360-dxf] INSERT references unknown block:', ins.blockName);
            continue;
        }

        // Effective layer — layer 0 inherits the INSERT's layer (DXF spec)
        function resolveLayer(entityLayer) {
            return (!entityLayer || entityLayer === '0') ? ins.layer : entityLayer;
        }

        // Polylines
        for (const poly of block.entities.polylines) {
            const verts = poly.vertices.map(v => {
                const p = transformPoint(v.x, v.y, ins);
                return { ...p, bulge: v.bulge ? adjustBulge(v.bulge, ins) : 0 };
            });
            out.polylines.push({
                layer:    resolveLayer(poly.layer),
                vertices: verts,
                closed:   poly.closed,
            });
        }

        // Lines
        for (const ln of block.entities.lines) {
            const p1 = transformPoint(ln.x1, ln.y1, ins);
            const p2 = transformPoint(ln.x2, ln.y2, ins);
            out.lines.push({
                layer: resolveLayer(ln.layer),
                x1: p1.x, y1: p1.y,
                x2: p2.x, y2: p2.y,
            });
        }

        // Arcs
        for (const arc of block.entities.arcs) {
            const center = transformPoint(arc.cx, arc.cy, ins);
            const radius = arc.radius * Math.abs(ins.scaleX);
            let startAngle = arc.startAngle + ins.rotation;
            let endAngle   = arc.endAngle   + ins.rotation;
            // Mirrored insert: swap and negate angles
            if (ins.scaleX * ins.scaleY < 0) {
                [startAngle, endAngle] = [-endAngle, -startAngle];
            }
            out.arcs.push({
                layer: resolveLayer(arc.layer),
                cx: center.x, cy: center.y,
                radius, startAngle, endAngle,
            });
        }

        // Circles
        for (const circ of block.entities.circles) {
            const center = transformPoint(circ.cx, circ.cy, ins);
            out.circles.push({
                layer:  resolveLayer(circ.layer),
                cx:     center.x,
                cy:     center.y,
                radius: circ.radius * Math.abs(ins.scaleX),
            });
        }

        // Texts
        for (const txt of block.entities.texts) {
            const pos = transformPoint(txt.x, txt.y, ins);
            out.texts.push({
                layer:    resolveLayer(txt.layer),
                x:        pos.x,
                y:        pos.y,
                height:   txt.height * Math.abs(ins.scaleY),
                rotation: txt.rotation + ins.rotation,
                text:     txt.text,
            });
        }

        // Nested INSERTs inside a block are not handled (uncommon and expensive).
        // Log a warning if they exist.
        if (block.entities.inserts && block.entities.inserts.length > 0) {
            console.warn('[fp360-dxf] Nested INSERT in block', ins.blockName, '— skipped');
        }
    }

    return out;
}

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

/**
 * Compute the bounding box of all resolved geometry (all layers, not just
 * visible ones — so bbox is stable when toggling layers).
 * Adds 8 % padding on each side.
 *
 * @param {object} resolved  Output of resolveInserts()
 * @returns {{minX,minY,maxX,maxY}}
 */
export function calculateBBox(resolved) {
    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    function expand(x, y) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    for (const p of resolved.polylines) {
        for (const v of p.vertices) expand(v.x, v.y);
    }
    for (const l of resolved.lines) {
        expand(l.x1, l.y1);
        expand(l.x2, l.y2);
    }
    for (const a of resolved.arcs) {
        expand(a.cx - a.radius, a.cy - a.radius);
        expand(a.cx + a.radius, a.cy + a.radius);
    }
    for (const c of resolved.circles) {
        expand(c.cx - c.radius, c.cy - c.radius);
        expand(c.cx + c.radius, c.cy + c.radius);
    }
    for (const t of resolved.texts) {
        expand(t.x, t.y);
    }

    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    const padX = (maxX - minX) * 0.08;
    const padY = (maxY - minY) * 0.08;
    return {
        minX: minX - padX,
        minY: minY - padY,
        maxX: maxX + padX,
        maxY: maxY + padY,
    };
}

// ---------------------------------------------------------------------------
// DXF → SVG coordinate transform
// ---------------------------------------------------------------------------

/**
 * Convert a DXF-space point to SVG viewport coords.
 * DXF: Y up.  SVG: Y down.  SVG_WIDTH = 1000 internal units.
 *
 * @param {number} x  DXF X
 * @param {number} y  DXF Y
 * @param {object} bbox  From calculateBBox()
 * @param {number} scale  (bbox.maxX - bbox.minX) / SVG_WIDTH, pre-computed
 * @param {number} svgH   SVG height in internal units, pre-computed
 * @returns {{x:number, y:number}}
 */
function dxfToSvg(x, y, bbox, scale, svgH) {
    return {
        x:  (x - bbox.minX) / scale,
        y: svgH - (y - bbox.minY) / scale,
    };
}

// ---------------------------------------------------------------------------
// Full transform: resolved entities → SVG-space entities
// ---------------------------------------------------------------------------

/**
 * Transform all resolved geometry into SVG viewport coordinates.
 *
 * @param {object} resolved  Output of resolveInserts()
 * @param {object} bbox      Output of calculateBBox()
 * @returns {{ geometry: Array, texts: Array, svgHeight: number }}
 */
export function toSvgSpace(resolved, bbox) {
    const scale = (bbox.maxX - bbox.minX) / SVG_WIDTH;
    const svgH  = (bbox.maxY - bbox.minY) / scale;

    const geometry = [];
    const texts    = [];

    // Polylines
    for (const p of resolved.polylines) {
        const verts = p.vertices.map(v => {
            const s = dxfToSvg(v.x, v.y, bbox, scale, svgH);
            return { x: s.x, y: s.y, bulge: v.bulge || 0 };
        });
        geometry.push({ type: 'polyline', layer: p.layer, vertices: verts, closed: p.closed });
    }

    // Lines
    for (const l of resolved.lines) {
        const p1 = dxfToSvg(l.x1, l.y1, bbox, scale, svgH);
        const p2 = dxfToSvg(l.x2, l.y2, bbox, scale, svgH);
        geometry.push({ type: 'line', layer: l.layer, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }

    // Arcs — store center/radius in SVG space + original DXF angles (handled in renderer)
    for (const a of resolved.arcs) {
        const c = dxfToSvg(a.cx, a.cy, bbox, scale, svgH);
        geometry.push({
            type: 'arc',
            layer: a.layer,
            cx: c.x, cy: c.y,
            radius: a.radius / scale,
            startAngle: a.startAngle,
            endAngle:   a.endAngle,
        });
    }

    // Circles
    for (const c of resolved.circles) {
        const center = dxfToSvg(c.cx, c.cy, bbox, scale, svgH);
        geometry.push({
            type: 'circle',
            layer: c.layer,
            cx: center.x, cy: center.y,
            r: c.radius / scale,
        });
    }

    // Texts
    for (const t of resolved.texts) {
        const pos    = dxfToSvg(t.x, t.y, bbox, scale, svgH);
        const height = Math.max(t.height / scale, 11);
        texts.push({
            layer:    t.layer,
            x:        pos.x,
            y:        pos.y,
            height,
            rotation: -t.rotation, // negate for Y-flip
            text:     t.text,
        });
    }

    return { geometry, texts, svgHeight: svgH };
}
