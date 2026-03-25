/**
 * tools/merge.js
 * Polygon merge algorithm for combining two rectangles into an L-shape.
 */

/**
 * Merges two axis-aligned rectangular hotspots into one polygon.
 * Returns null if they don't overlap or touch.
 */
export function mergePolygons(a, b) {
    function bbox(hs) {
        const xs = hs.points.map(p => p.x);
        const ys = hs.points.map(p => p.y);
        return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
    }

    const A = bbox(a);
    const B = bbox(b);

    const overlapX = A.x1 <= B.x2 + 0.005 && B.x1 <= A.x2 + 0.005;
    const overlapY = A.y1 <= B.y2 + 0.005 && B.y1 <= A.y2 + 0.005;
    if (!overlapX || !overlapY) return null;

    const xs = [...new Set([A.x1, A.x2, B.x1, B.x2])].sort((a, b) => a - b);
    const ys = [...new Set([A.y1, A.y2, B.y1, B.y2])].sort((a, b) => a - b);

    function inUnion(cx, cy) {
        const EPS = 0.001;
        const inA = cx >= A.x1 - EPS && cx <= A.x2 + EPS && cy >= A.y1 - EPS && cy <= A.y2 + EPS;
        const inB = cx >= B.x1 - EPS && cx <= B.x2 + EPS && cy >= B.y1 - EPS && cy <= B.y2 + EPS;
        return inA || inB;
    }

    const edges = [];
    for (let i = 0; i < xs.length - 1; i++) {
        for (let j = 0; j < ys.length - 1; j++) {
            const cx = (xs[i] + xs[i+1]) / 2;
            const cy = (ys[j] + ys[j+1]) / 2;
            if (!inUnion(cx, cy)) continue;

            if (j === 0 || !inUnion(cx, (ys[j-1] + ys[j]) / 2))
                edges.push({ x1: xs[i],   y1: ys[j],   x2: xs[i+1], y2: ys[j]   });
            if (j === ys.length-2 || !inUnion(cx, (ys[j+1] + ys[j+2]) / 2))
                edges.push({ x1: xs[i+1], y1: ys[j+1], x2: xs[i],   y2: ys[j+1] });
            if (i === 0 || !inUnion((xs[i-1] + xs[i]) / 2, cy))
                edges.push({ x1: xs[i],   y1: ys[j+1], x2: xs[i],   y2: ys[j]   });
            if (i === xs.length-2 || !inUnion((xs[i+1] + xs[i+2]) / 2, cy))
                edges.push({ x1: xs[i+1], y1: ys[j],   x2: xs[i+1], y2: ys[j+1] });
        }
    }
    if (edges.length === 0) return null;

    const poly = [{ x: edges[0].x1, y: edges[0].y1 }, { x: edges[0].x2, y: edges[0].y2 }];
    const used = new Set([0]);

    for (let step = 0; step < edges.length - 1; step++) {
        const last = poly[poly.length - 1];
        let found  = false;
        for (let k = 0; k < edges.length; k++) {
            if (used.has(k)) continue;
            const e = edges[k];
            if (Math.abs(e.x1 - last.x) < 0.0001 && Math.abs(e.y1 - last.y) < 0.0001) {
                poly.push({ x: e.x2, y: e.y2 });
                used.add(k);
                found = true;
                break;
            }
        }
        if (!found) break;
    }

    if (poly.length > 1) {
        const first = poly[0], last = poly[poly.length - 1];
        if (Math.abs(first.x - last.x) < 0.0001 && Math.abs(first.y - last.y) < 0.0001) {
            poly.pop();
        }
    }

    const simplified = poly.filter((pt, i) => {
        const prev = poly[(i + poly.length - 1) % poly.length];
        const next = poly[(i + 1) % poly.length];
        const dx1 = pt.x - prev.x, dy1 = pt.y - prev.y;
        const dx2 = next.x - pt.x, dy2 = next.y - pt.y;
        return Math.abs(dx1 * dy2 - dy1 * dx2) > 0.000001;
    });

    return simplified.length >= 3 ? simplified : null;
}