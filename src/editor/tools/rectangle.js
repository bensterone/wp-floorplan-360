/**
 * tools/rectangle.js
 * Click-and-drag rectangle tool with wall snapping.
 */

import { state } from '../state.js';
import { saveHotspots, generateId, nextColor, requestRedraw, imgEl } from '../helpers.js';
import { renderHotspotList } from '../render.js';
import { otsuThreshold, morphErode, morphDilate } from '../detection/image.js';

/* global fp360Admin */

/**
 * Called when the editor finishes a rectangle drag.
 * Snaps each edge outward to the nearest dark wall pixel in `opened`.
 */
export function finishRect(s, c) {
    if (!imgEl || !imgEl.naturalWidth) return;

    const MAX_DIM = 1200;
    const scale   = Math.min(MAX_DIM / imgEl.naturalWidth, MAX_DIM / imgEl.naturalHeight, 1);
    const W       = Math.round(imgEl.naturalWidth  * scale);
    const H       = Math.round(imgEl.naturalHeight * scale);

    const canvas  = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(imgEl, 0, 0, W, H);

    let pixelData;
    try {
        pixelData = ctx.getImageData(0, 0, W, H).data;
    } catch (e) {
        commitRect(s, c);
        return;
    }

    const grey = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
        grey[i] = Math.round(
            0.299 * pixelData[i*4] +
            0.587 * pixelData[i*4+1] +
            0.114 * pixelData[i*4+2]
        );
    }

    const thresh = otsuThreshold(grey, W * H);
    const binary = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) binary[i] = grey[i] >= thresh ? 255 : 0;

    const k      = 3;
    const opened = morphDilate(morphErode(binary, W, H, k), W, H, k);

    const SNAP_RANGE = Math.round(W * 0.04);

    let top    = Math.round(Math.min(s.y, c.y) * H);
    let bottom = Math.round(Math.max(s.y, c.y) * H);
    let left   = Math.round(Math.min(s.x, c.x) * W);
    let right  = Math.round(Math.max(s.x, c.x) * W);

    top    = snapEdge(opened, W, H, top,    left, right,  'top',    SNAP_RANGE);
    bottom = snapEdge(opened, W, H, bottom, left, right,  'bottom', SNAP_RANGE);
    left   = snapEdge(opened, W, H, left,   top,  bottom, 'left',   SNAP_RANGE);
    right  = snapEdge(opened, W, H, right,  top,  bottom, 'right',  SNAP_RANGE);

    commitRect({ x: left / W, y: top / H }, { x: right / W, y: bottom / H });
}

/**
 * Snaps one edge outward to the nearest dark wall line.
 * Searches only away from the room interior so text cannot interfere.
 */
function snapEdge(opened, W, H, edge, rangeA, rangeB, direction, maxSearch) {
    const DARK_THRESHOLD = 0.3;

    for (let offset = 0; offset <= maxSearch; offset++) {
        let darkCount = 0, sampleCount = 0;

        if (direction === 'top') {
            const row = Math.max(0, edge - offset);
            for (let x = rangeA; x <= rangeB; x += 3) {
                if (x < 0 || x >= W) continue;
                sampleCount++;
                if (opened[row * W + x] === 0) darkCount++;
            }
        } else if (direction === 'bottom') {
            const row = Math.min(H - 1, edge + offset);
            for (let x = rangeA; x <= rangeB; x += 3) {
                if (x < 0 || x >= W) continue;
                sampleCount++;
                if (opened[row * W + x] === 0) darkCount++;
            }
        } else if (direction === 'left') {
            const col = Math.max(0, edge - offset);
            for (let y = rangeA; y <= rangeB; y += 3) {
                if (y < 0 || y >= H) continue;
                sampleCount++;
                if (opened[y * W + col] === 0) darkCount++;
            }
        } else if (direction === 'right') {
            const col = Math.min(W - 1, edge + offset);
            for (let y = rangeA; y <= rangeB; y += 3) {
                if (y < 0 || y >= H) continue;
                sampleCount++;
                if (opened[y * W + col] === 0) darkCount++;
            }
        }

        if (sampleCount > 0 && darkCount / sampleCount >= DARK_THRESHOLD) {
            return direction === 'top'    ? Math.max(0, edge - offset)
                 : direction === 'bottom' ? Math.min(H - 1, edge + offset)
                 : direction === 'left'   ? Math.max(0, edge - offset)
                 :                          Math.min(W - 1, edge + offset);
        }
    }
    return edge;
}

/** Creates a hotspot from normalised rectangle corners. */
function commitRect(s, c) {
    const x1 = Math.max(0, Math.min(1, Math.min(s.x, c.x)));
    const y1 = Math.max(0, Math.min(1, Math.min(s.y, c.y)));
    const x2 = Math.max(0, Math.min(1, Math.max(s.x, c.x)));
    const y2 = Math.max(0, Math.min(1, Math.max(s.y, c.y)));

    state.hotspots.push({
        id:       generateId(),
        points:   [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
        label:    fp360Admin.i18n.newRoom || 'New Room',
        image360: '',
        color:    nextColor(),
    });

    saveHotspots();
    renderHotspotList();
    requestRedraw();
}