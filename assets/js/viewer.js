(function () {
    'use strict';

    /**
     * Initializes one independent viewer instance for a given wrapper element.
     * Called once per .fp360-wrap found on the page, so multiple blocks
     * on the same post each get their own isolated state.
     */
    function initViewer(wrap) {
        const svgEl       = wrap.querySelector('.fp360-svg-overlay');
        const imgEl       = wrap.querySelector('.fp360-floorplan-img');
        const frame       = wrap.querySelector('.fp360-viewer-frame');
        const placeholder = wrap.querySelector('.fp360-placeholder');
        const loader      = wrap.querySelector('.fp360-loader');
        const statusEl    = wrap.querySelector('.fp360-status');

        if (!svgEl || !imgEl || !frame) return;

        const i18n          = fp360Config?.i18n || {};
        const allowedOrigin = fp360Config?.origin || '';
        const viewerBaseUrl = (fp360Config?.ajaxUrl || '') + '?action=fp360_viewer';

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

        function loadRoom(hs, poly) {
            if (!hs.image360) {
                setStatus(i18n.noPanoramaAssigned || '');
                return;
            }

            setStatus('');
            svgEl.querySelectorAll('polygon').forEach(p => p.classList.remove('is-active'));
            poly.classList.add('is-active');

            if (placeholder) placeholder.style.display = 'none';
            if (loader) loader.style.display = 'block';

            if (frame.src === '' || frame.src === 'about:blank') {
                frame.style.display = 'block';
                frame.src = viewerBaseUrl + '&img=' + encodeURIComponent(hs.image360);
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

        function renderPolygons() {
            if (imgEl.offsetWidth === 0) {
                imgEl.addEventListener('load', renderPolygons, { once: true });
                return;
            }

            svgEl.setAttribute('viewBox', '0 0 100 100');
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.innerHTML = '';

            hotspots.forEach(hs => {
                if (!hs.points || hs.points.length < 3) return;

                const ptsString = hs.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
                const poly      = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

                poly.setAttribute('points', ptsString);
                poly.setAttribute('tabindex', '0');
                poly.setAttribute('role', 'button');
                poly.setAttribute('aria-label', hs.label || i18n.viewRoom || '');

                // Store the room colour as a CSS custom property so viewer.css
                // can tint fill, hover and active states per room.
                if (hs.color) {
                    poly.style.setProperty('--fp360-room-color', hs.color);
                }

                poly.addEventListener('click', () => loadRoom(hs, poly));
                poly.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadRoom(hs, poly);
                    }
                });

                svgEl.appendChild(poly);
            });
        }

        window.addEventListener('load', renderPolygons);
    }

    document.querySelectorAll('.fp360-wrap').forEach(initViewer);

})();