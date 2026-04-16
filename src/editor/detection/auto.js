/**
 * detection/auto.js
 * Fully automatic room detection — no human input required.
 * Less reliable than seed fill but zero interaction needed.
 */

import { state } from '../state.js';
import { saveHotspots, generateId, nextColor, requestRedraw, imgEl, emptyState } from '../helpers.js';
import { renderHotspotList } from '../render.js';
import { setDetectionStatus } from '../ui.js';
import {
    preprocessImage, buildExteriorMask,
    mooreTrace, rdpSimplify, manhattanSnap,
} from './image.js';

/* global fp360Admin */

export function detectRooms(tolerancePx) {
    if (!imgEl || !imgEl.naturalWidth || (emptyState && emptyState.style.display !== 'none')) {
        setDetectionStatus('no-image');
        return;
    }
    setDetectionStatus('processing');

    setTimeout(function () {
        try {
            const polygons = runDetection(imgEl, tolerancePx);

            if (polygons.length === 0) {
                setDetectionStatus('none-found');
                return;
            }

            polygons.forEach(function (points) {
                state.hotspots.push({
                    id: generateId(), points,
                    label: fp360Admin.i18n.newRoom || 'New Room',
                    image360: '', color: nextColor(),
                });
            });

            saveHotspots();
            renderHotspotList();
            requestRedraw();
            setDetectionStatus('done', polygons.length);
        } catch (err) {
            console.error('FP360 Detection error:', err);
            setDetectionStatus('error');
        }
    }, 50);
}

function runDetection(img, tolerancePx) {
    const { W, H, scale, opened, sealed, gapK } = preprocessImage(img, tolerancePx);
    const exterior = buildExteriorMask(sealed, W, H);

    // Connected components on sealed interior
    const labels      = new Int32Array(W * H).fill(-1);
    const regionSizes = [];
    let   numLabels   = 0;

    for (let i = 0; i < W * H; i++) {
        if (sealed[i] !== 255 || exterior[i] || labels[i] !== -1) continue;
        const label = numLabels++;
        const rQueue = [i]; labels[i] = label;
        let size = 0, rqi = 0;
        while (rqi < rQueue.length) {
            const idx = rQueue[rqi++]; size++;
            const x = idx % W, y = Math.floor(idx / W);
            if (y>0     && sealed[idx-W]===255 && !exterior[idx-W] && labels[idx-W]===-1) { labels[idx-W]=label; rQueue.push(idx-W); }
            if (y<H-1   && sealed[idx+W]===255 && !exterior[idx+W] && labels[idx+W]===-1) { labels[idx+W]=label; rQueue.push(idx+W); }
            if (x>0     && sealed[idx-1]===255 && !exterior[idx-1] && labels[idx-1]===-1) { labels[idx-1]=label; rQueue.push(idx-1); }
            if (x<W-1   && sealed[idx+1]===255 && !exterior[idx+1] && labels[idx+1]===-1) { labels[idx+1]=label; rQueue.push(idx+1); }
        }
        regionSizes.push(size);
    }

    const totalArea   = W * H;
    const validLabels = new Set();
    regionSizes.forEach((size, label) => {
        if (size >= totalArea * 0.002 && size <= totalArea * 0.75) validLabels.add(label);
    });
    if (validLabels.size === 0) return [];

    // Watershed expansion
    const expanded = new Int32Array(W * H).fill(-1);
    for (let i = 0; i < W * H; i++) if (labels[i] >= 0) expanded[i] = labels[i];

    for (let round = 0; round < gapK; round++) {
        const next = expanded.slice();
        for (let i = 0; i < W * H; i++) {
            if (expanded[i] >= 0 || opened[i] !== 255) continue;
            const x = i % W, y = Math.floor(i / W);
            if (y>0     && expanded[i-W]>=0) { next[i]=expanded[i-W]; continue; }
            if (y<H-1   && expanded[i+W]>=0) { next[i]=expanded[i+W]; continue; }
            if (x>0     && expanded[i-1]>=0) { next[i]=expanded[i-1]; continue; }
            if (x<W-1   && expanded[i+1]>=0) { next[i]=expanded[i+1]; }
        }
        expanded.set(next);
    }

    return traceRegions(validLabels, expanded, opened, W, H, scale, img);
}

export function traceRegions(validLabels, expanded, opened, W, H, scale, img) {
    const polygons = [];
    const rdpTol   = Math.max(3, Math.round(W / 80));

    validLabels.forEach(label => {
        const TARGET = 0;
        const rLbls  = new Int32Array(W * H).fill(-1);
        let traceStart = -1;
        for (let i = 0; i < W * H; i++) {
            if (expanded[i] !== label) continue;
            rLbls[i] = TARGET;
            if (traceStart === -1) traceStart = i;
        }
        if (traceStart === -1) return;

        const boundary = mooreTrace(rLbls, W, H, TARGET, traceStart);
        if (boundary.length < 6) return;

        const step     = Math.max(1, Math.floor(boundary.length / 600));
        const sampled  = boundary.filter((_, i) => i % step === 0);
        const simplified = rdpSimplify(sampled, rdpTol);
        if (simplified.length < 3) return;

        const snapped = manhattanSnap(simplified);
        const points  = snapped.map(p => ({
            x: Math.max(0, Math.min(1, (p.x / scale) / img.naturalWidth)),
            y: Math.max(0, Math.min(1, (p.y / scale) / img.naturalHeight)),
        }));
        polygons.push(points);
    });

    return polygons;
}