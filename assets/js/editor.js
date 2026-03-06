(function ($) {
    'use strict';

    const $dataField = $('#fp360_hotspots_data');
    const $imageUrlInput = $('#fp360_image_url');
    const svg = document.getElementById('fp360-svg-overlay');
    
    const state = {
        hotspots: [],
        drawing: false,
        currentPoints: [],
        selectedId: null,
    };

    // Initialize State
    try {
        state.hotspots = JSON.parse($dataField.val() || '[]');
    } catch (e) { 
        state.hotspots = []; 
    }

    // --- 1. IMAGE SELECTION LOGIC ---
    $('#fp360_pick_image').on('click', function (e) {
        e.preventDefault();
        
        if (typeof wp === 'undefined' || !wp.media) return;

        const frame = wp.media({
            title: 'Select Floorplan Image',
            button: { text: 'Use this image' },
            multiple: false
        });

        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const url = attachment.url;
            
            // Update the hidden input that PHP saves
            $imageUrlInput.val(url);

            // Update the preview image
            let img = document.getElementById('fp360-floorplan-img');
            if (img) {
                img.src = url;
                img.style.display = 'block'; // Make sure it's visible
            }
            
            // Show the SVG overlay now that we have an image
            if (svg) svg.style.display = 'block';

            // Alert the user they need to save the post to keep changes
            $('#publish, #save-post').addClass('button-primary-disabled');
            console.log('Image updated in UI. Remember to click Save/Update in WordPress.');
        });

        frame.open();
    });

    // Exit if no SVG exists (though we keep it in DOM now)
    if (!svg) return;

    // --- 2. DRAWING & RENDERING ---
    function saveHotspots() {
        $dataField.val(JSON.stringify(state.hotspots));
    }

    function generateId() {
        return 'hs_' + Math.random().toString(36).substr(2, 9);
    }

    function renderSVG() {
        $(svg).empty();
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 2) return;
            const pts = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', pts);
            poly.setAttribute('data-id', hs.id);
            poly.setAttribute('fill', hs.id === state.selectedId ? 'rgba(0,120,255,0.6)' : 'rgba(0,180,100,0.3)');
            poly.setAttribute('stroke', '#fff');
            poly.setAttribute('stroke-width', '0.5');
            poly.setAttribute('vector-effect', 'non-scaling-stroke');

            poly.addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectedId = hs.id;
                renderSVG();
                renderHotspotList();
            });
            svg.appendChild(poly);
        });

        if (state.currentPoints.length > 0) {
            const pts = state.currentPoints.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            line.setAttribute('points', pts);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', '#ffcc00');
            line.setAttribute('stroke-width', '0.8');
            svg.appendChild(line);

            state.currentPoints.forEach((p, i) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p.x * 100); c.setAttribute('cy', p.y * 100);
                c.setAttribute('r', 1.2);
                c.setAttribute('fill', i === 0 ? '#00e04b' : '#ffcc00');
                svg.appendChild(c);
            });
        }
    }

    function closePolygon() {
        if (state.currentPoints.length < 3) return;
        const id = generateId();
        state.hotspots.push({
            id,
            points: [...state.currentPoints],
            label: 'New Room',
            image360: ''
        });
        state.currentPoints = [];
        state.drawing = false;
        state.selectedId = id;
        saveHotspots();
        renderSVG();
        renderHotspotList();
    }

    svg.addEventListener('click', function (e) {
        const rect = svg.getBoundingClientRect();
        const pos = {
            x: parseFloat(((e.clientX - rect.left) / rect.width).toFixed(4)),
            y: parseFloat(((e.clientY - rect.top) / rect.height).toFixed(4))
        };

        if (state.drawing && state.currentPoints.length >= 3) {
            const first = state.currentPoints[0];
            if (Math.hypot(pos.x - first.x, pos.y - first.y) < 0.03) {
                closePolygon();
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

    $(document).on('input', '.hs-label, .hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label = $(`.hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.hs-img360[data-id="${id}"]`).val();
            saveHotspots();
        }
    });

    $('#fp360-delete-selected').on('click', function () {
        if (!state.selectedId || !confirm('Delete this hotspot?')) return;
        state.hotspots = state.hotspots.filter(h => h.id !== state.selectedId);
        state.selectedId = null;
        saveHotspots(); renderSVG(); renderHotspotList();
    });

    $('#fp360-undo-point').on('click', function() {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) state.drawing = false;
        renderSVG();
    });

    // Initial render
    renderSVG();
    renderHotspotList();

})(jQuery);
