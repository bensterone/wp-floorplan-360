(function () {
    'use strict';

    /**
     * Initializes one independent viewer instance for a given wrapper element.
     * Called once per .fp360-wrap found on the page, so multiple blocks
     * on the same post each get their own isolated state.
     */
    function initViewer(wrap) {
        const svgEl       = wrap.querySelector('.fp360-svg-overlay');
        const frame       = wrap.querySelector('.fp360-viewer-frame');
        const placeholder = wrap.querySelector('.fp360-placeholder');
        const loader      = wrap.querySelector('.fp360-loader');
        const statusEl    = wrap.querySelector('.fp360-status');
        const roomListEl  = wrap.querySelector('.fp360-room-list');
        const rightEl     = wrap.querySelector('.fp360-right, #fp360-right');

        // bgEl: the element whose layout tells us the floorplan dimensions.
        // May be a raster <img> (legacy) or the DXF SVG background <div>.
        const bgEl = wrap.querySelector('.fp360-floorplan-img') ||
                     wrap.querySelector('.fp360-floorplan-bg--svg');

        if (!svgEl || !frame) return;

        const i18n          = fp360Config?.i18n || {};
        const allowedOrigin = fp360Config?.origin || '';
        const viewerBaseUrl = (fp360Config?.ajaxUrl || '') + '?action=fp360_viewer';

        const autoRotate     = wrap.dataset.autoRotate === '1';
        const highlightColor = wrap.dataset.highlight || null;
        const startAngle     = wrap.dataset.startAngle || '0';

        if (highlightColor && svgEl) {
            svgEl.style.setProperty('--fp360-active-color', highlightColor);
        }

        let hotspots      = [];
        let isIframeReady = false;
        let pendingImage  = null;

        try {
            hotspots = JSON.parse(svgEl.dataset.hotspots || '[]');
        } catch (e) {
            console.error('FP360: Error parsing hotspots', e);
        }

        function setStatus(message) {
            if (statusEl) statusEl.textContent = message || '';
        }

        // ---------------------------------------------------------------
        // postMessage channel with the A-Frame iframe
        // ---------------------------------------------------------------

        window.addEventListener('message', function (event) {
            if (event.origin !== allowedOrigin) return;
            if (!event.data || !event.data.type) return;
            if (event.source !== frame.contentWindow) return;

            if (event.data.type === 'FP360_VIEWER_READY') {
                isIframeReady = true;
                if (pendingImage) {
                    frame.contentWindow.postMessage(
                        { type: 'FP360_LOAD_IMAGE', url: pendingImage },
                        allowedOrigin
                    );
                    pendingImage = null;
                } else {
                    if (loader) loader.style.display = 'none';
                }
                return;
            }

            if (event.data.type === 'FP360_IMAGE_LOADED') {
                if (loader) loader.style.display = 'none';
                setStatus('');
                return;
            }

            if (event.data.type === 'FP360_IMAGE_ERROR') {
                if (loader) loader.style.display = 'none';
                setStatus(i18n.viewerLoadError || '');
            }
        });

        // ---------------------------------------------------------------
        // Room selection
        // ---------------------------------------------------------------

        function loadRoom(hs, poly) {
            if (!hs.image360) {
                setStatus(i18n.noPanoramaAssigned || '');
                return;
            }

            setStatus('');
            svgEl.querySelectorAll('polygon').forEach(p => p.classList.remove('is-active'));
            poly.classList.add('is-active');

            if (roomListEl) {
                roomListEl.querySelectorAll('.fp360-room-btn').forEach(b => b.classList.remove('is-active'));
                const activeBtn = roomListEl.querySelector(`.fp360-room-btn[data-id="${hs.id}"]`);
                if (activeBtn) activeBtn.classList.add('is-active');
            }

            if (placeholder) placeholder.style.display = 'none';
            if (loader)      loader.style.display = 'block';

            // Reveal the fullscreen button once the first room is selected.
            if (fullscreenBtn) fullscreenBtn.style.display = 'flex';

            if (frame.src === '' || frame.src === 'about:blank') {
                frame.style.display = 'block';
                let src = viewerBaseUrl + '&img=' + encodeURIComponent(hs.image360);
                if (autoRotate)                   src += '&autorotate=1';
                if (startAngle && startAngle !== '0') src += '&angle=' + encodeURIComponent(startAngle);
                frame.src = src;
            } else {
                if (isIframeReady) {
                    frame.contentWindow.postMessage(
                        { type: 'FP360_LOAD_IMAGE', url: hs.image360 },
                        allowedOrigin
                    );
                } else {
                    pendingImage = hs.image360;
                }
            }
        }

        // ---------------------------------------------------------------
        // Fullscreen support
        // ---------------------------------------------------------------

        let isFakeFullscreen = false;

        /** Detect whether a real-API fullscreen is active on rightEl. */
        function isRealFullscreen() {
            return (document.fullscreenElement === rightEl) ||
                   (document.webkitFullscreenElement === rightEl);
        }

        /** True whenever the viewer is showing as fullscreen (real or fake). */
        function isFullscreen() {
            return isRealFullscreen() || isFakeFullscreen;
        }

        function enterFakeFullscreen() {
            isFakeFullscreen = true;
            rightEl.classList.add('fp360-fake-fullscreen');
            document.body.classList.add('fp360-body-fullscreen');
            onFullscreenChange();
        }

        function exitFakeFullscreen() {
            isFakeFullscreen = false;
            rightEl.classList.remove('fp360-fake-fullscreen');
            document.body.classList.remove('fp360-body-fullscreen');
            onFullscreenChange();
        }

        function enterFullscreen() {
            if (!rightEl) return;
            if (rightEl.requestFullscreen) {
                rightEl.requestFullscreen().catch(() => enterFakeFullscreen());
            } else if (rightEl.webkitRequestFullscreen) {
                // Safari desktop
                rightEl.webkitRequestFullscreen();
            } else {
                // iOS Safari — Fullscreen API not available for non-video elements
                enterFakeFullscreen();
            }
        }

        function exitFullscreen() {
            if (isFakeFullscreen) {
                exitFakeFullscreen();
                return;
            }
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }

        /** Called whenever fullscreen state changes (real or fake). */
        function onFullscreenChange() {
            const fs = isFullscreen();
            if (backBtn)       backBtn.style.display      = fs ? 'flex' : 'none';
            if (fullscreenBtn) {
                const expandEl   = fullscreenBtn.querySelector('.fp360-icon-expand');
                const compressEl = fullscreenBtn.querySelector('.fp360-icon-compress');
                if (expandEl)   expandEl.style.display   = fs ? 'none'  : 'inline';
                if (compressEl) compressEl.style.display = fs ? 'inline' : 'none';
                fullscreenBtn.setAttribute('aria-label', fs
                    ? (i18n.exitFullscreen  || 'Exit fullscreen')
                    : (i18n.enterFullscreen || 'Enter fullscreen')
                );
                fullscreenBtn.setAttribute('aria-pressed', String(fs));
            }
        }

        // Listen for browser-native fullscreen change (e.g. user presses Escape)
        document.addEventListener('fullscreenchange',       onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);

        // Escape key exits fake fullscreen
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isFakeFullscreen) exitFakeFullscreen();
        });

        // ---------------------------------------------------------------
        // Build fullscreen + back buttons
        // ---------------------------------------------------------------

        let fullscreenBtn = null;
        let backBtn       = null;

        if (rightEl) {
            // --- Fullscreen button (top-right) ---
            fullscreenBtn = document.createElement('button');
            fullscreenBtn.className  = 'fp360-fullscreen-btn';
            fullscreenBtn.type       = 'button';
            fullscreenBtn.setAttribute('aria-label',  i18n.enterFullscreen || 'Enter fullscreen');
            fullscreenBtn.setAttribute('aria-pressed', 'false');
            fullscreenBtn.style.display = 'none'; // shown after first room load

            // Expand icon (arrows pointing outward)
            const expandIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            expandIcon.setAttribute('class',       'fp360-icon-expand');
            expandIcon.setAttribute('width',       '16');
            expandIcon.setAttribute('height',      '16');
            expandIcon.setAttribute('viewBox',     '0 0 24 24');
            expandIcon.setAttribute('fill',        'none');
            expandIcon.setAttribute('stroke',      'currentColor');
            expandIcon.setAttribute('stroke-width','2');
            expandIcon.setAttribute('stroke-linecap', 'round');
            expandIcon.setAttribute('stroke-linejoin', 'round');
            expandIcon.setAttribute('aria-hidden', 'true');
            expandIcon.innerHTML =
                '<polyline points="15 3 21 3 21 9"/>' +
                '<polyline points="9 21 3 21 3 15"/>' +
                '<line x1="21" y1="3" x2="14" y2="10"/>' +
                '<line x1="3"  y1="21" x2="10" y2="14"/>';

            // Compress icon (arrows pointing inward) — shown in fullscreen
            const compressIcon = expandIcon.cloneNode(true);
            compressIcon.setAttribute('class', 'fp360-icon-compress');
            compressIcon.style.display = 'none';
            compressIcon.innerHTML =
                '<polyline points="4 14 10 14 10 20"/>' +
                '<polyline points="20 10 14 10 14 4"/>' +
                '<line x1="10" y1="14" x2="3"  y2="21"/>' +
                '<line x1="21" y1="3"  x2="14" y2="10"/>';

            fullscreenBtn.appendChild(expandIcon);
            fullscreenBtn.appendChild(compressIcon);
            rightEl.appendChild(fullscreenBtn);

            fullscreenBtn.addEventListener('click', function () {
                isFullscreen() ? exitFullscreen() : enterFullscreen();
            });

            // --- Back button (top-left, fullscreen only) ---
            backBtn = document.createElement('button');
            backBtn.className  = 'fp360-back-btn';
            backBtn.type       = 'button';
            backBtn.setAttribute('aria-label', i18n.back || 'Back');
            backBtn.style.display = 'none'; // shown only in fullscreen

            const backArrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            backArrow.setAttribute('width',        '16');
            backArrow.setAttribute('height',       '16');
            backArrow.setAttribute('viewBox',      '0 0 24 24');
            backArrow.setAttribute('fill',         'none');
            backArrow.setAttribute('stroke',       'currentColor');
            backArrow.setAttribute('stroke-width', '2.5');
            backArrow.setAttribute('stroke-linecap',  'round');
            backArrow.setAttribute('stroke-linejoin', 'round');
            backArrow.setAttribute('aria-hidden',  'true');
            backArrow.innerHTML = '<polyline points="15 18 9 12 15 6"/>';

            const backLabel = document.createElement('span');
            backLabel.textContent = i18n.back || 'Back';

            backBtn.appendChild(backArrow);
            backBtn.appendChild(backLabel);
            rightEl.appendChild(backBtn);

            backBtn.addEventListener('click', exitFullscreen);
        }

        // ---------------------------------------------------------------
        // Polygon rendering
        // ---------------------------------------------------------------

        function renderPolygons() {
            // Wait until the background element has rendered dimensions.
            // raster <img>: fire on load if width is still 0.
            // DXF SVG <div> or no bgEl: retry on next frame.
            const bgWidth = bgEl ? bgEl.offsetWidth : (svgEl ? svgEl.offsetWidth : 0);
            if (bgWidth === 0) {
                if (bgEl && bgEl.tagName === 'IMG') {
                    bgEl.addEventListener('load', renderPolygons, { once: true });
                } else {
                    requestAnimationFrame(renderPolygons);
                }
                return;
            }

            svgEl.setAttribute('viewBox', '0 0 100 100');
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.innerHTML = '';

            hotspots.forEach(hs => {
                if (!hs.points || hs.points.length < 3) return;

                const ptsString = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
                const poly      = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

                poly.setAttribute('points',    ptsString);
                poly.setAttribute('data-id',   hs.id);
                poly.setAttribute('tabindex',  '0');
                poly.setAttribute('role',      'button');
                poly.setAttribute('aria-label', hs.label || i18n.viewRoom || '');

                if (hs.color) {
                    poly.style.setProperty('--fp360-room-color', hs.color);
                }

                poly.addEventListener('click',   () => loadRoom(hs, poly));
                poly.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadRoom(hs, poly);
                    }
                });

                svgEl.appendChild(poly);
            });
        }

        // ---------------------------------------------------------------
        // Mobile room list
        // ---------------------------------------------------------------

        /**
         * Builds the mobile room list — one button per hotspot.
         * Only visible below the responsive breakpoint (see viewer.css).
         */
        function renderRoomList() {
            if (!roomListEl) return;

            while (roomListEl.firstChild) {
                roomListEl.removeChild(roomListEl.firstChild);
            }

            hotspots.forEach(hs => {
                if (!hs.points || hs.points.length < 3) return;

                const btn = document.createElement('button');
                btn.className = 'fp360-room-btn';
                btn.setAttribute('type', 'button');
                btn.setAttribute('data-id', hs.id);

                const dot = document.createElement('span');
                dot.className = 'fp360-room-btn__dot';
                if (hs.color) dot.style.backgroundColor = hs.color;

                const label = document.createElement('span');
                label.className   = 'fp360-room-btn__label';
                label.textContent = hs.label || '';

                btn.appendChild(dot);
                btn.appendChild(label);

                btn.addEventListener('click', () => {
                    // Look up by id: polys[i] can drift from hotspots[i] if any
                    // hotspot is skipped in renderPolygons (< 3 points).
                    const poly = svgEl.querySelector(`polygon[data-id="${hs.id}"]`);
                    if (poly) loadRoom(hs, poly);
                });

                roomListEl.appendChild(btn);
            });
        }

        window.addEventListener('load', () => {
            renderPolygons();
            renderRoomList();
        });
    }

    document.querySelectorAll('.fp360-wrap').forEach(initViewer);

})();
