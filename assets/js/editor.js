(function ($) {
    'use strict';

    const $dataField = $('#fp360_hotspots_data');
    const $imageUrlInput = $('#fp360_image_url');
    const svg = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');
    
    const state = {
        hotspots: [],
        drawing: false,
        currentPoints: [],
        selectedId: null,
        mousePos: { x: 0, y: 0 } // Track mouse for live feedback
    };

    try {
        state.hotspots = JSON.parse($dataField.val() || '[]');
    } catch (e) { state.hotspots = []; }

    // --- 1. IMAGE SELECTION ---
    $('#fp360_pick_image').on('click', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) return;
        const frame = wp.media({ title: 'Select Floorplan Image', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const url = attachment.url;
            
            $imageUrlInput.val(url);
            
            let img = document.getElementById('fp360-floorplan-img');
            let container = document.getElementById('fp360-canvas-container'); // NEW
            
            if (img) {
                img.src = url;
                $(img).show();
            }
            if (svg) $(svg).show();
            
            // REMOVE the placeholder state
            if (container) {
                container.classList.remove('is-empty');
            }

            setTimeout(renderSVG, 100);
        });

    if (!svg) return;

    // --- 2. COORDINATE MATH ---
    function getNormalizedPos(e) {
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    }

    // --- 3. LIVE FEEDBACK ---
    svg.addEventListener('mousemove', function(e) {
        const pos = getNormalizedPos(e);
        state.mousePos = pos;

        if (state.drawing) {
            // Visual feedback: Check if we are hovering over the start point to close
            if (state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
                if (dist < 0.025) {
                    svg.classList.add('snap-active');
                } else {
                    svg.classList.remove('snap-active');
                }
            }
            renderSVG(); // Redraw to show the "ghost line"
        }
    });

    // --- 4. DRAWING & RENDERING ---
    function renderSVG() {
        $(svg).empty();
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        // Render Existing Hotspots
        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 2) return;
            const pts = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', pts);
            poly.setAttribute('fill', hs.id === state.selectedId ? 'rgba(0,120,255,0.6)' : 'rgba(0,180,100,0.3)');
            poly.setAttribute('stroke', '#fff');
            poly.setAttribute('stroke-width', '0.3');
            poly.setAttribute('vector-effect', 'non-scaling-stroke');
            poly.style.cursor = 'pointer';
            poly.addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectedId = hs.id;
                renderSVG(); renderHotspotList();
            });
            svg.appendChild(poly);
        });

        // Render Current Drawing
        if (state.currentPoints.length > 0) {
            const pointsWithMouse = [...state.currentPoints];
            if (state.drawing) pointsWithMouse.push(state.mousePos);

            const pts = pointsWithMouse.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            line.setAttribute('points', pts);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', '#ffcc00');
            line.setAttribute('stroke-width', '0.5');
            line.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(line);

            state.currentPoints.forEach((p, i) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p.x * 100); 
                c.setAttribute('cy', p.y * 100);
                // Make the start point much bigger and prominent
                c.setAttribute('r', i === 0 ? 2 : 1);
                c.setAttribute('fill', i === 0 ? '#00e04b' : '#ffcc00');
                c.setAttribute('stroke', '#000');
                c.setAttribute('stroke-width', '0.2');
                svg.appendChild(c);
            });
        }
    }

    svg.addEventListener('click', function (e) {
        if (!imgEl.src || imgEl.style.display === 'none') return;
        const pos = getNormalizedPos(e);

        if (state.drawing && state.currentPoints.length >= 3) {
            const first = state.currentPoints[0];
            const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
            if (dist < 0.025) { // Close shape
                const id = 'hs_' + Math.random().toString(36).substr(2, 9);
                state.hotspots.push({ id, points: [...state.currentPoints], label: 'New Room', image360: '' });
                state.currentPoints = [];
                state.drawing = false;
                svg.classList.remove('snap-active');
                saveHotspots(); renderSVG(); renderHotspotList();
                return;
            }
        }
        state.drawing = true;
        state.currentPoints.push(pos);
        renderSVG();
    });

    function renderHotspotList() {
        const ul = $('#fp360-hotspot-items').empty();
        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const li = $(`
                <li class="hs-item" data-id="${hs.id}" style="border:1px solid ${isSelected ? '#2271b1' : '#ddd'}; padding:10px; margin-bottom:5px; background:${isSelected ? '#f0f6fc' : '#fff'};">
                    <input type="text" class="hs-label" data-id="${hs.id}" value="${hs.label}" style="width:100%; margin-bottom:5px;">
                    <div style="display:flex; gap:5px;">
                        <input type="text" class="hs-img360" data-id="${hs.id}" value="${hs.image360}" style="flex:1;">
                        <button type="button" class="button hs-pick-360" data-id="${hs.id}">Pick 360</button>
                    </div>
                    <button type="button" class="button button-link-delete hs-delete" data-id="${hs.id}" style="color:#d63638; padding:0; margin-top:5px;">Delete Room</button>
                </li>
            `);
            ul.append(li);
        });
    }

    $(document).on('click', '.hs-pick-360', function (e) {
        const id = $(this).data('id');
        const frame = wp.media({ title: 'Select 360° Image', multiple: false });
        frame.on('select', function () {
            const url = frame.state().get('selection').first().toJSON().url;
            const hs = state.hotspots.find(h => h.id === id);
            if (hs) { hs.image360 = url; saveHotspots(); }
            renderHotspotList();
        });
        frame.open();
    });

    $(document).on('click', '.hs-delete', function() {
        const id = $(this).data('id');
        if (confirm('Delete this room?')) {
            state.hotspots = state.hotspots.filter(h => h.id !== id);
            saveHotspots(); renderSVG(); renderHotspotList();
        }
    });

    $(document).on('input', '.hs-label, .hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label = $(`.hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.hs-img360[data-id="${id}"]`).val();
            saveHotspots();
        }
    });

    $('#fp360-undo-point').on('click', function() {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) state.drawing = false;
        renderSVG();
    });

    window.addEventListener('resize', renderSVG);
    renderHotspotList();
    renderSVG();

})(jQuery);
