(function ($) {
    'use strict';

    // --- 1. CONSTANTS & STATE ---

    // Palette of 12 distinct, accessible colours for room polygons.
    const COLORS = [
        '#4fa8e8', '#e8734f', '#4fe87a', '#e84f9a',
        '#a84fe8', '#e8d94f', '#4fe8d9', '#e84f4f',
        '#8ae84f', '#4f6ae8', '#e8a84f', '#4fe8c0',
    ];

    const SNAP_DISTANCE = 0.025;

    const $dataField     = $('#fp360_hotspots_data');
    const $imageUrlInput = $('#fp360_image_url');
    const svg            = document.getElementById('fp360-svg-overlay');
    const imgEl          = document.getElementById('fp360-floorplan-img');
    const $emptyState    = $('#fp360-empty-state');

    const state = {
        hotspots:      [],
        drawing:       false,
        currentPoints: [],
        selectedId:    null,
        mousePos:      { x: 0, y: 0 },
        needsRedraw:   false
    };

    try {
        const initialData = $dataField.val();
        state.hotspots = initialData ? JSON.parse(initialData) : [];
    } catch (e) {
        console.error('FP360: Error parsing hotspot data', e);
        state.hotspots = [];
    }

    // --- 2. HELPERS ---

    function saveHotspots() {
        $dataField.val(JSON.stringify(state.hotspots));
    }

    function generateId() {
        if (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) {
            return self.crypto.randomUUID();
        }
        return 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    function nextColor() {
        return COLORS[ state.hotspots.length % COLORS.length ];
    }

    function requestRedraw() {
        if (!state.needsRedraw) {
            state.needsRedraw = true;
            requestAnimationFrame(renderSVG);
        }
    }

    function getNormalizedPos(e) {
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top)  / rect.height
        };
    }

    function getCentroid(points) {
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return { x, y };
    }

    // --- 3. RENDERING ---

    function renderSVG() {
        state.needsRedraw = false;
        if (!svg) return;

        while (svg.firstChild) svg.removeChild(svg.firstChild);

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 3) return;

            const color      = hs.color || COLORS[0];
            const isSelected = hs.id === state.selectedId;
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
                state.selectedId = hs.id;
                requestRedraw();
                renderHotspotList();
                document.querySelector('.hs-item.is-active')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });

            svg.appendChild(poly);

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
    }

    function renderHotspotList() {
        const $ul = $('#fp360-hotspot-items').empty();

        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const color      = hs.color || COLORS[0];
            const $li        = $('<li>').addClass('hs-item').toggleClass('is-active', isSelected);

            $li[0].style.setProperty('--hs-color', color);

            const $swatch   = $('<span>').addClass('hs-color-swatch').css('background-color', color);
            const $label    = $('<input>', {
                type: 'text', class: 'hs-label', 'data-id': hs.id,
                placeholder: fp360Admin.i18n.roomLabel || 'Room Label'
            }).val(hs.label);
            const $row      = $('<div>').addClass('hs-input-row');
            const $urlInput = $('<input>', {
                type: 'text', class: 'hs-img360', 'data-id': hs.id,
                placeholder: '360 Image URL'
            }).val(hs.image360);
            const $pickBtn  = $('<button>', {
                type: 'button', class: 'button hs-pick-360', 'data-id': hs.id,
                text: fp360Admin.i18n.pick360
            });
            const $deleteBtn = $('<button>', {
                type: 'button', class: 'button button-link-delete hs-delete', 'data-id': hs.id,
                text: fp360Admin.i18n.deleteRoom
            });

            const $header = $('<div>').addClass('hs-header').append($swatch, $label);
            $row.append($urlInput, $pickBtn);
            $li.append($header, $row, $deleteBtn);
            $ul.append($li);
        });
    }

    // --- 4. ACTION HANDLERS ---

    function closeShape() {
        if (state.currentPoints.length < 3) return;

        state.hotspots.push({
            id:       generateId(),
            points:   [...state.currentPoints],
            label:    fp360Admin.i18n.newRoom || 'New Room',
            image360: '',
            color:    nextColor()
        });

        state.currentPoints = [];
        state.drawing = false;
        if (svg) svg.classList.remove('snap-active');

        saveHotspots();
        renderHotspotList();
        requestRedraw();
    }

    // --- 5. EVENT LISTENERS ---

    $('#fp360_pick_image').on('click', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) return;

        const frame = wp.media({ title: 'Select Floorplan', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const url = attachment.url;
            $imageUrlInput.val(url);
            if (imgEl) { imgEl.src = url; $(imgEl).show(); }
            if (svg) $(svg).show();
            if ($emptyState) $emptyState.hide();
            requestRedraw();
        });
        frame.open();
    });

    if (svg) {
        svg.addEventListener('mousemove', function (e) {
            if (!state.drawing) return;
            state.mousePos = getNormalizedPos(e);
            if (state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                const dist  = Math.hypot(state.mousePos.x - first.x, state.mousePos.y - first.y);
                svg.classList.toggle('snap-active', dist < SNAP_DISTANCE);
            }
            requestRedraw();
        });

        svg.addEventListener('click', function (e) {
            if (!imgEl.src || $emptyState.is(':visible')) return;
            const pos = getNormalizedPos(e);
            if (state.drawing && state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                if (Math.hypot(pos.x - first.x, pos.y - first.y) < SNAP_DISTANCE) {
                    closeShape();
                    return;
                }
            }
            state.drawing = true;
            state.currentPoints.push(pos);
            requestRedraw();
        });

        svg.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (state.drawing && state.currentPoints.length >= 3) closeShape();
        });
    }

    $('#fp360-undo-point').on('click', function () {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) {
            state.drawing = false;
            if (svg) svg.classList.remove('snap-active');
        }
        requestRedraw();
    });

    $(document).on('click', '.hs-pick-360', function (e) {
        e.preventDefault();
        const id    = $(this).data('id');
        const frame = wp.media({ title: 'Select 360° Image', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const hs = state.hotspots.find(h => h.id === id);
            if (hs) { hs.image360 = attachment.url; saveHotspots(); renderHotspotList(); }
        });
        frame.open();
    });

    $(document).on('click', '.hs-delete', function () {
        if (confirm(fp360Admin.i18n.deleteRoomConfirm)) {
            const id = $(this).data('id');
            state.hotspots = state.hotspots.filter(h => h.id !== id);
            if (state.selectedId === id) state.selectedId = null;
            saveHotspots();
            renderHotspotList();
            requestRedraw();
        }
    });

    $(document).on('input', '.hs-label, .hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label    = $(`.hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.hs-img360[data-id="${id}"]`).val();
            saveHotspots();
            requestRedraw();
        }
    });

    // Detect Rooms button
    $('#fp360-detect-rooms').on('click', function () {
        const tolerance = parseInt($('#fp360-detect-tolerance').val(), 10) || 3;
        detectRooms(tolerance);
    });

    // Tolerance slider — update displayed value in real time
    $('#fp360-detect-tolerance').on('input', function () {
        $('#fp360-detect-tolerance-val').text($(this).val());
    });

    window.addEventListener('resize', requestRedraw);

    renderHotspotList();
    requestRedraw();

    // --- 6. ROOM DETECTION ---
    //
    // Automatically detects room regions in the uploaded floorplan image.
    //
    // Algorithm:
    //   1. Scale image to ≤600px for fast processing
    //   2. Convert to greyscale + Gaussian blur (removes JPEG noise)
    //   3. Otsu adaptive threshold → binary (0=wall, 255=room)
    //   4. Morphological opening (erode→dilate) → removes thin features
    //      (furniture, text, dimension lines, door arcs)
    //   5. Gap sealing (extra erosion) → closes doorway openings
    //   6. Exterior flood-fill from image border → isolates building interior
    //   7. Connected components on interior → one label per candidate room
    //   8. Filter by area (too small = artefact, too large = exterior leak)
    //   9. Extract boundary pixels per region, sort by angle from centroid
    //  10. RDP simplification → clean polygon with 4–20 points
    //  11. Normalise to 0–1 coordinates for the hotspot data format
    //
    // Reliable for: standard black-and-white floorplans (WBS series, degewo series).
    // Fallback: editor draws rooms manually using the existing drawing tool.

    /**
     * Entry point — called by the Detect Rooms button.
     * @param {number} tolerancePx  Erosion kernel radius (slider value, default 3).
     */
    function detectRooms(tolerancePx) {
        if (!imgEl || !imgEl.naturalWidth || $emptyState.is(':visible')) {
            setDetectionStatus('no-image');
            return;
        }

        setDetectionStatus('processing');

        // Yield to the browser so the "Detecting…" text renders before we block.
        setTimeout(function () {
            try {
                const polygons = runDetection(imgEl, tolerancePx);

                if (polygons.length === 0) {
                    setDetectionStatus('none-found');
                    return;
                }

                // Append detected polygons to existing hotspots.
                // The editor can delete false positives; existing manual
                // polygons are untouched.
                polygons.forEach(function (points) {
                    state.hotspots.push({
                        id:       generateId(),
                        points:   points,
                        label:    fp360Admin.i18n.newRoom || 'New Room',
                        image360: '',
                        color:    nextColor()
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

    function setDetectionStatus(status, count) {
        const $btn    = $('#fp360-detect-rooms');
        const $status = $('#fp360-detect-status');
        const i18n    = fp360Admin.i18n;

        const labels = {
            'processing': { btn: i18n.detecting   || 'Detecting…',      disabled: true,  cls: 'fp360-status--info'    },
            'done':       { btn: i18n.detectRooms  || 'Detect Rooms',    disabled: false, cls: 'fp360-status--success' },
            'none-found': { btn: i18n.detectRooms  || 'Detect Rooms',    disabled: false, cls: 'fp360-status--warn'    },
            'no-image':   { btn: i18n.detectRooms  || 'Detect Rooms',    disabled: false, cls: 'fp360-status--warn'    },
            'error':      { btn: i18n.detectRooms  || 'Detect Rooms',    disabled: false, cls: 'fp360-status--error'   },
        };

        const messages = {
            'processing': i18n.detecting      || 'Detecting rooms…',
            'done':       (i18n.detectedRooms || 'Detected {n} room(s). Review and assign 360° images.').replace('{n}', count),
            'none-found': i18n.noRoomsFound   || 'No rooms detected. Try a lower sensitivity value, or draw rooms manually.',
            'no-image':   i18n.noImageForDetect || 'Please upload a floorplan image first.',
            'error':      i18n.detectionError || 'Detection failed. Please draw rooms manually.',
        };

        const cfg = labels[status] || labels['error'];
        $btn.prop('disabled', cfg.disabled).text(cfg.btn);
        $status
            .text(messages[status] || '')
            .removeClass('fp360-status--info fp360-status--success fp360-status--warn fp360-status--error')
            .addClass(cfg.cls)
            .show();
    }

    /**
     * Core detection algorithm. Returns an array of normalised polygon point arrays.
     * @param  {HTMLImageElement} img
     * @param  {number}           tolerancePx
     * @return {Array<Array<{x:number,y:number}>>}
     */
    function runDetection(img, tolerancePx) {
        // Scale image to at most 600px on the longer side for fast processing.
        const MAX_DIM = 600;
        const scale   = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1);
        const W       = Math.round(img.naturalWidth  * scale);
        const H       = Math.round(img.naturalHeight * scale);

        // Draw image onto an offscreen canvas (white background handles transparent PNGs).
        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);

        let pixelData;
        try {
            pixelData = ctx.getImageData(0, 0, W, H).data;
        } catch (e) {
            // Cross-origin image — cannot read pixel data.
            throw new Error('FP360: Cannot read image pixels (cross-origin). Upload the image to the WordPress media library.');
        }

        // --- Step 1: Greyscale ---
        const grey = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
            grey[i] = Math.round(
                0.299 * pixelData[i * 4] +
                0.587 * pixelData[i * 4 + 1] +
                0.114 * pixelData[i * 4 + 2]
            );
        }

        // --- Step 2: Gaussian blur (3×3) to smooth JPEG/scan noise ---
        const blurred = new Uint8Array(W * H);
        const gKernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let sum = 0, weight = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const nx = Math.max(0, Math.min(W - 1, x + kx));
                        const ny = Math.max(0, Math.min(H - 1, y + ky));
                        const k  = gKernel[(ky + 1) * 3 + (kx + 1)];
                        sum    += grey[ny * W + nx] * k;
                        weight += k;
                    }
                }
                blurred[y * W + x] = Math.round(sum / weight);
            }
        }

        // --- Step 3: Otsu adaptive threshold ---
        // Result: binary where 0 = dark/wall, 255 = light/room or exterior.
        const thresh = otsuThreshold(blurred, W * H);
        const binary = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
            binary[i] = blurred[i] >= thresh ? 255 : 0;
        }

        // --- Step 4: Morphological opening (removes thin features) ---
        // Erode removes thin dark features (furniture, text, dimension lines).
        // Dilate restores the surviving thick walls to their original thickness.
        const k      = Math.max(1, tolerancePx);
        const eroded = morphErode(binary, W, H, k);
        const opened = morphDilate(eroded, W, H, k);

        // --- Step 5: Gap sealing (close doorway openings) ---
        // Eroding the light pixels (= growing dark walls) by gapK pixels
        // seals narrow gaps between rooms caused by door openings.
        // Rooms shrink slightly from each wall, which is acceptable.
        const gapK  = k + 3;
        const sealed = morphErode(opened, W, H, gapK);

        // --- Step 6: Mark exterior by flood-fill from image border ---
        // Everything reachable from the border without crossing a wall is exterior.
        const exterior = new Uint8Array(W * H);
        const queue    = [];

        function seedExterior(idx) {
            if (sealed[idx] === 255 && !exterior[idx]) {
                exterior[idx] = 1;
                queue.push(idx);
            }
        }

        for (let x = 0; x < W; x++) {
            seedExterior(x);
            seedExterior((H - 1) * W + x);
        }
        for (let y = 0; y < H; y++) {
            seedExterior(y * W);
            seedExterior(y * W + W - 1);
        }

        let qi = 0;
        while (qi < queue.length) {
            const idx = queue[qi++];
            const x   = idx % W;
            const y   = Math.floor(idx / W);
            if (y > 0     && sealed[idx - W] === 255 && !exterior[idx - W]) { exterior[idx - W] = 1; queue.push(idx - W); }
            if (y < H - 1 && sealed[idx + W] === 255 && !exterior[idx + W]) { exterior[idx + W] = 1; queue.push(idx + W); }
            if (x > 0     && sealed[idx - 1] === 255 && !exterior[idx - 1]) { exterior[idx - 1] = 1; queue.push(idx - 1); }
            if (x < W - 1 && sealed[idx + 1] === 255 && !exterior[idx + 1]) { exterior[idx + 1] = 1; queue.push(idx + 1); }
        }

        // --- Step 7: Connected components (interior light pixels only) ---
        const labels      = new Int32Array(W * H).fill(-1);
        const regionSizes = [];
        let   numLabels   = 0;

        for (let i = 0; i < W * H; i++) {
            if (sealed[i] !== 255 || exterior[i] || labels[i] !== -1) continue;

            const label  = numLabels++;
            const rQueue = [i];
            labels[i]    = label;
            let size     = 0;
            let rqi      = 0;

            while (rqi < rQueue.length) {
                const idx = rQueue[rqi++];
                size++;
                const x = idx % W;
                const y = Math.floor(idx / W);

                if (y > 0     && sealed[idx - W] === 255 && !exterior[idx - W] && labels[idx - W] === -1) { labels[idx - W] = label; rQueue.push(idx - W); }
                if (y < H - 1 && sealed[idx + W] === 255 && !exterior[idx + W] && labels[idx + W] === -1) { labels[idx + W] = label; rQueue.push(idx + W); }
                if (x > 0     && sealed[idx - 1] === 255 && !exterior[idx - 1] && labels[idx - 1] === -1) { labels[idx - 1] = label; rQueue.push(idx - 1); }
                if (x < W - 1 && sealed[idx + 1] === 255 && !exterior[idx + 1] && labels[idx + 1] === -1) { labels[idx + 1] = label; rQueue.push(idx + 1); }
            }

            regionSizes.push(size);
        }

        // --- Step 8: Filter regions by area ---
        const totalArea = W * H;
        const minArea   = totalArea * 0.004; // ~0.4% — smaller = artifact/AR/WC
        const maxArea   = totalArea * 0.75;  // larger = exterior leaked in

        const validLabels = new Set();
        regionSizes.forEach(function (size, label) {
            if (size >= minArea && size <= maxArea) validLabels.add(label);
        });

        if (validLabels.size === 0) return [];

        // --- Steps 9–11: Extract, simplify, normalise each region ---
        const polygons = [];

        validLabels.forEach(function (label) {
            // Collect boundary pixels and compute centroid simultaneously.
            const boundary = [];
            let sumX = 0, sumY = 0, count = 0;

            for (let i = 0; i < W * H; i++) {
                if (labels[i] !== label) continue;
                const x = i % W;
                const y = Math.floor(i / W);
                sumX += x;
                sumY += y;
                count++;

                // A pixel is on the boundary if any 4-connected neighbour is not in the same region.
                const isBoundary = (
                    x === 0 || x === W - 1 || y === 0 || y === H - 1 ||
                    labels[i - 1] !== label || labels[i + 1] !== label ||
                    labels[i - W] !== label || labels[i + W] !== label
                );
                if (isBoundary) boundary.push({ x, y });
            }

            if (boundary.length < 6) return;

            // Sort boundary pixels by angle from centroid.
            // This produces a correctly-ordered polygon traversal for
            // star-shaped rooms (the vast majority of rooms in practice).
            const cx = sumX / count;
            const cy = sumY / count;

            boundary.sort(function (a, b) {
                return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
            });

            // Subsample to at most 400 points before RDP for performance.
            const step    = Math.max(1, Math.floor(boundary.length / 400));
            const sampled = boundary.filter(function (_, i) { return i % step === 0; });

            // RDP simplification — reduces polygon to 4–20 points typically.
            const rdpTolerance = Math.max(2, Math.round(W / 120)); // ~5px at 600px
            const simplified   = rdpSimplify(sampled, rdpTolerance);

            if (simplified.length < 3) return;

            // Normalise to 0–1 using original image dimensions.
            const points = simplified.map(function (p) {
                return {
                    x: Math.max(0, Math.min(1, (p.x / scale) / img.naturalWidth)),
                    y: Math.max(0, Math.min(1, (p.y / scale) / img.naturalHeight))
                };
            });

            polygons.push(points);
        });

        return polygons;
    }

    // --- Morphological helpers (separable box structuring element) ---

    /**
     * Erode light pixels: a pixel stays light only if all neighbours in the
     * kernel are also light. Dark (wall) regions grow by `radius` pixels.
     */
    function morphErode(binary, W, H, radius) {
        // Horizontal pass
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
        // Vertical pass
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

    /**
     * Dilate light pixels: a pixel becomes light if any neighbour in the
     * kernel is light. Dark (wall) regions shrink by `radius` pixels.
     */
    function morphDilate(binary, W, H, radius) {
        // Horizontal pass
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
        // Vertical pass
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
     * Otsu's method — finds the threshold that maximises inter-class variance,
     * adapting automatically to the brightness distribution of each image.
     */
    function otsuThreshold(pixels, n) {
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
            const mB       = sumB / wB;
            const mF       = (sum - sumB) / wF;
            const variance = wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVar) { maxVar = variance; threshold = t; }
        }
        return threshold;
    }

    /**
     * Ramer-Douglas-Peucker polygon simplification.
     * Reduces a densely-sampled boundary to a small clean polygon.
     */
    function rdpSimplify(points, tolerance) {
        if (points.length <= 2) return points;

        let maxDist = 0, maxIdx = 0;
        const start = points[0];
        const end   = points[points.length - 1];

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
        const dx    = b.x - a.x;
        const dy    = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
        const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
        return Math.hypot(pt.x - a.x - t * dx, pt.y - a.y - t * dy);
    }

})(jQuery);