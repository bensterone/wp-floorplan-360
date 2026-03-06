(function () {
    'use strict';

    // Elements
    const svgEl       = document.getElementById('fp360-svg-overlay');
    const imgEl       = document.getElementById('fp360-floorplan-img');
    const frame       = document.getElementById('fp360-viewer-frame');
    const placeholder = document.getElementById('fp360-placeholder');
    const loader      = document.getElementById('fp360-loader');

    // Check availability
    if (!svgEl || !imgEl || !frame) {
        return;
    }

    // Config injected via wp_localize_script
    // fp360Config.ajaxUrl

    let hotspots = [];
    try {
        hotspots = JSON.parse(svgEl.dataset.hotspots || '[]');
    } catch (e) {
        console.error('FP360: Failed to parse hotspots JSON', e);
    }

    // We removed the nonce requirement for the viewer as it's public read-only content
    const viewerUrl = fp360Config.ajaxUrl + '?action=fp360_viewer';

    let iframeReady   = false;
    let iframeQueue   = null;
    let activePolygon = null;

    /**
     * Draw the polygons on the SVG overlay
     */
    function renderPolygons() {
        if (imgEl.offsetWidth === 0) return; // Image not visible/loaded yet

        svgEl.setAttribute('viewBox', '0 0 100 100');
        svgEl.setAttribute('preserveAspectRatio', 'none');
        svgEl.innerHTML = '';

        hotspots.forEach(hs => {
            if (!hs.points || hs.points.length < 3) return;

            // Normalize points if they seem to be absolute pixels (legacy support)
            let points = hs.points;
            if (hs.points[0].x > 1 || hs.points[0].y > 1) {
                const w = imgEl.naturalWidth  || imgEl.offsetWidth  || 1;
                const h = imgEl.naturalHeight || imgEl.offsetHeight || 1;
                points = hs.points.map(p => ({
                    x: +(p.x / w).toFixed(4),
                    y: +(p.y / h).toFixed(4)
                }));
            }

            const ptsString = points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', ptsString);
            
            // Default styling: transparent but clickable
            poly.setAttribute('fill',   'rgba(255,255,255,0.01)'); 
            poly.setAttribute('stroke', 'rgba(255,255,255,0.0)');
            poly.setAttribute('stroke-width', '0.5');
            poly.setAttribute('vector-effect', 'non-scaling-stroke');
            
            // Accessibility
            poly.setAttribute('role', 'button');
            poly.setAttribute('tabindex', '0');
            poly.setAttribute('aria-label', hs.label || 'View Room');

            const openRoom = () => {
                setActivePolygon(poly);
                loadRoom(hs.image360);
            };

            // Event Listeners
            poly.addEventListener('click', openRoom);
            poly.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openRoom();
                }
            });

            // Hover effects (only if not currently active)
            poly.addEventListener('mouseenter', () => {
                if (activePolygon !== poly) {
                    poly.setAttribute('fill', 'rgba(0,180,100,0.3)');
                    poly.setAttribute('stroke', 'rgba(255,255,255,0.8)');
                }
            });
            poly.addEventListener('mouseleave', () => {
                if (activePolygon !== poly) {
                    poly.setAttribute('fill', 'rgba(255,255,255,0.01)');
                    poly.setAttribute('stroke', 'rgba(255,255,255,0.0)');
                }
            });

            svgEl.appendChild(poly);
        });
    }

    /**
     * Manages visual state of selected polygon
     */
    function setActivePolygon(poly) {
        // Reset previous active polygon
        if (activePolygon) {
            activePolygon.setAttribute('fill', 'rgba(255,255,255,0.01)');
            activePolygon.setAttribute('stroke', 'rgba(255,255,255,0.0)');
        }
        
        activePolygon = poly;

        // Highlight new active polygon (Blue)
        if (activePolygon) {
            activePolygon.setAttribute('fill', 'rgba(0,120,255,0.4)');
            activePolygon.setAttribute('stroke', '#fff');
        }
    }

    /**
     * Load the 360 viewer logic
     */
    function loadRoom(image360url) {
        if (!image360url) return;

        // Case 1: First load (Iframe is empty)
        if (frame.src === '' || frame.src === 'about:blank' || frame.style.display === 'none') {
            initIframe(image360url);
        } 
        // Case 2: Iframe is currently loading
        else if (!iframeReady) {
            iframeQueue = image360url;
        } 
        // Case 3: Iframe is ready, just swap image via postMessage
        else {
            sendImageToIframe(image360url);
        }
    }

    function initIframe(initialImageUrl) {
        iframeReady = false;
        frame.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (loader) loader.style.display = 'block';

        // Load viewer with initial image via query param
        frame.src = viewerUrl + '&img=' + encodeURIComponent(initialImageUrl);

        frame.addEventListener('load', function onLoad() {
            iframeReady = true;
            if (loader) loader.style.display = 'none';
            frame.removeEventListener('load', onLoad);

            // If user clicked another room while iframe was loading
            if (iframeQueue) {
                sendImageToIframe(iframeQueue);
                iframeQueue = null;
            }
        });
    }

    function sendImageToIframe(imageUrl) {
        if (!frame.contentWindow) return;

        if (loader) loader.style.display = 'block';
        
        // Use postMessage for Cross-Origin safety
        frame.contentWindow.postMessage({
            type: 'FP360_LOAD_IMAGE',
            url: imageUrl
        }, '*');

        // Hide loader after a short delay to allow visual transition, 
        // or listen for a message back from iframe if you want to be precise.
        setTimeout(() => {
            if (loader) loader.style.display = 'none';
        }, 500);
    }

    // Init on load and resize
    window.addEventListener('load', renderPolygons);
    window.addEventListener('resize', () => {
        // Re-render to ensure SVG viewBox scaling matches image
        svgEl.innerHTML = '';
        renderPolygons();
    });

})();