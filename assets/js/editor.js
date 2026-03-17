(function ($) {
    'use strict';

    // --- 1. CONSTANTS & STATE ---

    // Palette of 12 distinct, accessible colours for room polygons.
    // Assigned automatically in the order rooms are drawn.
    const COLORS = [
        '#4fa8e8', // blue
        '#e8734f', // orange
        '#4fe87a', // green
        '#e84f9a', // pink
        '#a84fe8', // purple
        '#e8d94f', // yellow
        '#4fe8d9', // teal
        '#e84f4f', // red
        '#8ae84f', // lime
        '#4f6ae8', // indigo
        '#e8a84f', // amber
        '#4fe8c0', // mint
    ];

    const SNAP_DISTANCE = 0.025; // normalised units — distance to snap-close a polygon

    const $dataField    = $('#fp360_hotspots_data');
    const $imageUrlInput = $('#fp360_image_url');
    const svg           = document.getElementById('fp360-svg-overlay');
    const imgEl         = document.getElementById('fp360-floorplan-img');
    const $emptyState   = $('#fp360-empty-state');

    const state = {
        hotspots:      [],
        drawing:       false,
        currentPoints: [],
        selectedId:    null,
        mousePos:      { x: 0, y: 0 },
        needsRedraw:   false
    };

    // Load initial hotspot data saved in the hidden field
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
        // Fallback for older browsers
        return 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    /**
     * Returns the colour for a new hotspot.
     * Cycles through the palette based on how many hotspots already exist.
     */
    function nextColor() {
        return COLORS[ state.hotspots.length % COLORS.length ];
    }

    /**
     * Throttles SVG rendering to the browser's refresh rate (60fps max).
     */
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

    /**
     * Returns the centroid (visual centre) of a polygon's normalised points.
     * Used to position the room label inside the shape.
     */
    function getCentroid(points) {
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return { x, y };
    }

    // --- 3. RENDERING ---

    function renderSVG() {
        state.needsRedraw = false;
        if (!svg) return;

        // Clear all existing SVG children
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');

        // Render each saved hotspot
        state.hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 3) return;

            const color      = hs.color || COLORS[0];
            const isSelected = hs.id === state.selectedId;

            const pts  = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

            poly.setAttribute('points', pts);

            // Use the hotspot's own colour for fill and stroke.
            // Selected polygon is fully opaque; others are semi-transparent.
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
                // Scroll the corresponding list item into view
                document.querySelector('.hs-item.is-active')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });

            svg.appendChild(poly);

            // Room label — shown in the centre of each completed polygon.
            // White text with a dark outline so it's legible on any colour.
            if (hs.label) {
                const center = getCentroid(hs.points);
                const text   = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x',              center.x * 100);
                text.setAttribute('y',              center.y * 100);
                text.setAttribute('text-anchor',    'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('font-size',      '3');
                text.setAttribute('font-weight',    'bold');
                text.setAttribute('fill',           '#ffffff');
                text.setAttribute('stroke',         '#000000');
                text.setAttribute('stroke-width',   '0.5');
                text.setAttribute('paint-order',    'stroke');
                text.setAttribute('pointer-events', 'none'); // clicks pass through to polygon
                text.textContent = hs.label;
                svg.appendChild(text);
            }
        });

        // Render the polygon currently being drawn
        if (state.currentPoints.length > 0) {
            const pointsWithMouse = [...state.currentPoints];
            if (state.drawing) {
                pointsWithMouse.push(state.mousePos);
            }

            const pts  = pointsWithMouse.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            line.setAttribute('points', pts);
            line.setAttribute('class',  'drawing-line');
            svg.appendChild(line);

            // Draw click nodes — first node is larger and pulses to invite closing
            state.currentPoints.forEach((p, i) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p.x * 100);
                c.setAttribute('cy', p.y * 100);
                c.setAttribute('r',  i === 0 ? 1.5 : 0.8);
                c.setAttribute('class', i === 0 ? 'node node-first' : 'node');
                svg.appendChild(c);
            });
        }
    }

    /**
     * Renders the room list in the sidebar.
     * Uses jQuery DOM creation throughout to prevent XSS.
     */
    function renderHotspotList() {
        const $ul = $('#fp360-hotspot-items').empty();

        state.hotspots.forEach(hs => {
            const isSelected = hs.id === state.selectedId;
            const color      = hs.color || COLORS[0];

            const $li = $('<li>').addClass('hs-item').toggleClass('is-active', isSelected);

            // Apply the room colour as a CSS variable so the left border accent matches
            $li[0].style.setProperty('--hs-color', color);

            // Colour swatch dot
            const $swatch = $('<span>').addClass('hs-color-swatch').css('background-color', color);

            const $label = $('<input>', {
                type:        'text',
                class:       'hs-label',
                'data-id':   hs.id,
                placeholder: fp360Admin.i18n.roomLabel || 'Room Label'
            }).val(hs.label);

            const $row = $('<div>').addClass('hs-input-row');

            const $urlInput = $('<input>', {
                type:        'text',
                class:       'hs-img360',
                'data-id':   hs.id,
                placeholder: '360 Image URL'
            }).val(hs.image360);

            const $pickBtn = $('<button>', {
                type:  'button',
                class: 'button hs-pick-360',
                'data-id': hs.id,
                text:  fp360Admin.i18n.pick360
            });

            const $deleteBtn = $('<button>', {
                type:  'button',
                class: 'button button-link-delete hs-delete',
                'data-id': hs.id,
                text:  fp360Admin.i18n.deleteRoom
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
            color:    nextColor()  // assign colour from palette at creation time
        });

        state.currentPoints = [];
        state.drawing = false;
        if (svg) svg.classList.remove('snap-active');

        saveHotspots();
        renderHotspotList();
        requestRedraw();
    }

    // --- 5. EVENT LISTENERS ---

    // Floorplan image selection via WP media library
    $('#fp360_pick_image').on('click', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) return;

        const frame = wp.media({ title: 'Select Floorplan', multiple: false });
        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const url = attachment.url;

            $imageUrlInput.val(url);
            if (imgEl) {
                imgEl.src = url;
                $(imgEl).show();
            }
            if (svg) $(svg).show();
            if ($emptyState) $emptyState.hide();

            requestRedraw();
        });
        frame.open();
    });

    if (svg) {
        // Mouse move — update rubber-band line and snap feedback while drawing
        svg.addEventListener('mousemove', function (e) {
            if (!state.drawing) return;

            state.mousePos = getNormalizedPos(e);

            if (state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                const dist  = Math.hypot(
                    state.mousePos.x - first.x,
                    state.mousePos.y - first.y
                );
                svg.classList.toggle('snap-active', dist < SNAP_DISTANCE);
            }

            requestRedraw();
        });

        // Click — add a point, or close the shape if near the first point
        svg.addEventListener('click', function (e) {
            if (!imgEl.src || $emptyState.is(':visible')) return;

            const pos = getNormalizedPos(e);

            if (state.drawing && state.currentPoints.length >= 3) {
                const first = state.currentPoints[0];
                const dist  = Math.hypot(pos.x - first.x, pos.y - first.y);
                if (dist < SNAP_DISTANCE) {
                    closeShape();
                    return;
                }
            }

            state.drawing = true;
            state.currentPoints.push(pos);
            requestRedraw();
        });

        // Double-click — fast-close the current shape
        svg.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (state.drawing && state.currentPoints.length >= 3) {
                closeShape();
            }
        });
    }

    // Undo last drawn point
    $('#fp360-undo-point').on('click', function () {
        state.currentPoints.pop();
        if (state.currentPoints.length === 0) {
            state.drawing = false;
            if (svg) svg.classList.remove('snap-active');
        }
        requestRedraw();
    });

    // Pick 360° image via WP media library (delegated — works on dynamically rendered items)
    $(document).on('click', '.hs-pick-360', function (e) {
        e.preventDefault();
        const id    = $(this).data('id');
        const frame = wp.media({ title: 'Select 360° Image', multiple: false });

        frame.on('select', function () {
            const attachment = frame.state().get('selection').first().toJSON();
            const hs = state.hotspots.find(h => h.id === id);
            if (hs) {
                hs.image360 = attachment.url;
                saveHotspots();
                renderHotspotList();
            }
        });
        frame.open();
    });

    // Delete a room (delegated)
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

    // Keep hotspot data in sync as the user types in label / URL fields (delegated)
    $(document).on('input', '.hs-label, .hs-img360', function () {
        const id = $(this).data('id');
        const hs = state.hotspots.find(h => h.id === id);
        if (hs) {
            hs.label    = $(`.hs-label[data-id="${id}"]`).val();
            hs.image360 = $(`.hs-img360[data-id="${id}"]`).val();
            saveHotspots();
            // Re-render SVG so the label text updates in real time
            requestRedraw();
        }
    });

    // Redraw on window resize (image may have reflowed)
    window.addEventListener('resize', requestRedraw);

    // Initial render
    renderHotspotList();
    requestRedraw();

})(jQuery);