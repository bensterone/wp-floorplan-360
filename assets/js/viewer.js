(function () {
    'use strict';

    const svgEl = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');
    const frame = document.getElementById('fp360-viewer-frame');
    const placeholder = document.getElementById('fp360-placeholder');

    if (!svgEl || !imgEl || !frame) return;

    let hotspots = [];
    let isIframeReady = false;
    let pendingImage = null;

    try {
        hotspots = JSON.parse(svgEl.dataset.hotspots || '[]');
    } catch (e) { console.error(e); }

    const viewerBaseUrl = fp360Config.ajaxUrl + '?action=fp360_viewer';

    // Listen for the "READY" signal from the iframe
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'FP360_VIEWER_READY') {
            isIframeReady = true;
            if (pendingImage) {
                frame.contentWindow.postMessage({ type: 'FP360_LOAD_IMAGE', url: pendingImage }, '*');
                pendingImage = null;
            }
        }
    });

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

            poly.addEventListener('click', () => {
                document.querySelectorAll('#fp360-svg-overlay polygon').forEach(p => p.classList.remove('is-active'));
                poly.classList.add('is-active');
                
                if (placeholder) placeholder.style.display = 'none';

                if (frame.src === '' || frame.src === 'about:blank') {
                    // First load: Use URL parameters
                    frame.style.display = 'block';
                    frame.src = viewerBaseUrl + '&img=' + encodeURIComponent(hs.image360) + '&title=' + encodeURIComponent(hs.label);
                } else {
                    // Subsequent loads: Use postMessage
                    if (isIframeReady) {
                        frame.contentWindow.postMessage({ type: 'FP360_LOAD_IMAGE', url: hs.image360 }, '*');
                    } else {
                        pendingImage = hs.image360;
                    }
                }
            });

            svgEl.appendChild(poly);
        });
    }

    window.addEventListener('load', renderPolygons);
    window.addEventListener('resize', renderPolygons);
})();
