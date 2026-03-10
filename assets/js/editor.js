(function ($) {
    'use strict';

    const $dataField = $('#fp360_hotspots_data');
    const $imageUrlInput = $('#fp360_image_url');
    const svg = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');
    const $emptyState = $('#fp360-empty-state');
    
    const state = {
        hotspots: [],
        drawing: false,
        currentPoints: [],
        selectedId: null,
        mousePos: { x: 0, y: 0 },
        needsRedraw: false
    };

    try { state.hotspots = JSON.parse($dataField.val() || '[]'); } catch (e) { state.hotspots = []; }

    function saveHotspots() { $dataField.val(JSON.stringify(state.hotspots)); }

    function generateId() {
        return (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) 
            ? self.crypto.randomUUID() 
            : 'hs_' + Math.random().toString(36).slice(2, 11);
    }

    function requestRedraw() {
        if (!state.needsRedraw) {
            state.needsRedraw = true;
            requestAnimationFrame(renderSVG);
        }
    }

    function renderSVG() {
        state.needsRedraw = false;
        if (!svg) return;
        $(svg).empty();
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 3) return;
            const pts = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', pts);
            poly.setAttribute('class', hs.id === state.selectedId ? 'hs-poly active' : 'hs-poly');
            poly.addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectedId = hs.id;
                requestRedraw(); renderHotspotList();
            });
            svg.appendChild(poly);
        });

        if (state.currentPoints.length > 0) {
            const pointsWithMouse = [...state.currentPoints];
            if (state.drawing) pointsWithMouse.push(state.mousePos);
            const pts = pointsWithMouse.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            line.setAttribute('points', pts);
            line.setAttribute('class', 'drawing-line');
            svg.appendChild(line);

            state.currentPoints.forEach((p, i) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p.x * 100); 
                c.setAttribute('cy', p.y * 100);
                c.setAttribute('r', i === 0 ? 1.5 : 0.8); 
                c.setAttribute('class', i === 0 ? 'node node-first' : 'node');
                svg.appendChild(c);
            });
        }
    }

    function renderHotspotList() {
        const $ul = $('#fp360-hotspot-items').empty();
        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const $li = $('<li>').addClass('hs-item').toggleClass('is-active', isSelected);
            const $label = $('<input>', { type: 'text', class: 'hs-label', 'data-id': hs.id }).val(hs.label);
            const $row = $('<div>').addClass('hs-input-row');
            const $urlInput = $('<input>', { type: 'text', class: 'hs-img360', 'data-id': hs.id }).val(hs.image360);
            const $pickBtn = $('<button>', { type: 'button', class: 'button hs-pick-360', 'data-id': hs.id, text: fp360Admin.i18n.pick360 });
            const $deleteBtn = $('<button>', { type: 'button', class: 'button button-link-delete hs-delete', 'data-id': hs.id, text: fp360Admin.i18n.deleteRoom });
            $row.append($urlInput, $pickBtn);
            $li.append($label, $row, $deleteBtn);
            $ul.append($li);
        });
    }

    // Restore: Undo Handler
    $('#fp360-undo-point').on('click', function() {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) {
            state.drawing = false;
            svg.classList.remove('snap-active');
        }
        requestRedraw();
    });

    // Restore: Pick 360 Media Handler
    $(document).on('click', '.hs-pick-360', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const frame = wp.media({ title: 'Select 360° Image', multiple: false });
        frame.on('select', function() {
            const url = frame.state().get('selection').first().toJSON().url;
            const hs = state.hotspots.find(h => h.id === id);
            if (hs) {
                hs.image360 = url;
                saveHotspots();
                renderHotspotList();
            }
        });
        frame.open();
    });

    // ... rest of SVG logic and click/mousemove listeners from v2 ...
    // (Ensure you include the svg click listener and closeShape function here)

    renderHotspotList();
    requestRedraw();

})(jQuery);
