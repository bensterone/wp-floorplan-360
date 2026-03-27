/**
 * detection/seed.js
 * Click-to-seed room fill with watershed expansion.
 */

import { state } from '../state.js';
import { saveHotspots, generateId, nextColor, requestRedraw, imgEl } from '../helpers.js';
import { renderHotspotList } from '../render.js';
import { setDetectionStatus } from '../ui.js';
import {
    preprocessImage, buildExteriorMask,
    mooreTrace, rdpSimplify, manhattanSnap,
} from './image.js';
import { traceRegions } from './auto.js';

/* global fp360Admin */

export function runSeedFill(seeds, tolerancePx) {
    if (!imgEl || !imgEl.naturalWidth) { setDetectionStatus('no-image'); return; }
    if (!seeds || seeds.length === 0) return;

    setDetectionStatus('processing');

    setTimeout(function () {
        try {
            const polygons = runSeedFillCore(imgEl, seeds, tolerancePx);

            if (polygons.length === 0) {
                setDetectionStatus('none-found');
                state.seeds = [];
                requestRedraw();
                return;
            }

            polygons.forEach(points => {
                state.hotspots.push({
                    id: generateId(), points,
                    label: fp360Admin.i18n.newRoom || 'New Room',
                    image360: '', color: nextColor(),
                });
            });

            state.seeds = [];
            saveHotspots();
            renderHotspotList();
            requestRedraw();
            setDetectionStatus('done', polygons.length);
        } catch (err) {
            console.error('FP360 Seed fill error:', err);
            setDetectionStatus('error');
        }
    }, 50);
}

function runSeedFillCore(img, seeds, tolerancePx) {
    const { W, H, scale, opened, sealed } = preprocessImage(img, tolerancePx);
    const exterior = buildExteriorMask(sealed, W, H);

    // Place seed labels — search in `opened` (text removed, rooms intact)
    const labels = new Int32Array(W * H).fill(-1);
    let validSeedCount = 0;

    seeds.forEach((s, idx) => {
        const px = Math.round(s.x * W);
        const py = Math.round(s.y * H);
        let found = false;
        outer: for (let r = 0; r <= 50; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const nx = Math.max(0, Math.min(W-1, px+dx));
                    const ny = Math.max(0, Math.min(H-1, py+dy));
                    const ni = ny*W+nx;
                    if (opened[ni] === 255 && !exterior[ni] && labels[ni] === -1) {
                        labels[ni] = idx; validSeedCount++; found = true; break outer;
                    }
                }
            }
        }
        if (!found) console.warn('FP360: seed', idx+1, 'could not find a room pixel');
    });

    if (validSeedCount === 0) return [];

    // BFS watershed on `opened`, respecting exterior mask.
    // A retry counter per pixel prevents an infinite loop when isolated interior
    // pixels have no labelled neighbours yet — they get re-queued, but only up
    // to MAX_RETRIES times before being silently dropped.
    const MAX_RETRIES = 4;
    const expanded  = labels.slice();
    const retries   = new Uint8Array(W * H); // retry count per pixel, zero-initialised
    const wQueue    = [];

    for (let i = 0; i < W*H; i++) {
        if (expanded[i] < 0) continue;
        const x = i%W, y = Math.floor(i/W);
        if (y>0   && opened[i-W]===255 && !exterior[i-W] && expanded[i-W]===-1) wQueue.push(i-W);
        if (y<H-1 && opened[i+W]===255 && !exterior[i+W] && expanded[i+W]===-1) wQueue.push(i+W);
        if (x>0   && opened[i-1]===255 && !exterior[i-1] && expanded[i-1]===-1) wQueue.push(i-1);
        if (x<W-1 && opened[i+1]===255 && !exterior[i+1] && expanded[i+1]===-1) wQueue.push(i+1);
    }

    let wqi = 0;
    while (wqi < wQueue.length) {
        const i = wQueue[wqi++];
        if (expanded[i] >= 0 || opened[i] !== 255 || exterior[i]) continue;
        const x = i%W, y = Math.floor(i/W);
        let lbl = -1;
        if (y>0   && expanded[i-W]>=0) lbl = expanded[i-W];
        else if (y<H-1 && expanded[i+W]>=0) lbl = expanded[i+W];
        else if (x>0   && expanded[i-1]>=0) lbl = expanded[i-1];
        else if (x<W-1 && expanded[i+1]>=0) lbl = expanded[i+1];

        if (lbl < 0) {
            // No labelled neighbour yet — retry later, but only up to MAX_RETRIES.
            if (retries[i] < MAX_RETRIES) { retries[i]++; wQueue.push(i); }
            continue;
        }
        expanded[i] = lbl;
        if (y>0   && opened[i-W]===255 && !exterior[i-W] && expanded[i-W]===-1) wQueue.push(i-W);
        if (y<H-1 && opened[i+W]===255 && !exterior[i+W] && expanded[i+W]===-1) wQueue.push(i+W);
        if (x>0   && opened[i-1]===255 && !exterior[i-1] && expanded[i-1]===-1) wQueue.push(i-1);
        if (x<W-1 && opened[i+1]===255 && !exterior[i+1] && expanded[i+1]===-1) wQueue.push(i+1);
    }

    const validLabels = new Set(seeds.map((_, i) => i));
    return traceRegions(validLabels, expanded, opened, W, H, scale, img);
}