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

    try {
        state.hotspots = JSON.parse($dataField.val() || '[]');
    } catch (e) { state.hotspots = []; }

    function saveHotspots() {
        $dataField.val(JSON.stringify(state.hotspots));
    }

    function generateId() {
        return (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) 
            ? self.crypto.randomUUID() 
            : 'hs_' + Math.random().toString(36).slice(2, 11);
    }

    // --- 1. RENDER LOOP (Performance fix) ---
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
                requestRedraw(); 
                renderHotspotList();
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

    // --- 2. HOTSPOT LIST (XSS Hardening) ---
    function renderHotspotList() {
        const $ul = $('#fp360-hotspot-items').empty();
        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const $li = $('<li>').addClass('hs-item').toggleClass('is-active', isSelected);
            
            const $label = $('<input>', {
                type: 'text',
                class: 'hs-label',
                'data-id': hs.id,
                placeholder: 'Room Label'
            }).val(hs.label);

            const $row = $('<div>').addClass('hs-input-row');
            const $urlInput = $('<input>', {
                type: 'text',
                class: 'hs-img360',
                'data-id': hs.id,
                placeholder: '360 Image URL'
            }).val(hs.image360);

            const $pickBtn = $('<button>', {
                type: 'button',
                class: 'button hs-pick-360',
                'data-id': hs.id,
                text: fp360Admin.i18n.pick360
            });

            const $deleteBtn = $('<button>', {
                type: 'button',
                class: 'button button-link-delete hs-delete',
                'data-id': hs.id,
                text: fp360Admin.i18n.deleteRoom
            });

            $row.append($urlInput, $pickBtn);
            $li.append($label, $row, $deleteBtn);
            $ul.append($li);
        });
    }

    // --- 3. EVENTS ---
    svg.addEventListener('mousemove', function(e) {
        if (!state.drawing) return;
        const rect = svg.getBoundingClientRect();
        state.mousePos = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };

        if (state.currentPoints.length >= 3) {
            const first = state.currentPoints[0];
            const dist = Math.hypot(state.mousePos.x - first.x, state.mousePos.y - first.y);
            svg.classList.toggle('snap-active', dist < 0.025);
        }
        requestRedraw();
    });

    svg.addEventListener('click', function (e) {
        if (!imgEl.src || $emptyState.is(':visible')) return;
        const rect = svg.getBoundingClientRect();
        const pos = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };

        if (state.drawing && state.currentPoints.length >= 3) {
            const first = state.currentPoints[0];
            const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
            if (dist < 0.025) { 
                closeShape();
                return;
            }
        }
        state.drawing = true;
        state.currentPoints.push(pos);
        requestRedraw();
    });

    function closeShape() {
        if (state.currentPoints.length < 3) return;
        state.hotspots.push({ 
            id: generateId(), 
            points: [...state.currentPoints], 
            label: 'New Room', 
            image360: '' 
        });
        state.currentPoints = [];
        state.drawing = false;
        svg.classList.remove('snap-active');
        saveHotspots(); requestRedraw(); renderHotspotList();
    }

    $(document).on('input', '.hs-label, .hs-img360', function() {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label = $(`.hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.hs-img360[data-id="${id}"]`).val();
            saveHotspots();
        }
    });

    $('#fp360_pick_image').on('click', function(e) {
        e.preventDefault();
        const frame = wp.media({ title: 'Select Floorplan', multiple: false });
        frame.on('select', function() {
            const url = frame.state().get('selection').first().toJSON().url;
            $imageUrlInput.val(url);
            imgEl.src = url;
            $(imgEl).show();
            $(svg).show();
            $emptyState.hide();
            requestRedraw();
        });
        frame.open();
    });

    $(document).on('click', '.hs-delete', function() {
        if (confirm(fp360Admin.i18n.deleteRoomConfirm)) {
            const id = $(this).data('id');
            state.hotspots = state.hotspots.filter(h => h.id !== id);
            saveHotspots(); requestRedraw(); renderHotspotList();
        }
    });

    renderHotspotList();
    requestRedraw();

})(jQuery);
