(function ($) {
    'use strict';

    const state = {
        hotspots: [],
        drawing: false,
        currentPoints: [], // normalized {x,y} 0–1
        selectedId: null,
    };

    const $dataField = $('#fp360_hotspots_data');
    const saved = $dataField.val();
    
    if (saved) {
        try {
            state.hotspots = JSON.parse(saved);
        } catch (e) {
            state.hotspots = [];
        }
    }

    const svg   = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');

    if (!svg) {
        return; // No image selected yet
    }

    function saveHotspots() {
        $dataField.val(JSON.stringify(state.hotspots));
    }

    // Convert legacy pixel coordinates (if any) to 0–1 based on current image size.
    function normalizeLegacyPoints() {
        if (!imgEl || !imgEl.src) return;
        const w = imgEl.offsetWidth  || imgEl.naturalWidth  || 1;
        const h = imgEl.offsetHeight || imgEl.naturalHeight || 1;

        if (w <= 1 || h <= 1) return;

        state.hotspots.forEach(hs => {
            if (!hs.points || !hs.points.length) return;
            const p = hs.points[0];
            // If point > 1, it's likely a pixel value, not a percentage
            if (p.x > 1 || p.y > 1) {
                hs.points = hs.points.map(pt => ({
                    x: +(pt.x / w).toFixed(4),
                    y: +(pt.y / h).toFixed(4),
                }));
            }
        });
    }

    function renderSVG() {
        $(svg).empty();
        if (!imgEl) return;

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        // 1. Render existing completed polygons
        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 2) return;
            const pts = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', pts);
            poly.setAttribute('fill', hs.id === state.selectedId ? 'rgba(0,120,255,0.5)' : 'rgba(0,180,100,0.3)');
            poly.setAttribute('stroke', '#fff');
            poly.setAttribute('stroke-width', '0.5');
            poly.setAttribute('vector-effect', 'non-scaling-stroke');
            poly.style.cursor = 'pointer';

            poly.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent drawing logic
                if (state.drawing) return;
                state.selectedId = hs.id;
                renderSVG();
                renderHotspotList();
            });

            svg.appendChild(poly);
        });

        // 2. Render the polygon currently being drawn
        if (state.currentPoints.length > 0) {
            const pts = state.currentPoints.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            
            // The Line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            line.setAttribute('points', pts);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', '#ffcc00');
            line.setAttribute('stroke-width', '0.5');
            line.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(line);

            // The Points (Vertices)
            state.currentPoints.forEach((p, index) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p.x * 100);
                c.setAttribute('cy', p.y * 100);
                c.setAttribute('r', 1);
                // First point is green to indicate "Click here to close"
                c.setAttribute('fill', index === 0 ? '#00e04b' : '#ffcc00'); 
                c.setAttribute('stroke', '#000');
                c.setAttribute('stroke-width', '0.2');
                c.setAttribute('vector-effect', 'non-scaling-stroke');
                svg.appendChild(c);
            });
        }
    }

    function getNormalizedPos(e) {
        const rect = svg.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width;
        let y = (e.clientY - rect.top)  / rect.height;

        // Clamp to 0-1
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        return {
            x: parseFloat(x.toFixed(4)),
            y: parseFloat(y.toFixed(4))
        };
    }

    // --- Snapping / Closing Logic ---
    svg.addEventListener('mousemove', function(e) {
        if (!state.drawing || state.currentPoints.length < 3) {
            svg.classList.remove('snap-active');
            return;
        }

        const pos = getNormalizedPos(e);
        const first = state.currentPoints[0];
        // Distance check (approx 3%)
        const dist = Math.hypot(pos.x - first.x, pos.y - first.y);

        if (dist < 0.03) {
            svg.classList.add('snap-active');
        } else {
            svg.classList.remove('snap-active');
        }
    });

    // --- Drawing Click Handler ---
    svg.addEventListener('click', function (e) {
        if (!imgEl || !imgEl.src) {
            alert('Please select a floorplan image first.');
            return;
        }

        const pos = getNormalizedPos(e);

        // Check if closing the shape
        if (state.drawing && state.currentPoints.length >= 3) {
            const first = state.currentPoints[0];
            const dist = Math.hypot(pos.x - first.x, pos.y - first.y);

            // If clicked near start point, close it
            if (dist < 0.03) {
                const id = 'hs_' + Date.now();
                state.hotspots.push({
                    id,
                    points: [...state.currentPoints],
                    label: 'New Room',
                    image360: ''
                });
                state.currentPoints = [];
                state.drawing = false;
                state.selectedId = id;
                svg.classList.remove('snap-active');
                saveHotspots();
                renderSVG();
                renderHotspotList();
                return;
            }
        }

        // Add new point
        state.drawing = true;
        state.currentPoints.push(pos);
        renderSVG();
    });

    // --- Sidebar List Rendering ---
    function renderHotspotList() {
        const ul = $('#fp360-hotspot-items').empty();

        if (state.hotspots.length === 0) {
            ul.append('<li style="color:#666;font-style:italic;">No hotspots defined yet.</li>');
            return;
        }

        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const bg    = isSelected ? '#f0f6fc' : '#fff';
            const border = isSelected ? '#2271b1' : '#ddd';

            const li = $(`
                <li class="hs-item" data-id="${hs.id}"
                    style="border:1px solid ${border}; border-left:4px solid ${border};
                           padding:10px; margin-bottom:10px; background:${bg};
                           display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
                    <div style="flex:1; min-width:200px;">
                        <label style="display:block;font-size:11px;color:#666;">Room Label</label>
                        <input type="text" class="hs-label regular-text" data-id="${hs.id}"
                               value="${hs.label}" style="width:100%;">
                    </div>
                    <div style="flex:2; min-width:300px;">
                        <label style="display:block;font-size:11px;color:#666;">360° Image URL</label>
                        <div style="display:flex; gap:5px;">
                            <input type="text" class="hs-img360 regular-text" data-id="${hs.id}"
                                   value="${hs.image360}" style="width:100%;">
                            <button type="button" class="button hs-pick-360" data-id="${hs.id}">Pick</button>
                        </div>
                    </div>
                    <div style="flex:0;">
                        <button type="button" class="button hs-select-btn" data-id="${hs.id}">
                            Select
                        </button>
                    </div>
                </li>
            `);
            ul.append(li);
        });
    }

    // --- Inputs & Buttons ---
    $(document).on('input', '.hs-label', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) { hs.label = $(this).val(); saveHotspots(); }
    });

    $(document).on('input', '.hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) { hs.image360 = $(this).val(); saveHotspots(); }
    });

    $(document).on('click', '.hs-select-btn', function () {
        state.selectedId = $(this).data('id');
        renderSVG();
        renderHotspotList();
    });

    $(document).on('click', '.hs-pick-360', function () {
        const id    = $(this).data('id');
        const frame = wp.media({
            title:  'Select 360° Image',
            button: { text: 'Use this image' },
            multiple: false
        });
        frame.on('select', function () {
            const url = frame.state().get('selection').first().toJSON().url;
            const hs  = state.hotspots.find(h => h.id === id);
            if (hs) {
                hs.image360 = url;
                saveHotspots();
            }
            $(`.hs-img360[data-id="${id}"]`).val(url);
        });
        frame.open();
    });

    $('#fp360-delete-selected').on('click', function () {
        if (!state.selectedId) return;
        if (!confirm('Are you sure you want to delete this hotspot?')) return;
        state.hotspots = state.hotspots.filter(h => h.id !== state.selectedId);
        state.selectedId = null;
        saveHotspots();
        renderSVG();
        renderHotspotList();
    });

    $('#fp360-undo-point').on('click', function() {
        if (state.drawing && state.currentPoints.length > 0) {
            state.currentPoints.pop();
            if (state.currentPoints.length === 0) {
                state.drawing = false;
            }
            renderSVG();
        }
    });

    $('#fp360-clear-drawing').on('click', function () {
        state.currentPoints = [];
        state.drawing       = false;
        renderSVG();
    });

    // Keyboard shortcuts
    $(document).on('keydown.fp360', function (e) {
        if (state.drawing && e.key === 'Escape') {
            e.preventDefault();
            if (state.currentPoints.length > 0) {
                state.currentPoints.pop();
                renderSVG();
            } else {
                state.drawing = false;
            }
        }
    });

    $('#fp360_pick_image').on('click', function () {
        const frame = wp.media({ title: 'Select Floorplan Image', multiple: false });
        frame.on('select', function () {
            const url = frame.state().get('selection').first().toJSON().url;
            $('#fp360_image_url').val(url);

            let img = document.getElementById('fp360-floorplan-img');
            if (img) {
                img.src = url;
            } else {
                img = document.createElement('img');
                img.id    = 'fp360-floorplan-img';
                img.src   = url;
                img.style = 'max-width:100%;display:block;';
                document.getElementById('fp360-canvas-container').prepend(img);
            }
            
            // Wait for image load to re-normalize
            img.onload = function() {
                 normalizeLegacyPoints();
                 renderSVG();
            };
        });
        frame.open();
    });

    // Initial Load
    if (imgEl && imgEl.complete) {
        normalizeLegacyPoints();
        renderSVG();
        renderHotspotList();
    } else if (imgEl) {
        imgEl.onload = function() {
            normalizeLegacyPoints();
            renderSVG();
            renderHotspotList();
        }
    } else {
        renderHotspotList();
    }

})(jQuery);