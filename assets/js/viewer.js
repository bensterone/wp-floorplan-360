(function () {
    'use strict';

    const svgEl = document.getElementById('fp360-svg-overlay');
    const imgEl = document.getElementById('fp360-floorplan-img');
    const frame = document.getElementById('fp360-viewer-frame');

    if (!svgEl || !imgEl || !frame) return;

    let hotspots = [];
    try {
        hotspots = JSON.parse(svgEl.dataset.hotspots || '[]');
    } catch (e) { console.error(e); }

    const viewerUrl = fp360Config.ajaxUrl + '?action=fp360_viewer';

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
            // No need to set fill/stroke here, CSS handles the default now.

            poly.addEventListener('click', () => {
                // 1. Clear active class from all
                document.querySelectorAll('#fp360-svg-overlay polygon').forEach(p => {
                    p.classList.remove('is-active');
                });

                // 2. Add active class to clicked
                poly.classList.add('is-active');
                
                // 3. Load the 360 image
                if (frame.src === '' || frame.src === 'about:blank') {
                    frame.style.display = 'block';
                    frame.src = viewerUrl + '&img=' + encodeURIComponent(hs.image360);
                } else {
                    frame.contentWindow.postMessage({ type: 'FP360_LOAD_IMAGE', url: hs.image360 }, '*');
                }
                
                document.getElementById('fp360-placeholder').style.display = 'none';
            });

            svgEl.appendChild(poly);
        });
    }

    // Initial check and listeners
    window.addEventListener('load', renderPolygons);
    window.addEventListener('resize', renderPolygons);
})();
