(function () {
    'use strict';

    const svgEl = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');
    const frame = document.getElementById('fp360-viewer-frame');
    const placeholder = document.getElementById('fp360-placeholder');
    const loader = document.getElementById('fp360-loader');
    const statusEl = document.getElementById('fp360-status');

    if (!svgEl || !imgEl || !frame) return;

    const allowedOrigin = fp360Config.origin;
    let hotspots = [];
    let isIframeReady = false;
    let pendingImage = null;

    try {
        hotspots = JSON.parse(svgEl.dataset.hotspots || '[]');
    } catch (e) {
        console.error('FP360: Error parsing hotspots', e);
    }

    const viewerBaseUrl = fp360Config.ajaxUrl + '?action=fp360_viewer';

    /**
     * Updates the UI status message instead of using blocking alerts.
     */
    function setStatus(message) {
        if (statusEl) {
            statusEl.textContent = message || '';
        }
    }

    window.addEventListener('message', function (event) {
        if (event.origin !== allowedOrigin) return;
        if (!event.data || !event.data.type) return;

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
            setStatus(''); // Clear any previous errors
            return;
        }

        if (event.data.type === 'FP360_IMAGE_ERROR') {
            if (loader) loader.style.display = 'none';
            // Fixed: Using i18n string from config
            setStatus(fp360Config.i18n.viewerLoadError);
        }
    });

    function loadRoom(hs, poly) {
        if (!hs.image360) {
            // Fixed: Using i18n string from config
            setStatus(fp360Config.i18n.noPanoramaAssigned);
            return;
        }

        // Reset UI state
        setStatus('');
        document.querySelectorAll('#fp360-svg-overlay polygon').forEach(p => p.classList.remove('is-active'));
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
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', ptsString);
            
            // Fixed: Accessibility using i18n strings
            poly.setAttribute('tabindex', '0');
            poly.setAttribute('role', 'button');
            poly.setAttribute('aria-label', hs.label || fp360Config.i18n.viewRoom);

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

    // Initial load
    window.addEventListener('load', renderPolygons);
    
    // Note: Resize listener is intentionally removed. 
    // SVG ViewBox preserves aspect-relative mapping automatically.
})();
