/**
 * detection/image.js
 * Shared pixel-level image processing primitives.
 * Used by both auto-detect and seed-fill pipelines.
 */

/** Erode light pixels — dark regions grow by radius px (separable box kernel). */
export function morphErode(binary, W, H, radius) {
    const tmp = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (binary[y * W + x] === 0) { tmp[y * W + x] = 0; continue; }
            let ok = true;
            for (let kx = -radius; kx <= radius && ok; kx++) {
                const nx = x + kx;
                if (nx >= 0 && nx < W && binary[y * W + nx] === 0) ok = false;
            }
            tmp[y * W + x] = ok ? 255 : 0;
        }
    }
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (tmp[y * W + x] === 0) { out[y * W + x] = 0; continue; }
            let ok = true;
            for (let ky = -radius; ky <= radius && ok; ky++) {
                const ny = y + ky;
                if (ny >= 0 && ny < H && tmp[ny * W + x] === 0) ok = false;
            }
            out[y * W + x] = ok ? 255 : 0;
        }
    }
    return out;
}

/** Dilate light pixels — dark regions shrink by radius px (separable box kernel). */
export function morphDilate(binary, W, H, radius) {
    const tmp = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (binary[y * W + x] === 255) { tmp[y * W + x] = 255; continue; }
            let found = false;
            for (let kx = -radius; kx <= radius && !found; kx++) {
                const nx = x + kx;
                if (nx >= 0 && nx < W && binary[y * W + nx] === 255) found = true;
            }
            tmp[y * W + x] = found ? 255 : 0;
        }
    }
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (tmp[y * W + x] === 255) { out[y * W + x] = 255; continue; }
            let found = false;
            for (let ky = -radius; ky <= radius && !found; ky++) {
                const ny = y + ky;
                if (ny >= 0 && ny < H && tmp[ny * W + x] === 255) found = true;
            }
            out[y * W + x] = found ? 255 : 0;
        }
    }
    return out;
}

/**
 * Otsu threshold — maximises inter-class variance.
 * Adapts automatically to each image's brightness distribution.
 */
export function otsuThreshold(pixels, n) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < n; i++) hist[pixels[i]]++;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = n - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVar) { maxVar = variance; threshold = t; }
    }
    return threshold;
}

/**
 * Moore neighbourhood contour tracing.
 * Produces an ordered boundary pixel sequence for any connected region.
 */
export function mooreTrace(labels, W, H, label, startIdx) {
    const dx = [-1, -1,  0,  1,  1,  1,  0, -1];
    const dy = [ 0, -1, -1, -1,  0,  1,  1,  1];

    const startX   = startIdx % W;
    const startY   = Math.floor(startIdx / W);
    const result   = [];
    const maxSteps = W * H;

    let cx = startX, cy = startY, entryDir = 0, steps = 0;

    do {
        result.push({ x: cx, y: cy });
        let found = false;
        for (let k = 0; k < 8; k++) {
            const dir = (entryDir + k) % 8;
            const nx  = cx + dx[dir];
            const ny  = cy + dy[dir];
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            if (labels[ny * W + nx] !== label) continue;
            entryDir = ((dir + 4) % 8 + 1) % 8;
            cx = nx; cy = ny; found = true; break;
        }
        if (!found) break;
        steps++;
    } while ((cx !== startX || cy !== startY) && steps < maxSteps);

    return result;
}

/** Ramer-Douglas-Peucker polygon simplification. */
export function rdpSimplify(points, tolerance) {
    if (points.length <= 2) return points;
    let maxDist = 0, maxIdx = 0;
    const start = points[0], end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
        const dist = rdpDistance(points[i], start, end);
        if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }
    if (maxDist > tolerance) {
        const left  = rdpSimplify(points.slice(0, maxIdx + 1), tolerance);
        const right = rdpSimplify(points.slice(maxIdx), tolerance);
        return [...left.slice(0, -1), ...right];
    }
    return [start, end];
}

function rdpDistance(pt, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    return Math.hypot(pt.x - a.x - t * dx, pt.y - a.y - t * dy);
}

/** Shared pre-processing: draw image to canvas, greyscale, blur, threshold, open, seal. */
export function preprocessImage(img, tolerancePx) {
    const MAX_DIM = 1200;
    const scale   = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1);
    const W       = Math.round(img.naturalWidth  * scale);
    const H       = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);

    let pixelData;
    try {
        pixelData = ctx.getImageData(0, 0, W, H).data;
    } catch (e) {
        throw new Error('FP360: Cross-origin image — upload to WordPress media library.');
    }

    // Greyscale
    const grey = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
        grey[i] = Math.round(0.299*pixelData[i*4] + 0.587*pixelData[i*4+1] + 0.114*pixelData[i*4+2]);
    }

    // Gaussian blur (3x3)
    const blurred = new Uint8Array(W * H);
    const gK = [1,2,1,2,4,2,1,2,1];
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let s = 0, w = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nx = Math.max(0, Math.min(W-1, x+kx));
                    const ny = Math.max(0, Math.min(H-1, y+ky));
                    const k  = gK[(ky+1)*3+(kx+1)];
                    s += grey[ny*W+nx]*k; w += k;
                }
            }
            blurred[y*W+x] = Math.round(s/w);
        }
    }

    const thresh = otsuThreshold(blurred, W * H);
    const binary = new Uint8Array(W * H);
    for (let i = 0; i < W*H; i++) binary[i] = blurred[i] >= thresh ? 255 : 0;

    const k      = Math.max(2, tolerancePx);
    const gapK   = Math.max(k + 2, Math.round(W / 60));
    const eroded = morphErode(binary, W, H, k);
    const opened = morphDilate(eroded, W, H, k);
    const sealed = morphErode(opened, W, H, gapK);

    return { W, H, scale, binary, opened, sealed, k, gapK };
}

/** Manhattan snapping: force edges within 15 degrees of H/V to be exactly so. */
export function manhattanSnap(points) {
    const SNAP_RAD = 15 * Math.PI / 180;
    const snapped  = points.map(p => ({ x: p.x, y: p.y }));
    for (let i = 0; i < snapped.length; i++) {
        const a   = snapped[i];
        const b   = snapped[(i + 1) % snapped.length];
        const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x));
        if (ang < SNAP_RAD || ang > Math.PI - SNAP_RAD) b.y = a.y;
        else if (Math.abs(ang - Math.PI / 2) < SNAP_RAD) b.x = a.x;
    }
    return snapped;
}

/** Build exterior mask by flood-filling from image border on `sealed`. */
export function buildExteriorMask(sealed, W, H) {
    const exterior = new Uint8Array(W * H);
    const q = [];
    function seed(idx) {
        if (sealed[idx] === 255 && !exterior[idx]) { exterior[idx] = 1; q.push(idx); }
    }
    for (let x = 0; x < W; x++) { seed(x); seed((H-1)*W+x); }
    for (let y = 0; y < H; y++) { seed(y*W); seed(y*W+W-1); }
    let qi = 0;
    while (qi < q.length) {
        const i = q[qi++]; const x = i%W, y = Math.floor(i/W);
        if (y>0     && sealed[i-W]===255 && !exterior[i-W]) { exterior[i-W]=1; q.push(i-W); }
        if (y<H-1   && sealed[i+W]===255 && !exterior[i+W]) { exterior[i+W]=1; q.push(i+W); }
        if (x>0     && sealed[i-1]===255 && !exterior[i-1]) { exterior[i-1]=1; q.push(i-1); }
        if (x<W-1   && sealed[i+1]===255 && !exterior[i+1]) { exterior[i+1]=1; q.push(i+1); }
    }
    return exterior;
}