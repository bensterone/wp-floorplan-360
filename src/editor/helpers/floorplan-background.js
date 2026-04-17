/**
 * helpers/floorplan-background.js
 * Sets the floorplan background in the editor canvas container:
 * either an inline SVG (vector mode) or a raster <img> (legacy mode).
 *
 * The polygon overlay SVG (#fp360-svg-overlay) is never touched here.
 * It stays visible regardless of background mode.
 */

import DOMPurify from 'dompurify';

/**
 * Switch the editor canvas between vector (SVG) and raster (img) background.
 *
 * @param {HTMLElement} container  The #fp360-canvas-container element.
 * @param {{ svgMarkup?: string, imageUrl?: string }} options
 *   Pass svgMarkup to activate vector mode.
 *   Pass imageUrl to activate raster mode.
 */
export function setFloorplanBackground(container, { svgMarkup, imageUrl } = {}) {
    if (!container) return;

    const imgEl          = container.querySelector('#fp360-floorplan-img');
    const overlayEl      = container.querySelector('#fp360-svg-overlay');
    const emptyStateEl   = container.querySelector('#fp360-empty-state');
    let   bgEl           = container.querySelector('#fp360-svg-background');

    if (svgMarkup) {
        // --- Vector mode ---
        // Also remove the raster src: hiding via display:none leaves
        // naturalWidth intact, which fools the rectangle tool's wall-snap
        // path into running against the now-invisible raster instead of
        // falling back to plain commit for vector floorplans.
        if (imgEl) {
            imgEl.style.display = 'none';
            imgEl.removeAttribute('src');
        }
        if (emptyStateEl) emptyStateEl.style.display = 'none';
        if (overlayEl)    overlayEl.style.display = 'block';

        if (!bgEl) {
            bgEl = document.createElement('div');
            bgEl.id = 'fp360-svg-background';
            bgEl.style.cssText = 'width:100%;pointer-events:none;display:block;line-height:0;';
            // Insert before the overlay so it sits behind the polygon layer
            if (overlayEl) {
                container.insertBefore(bgEl, overlayEl);
            } else {
                container.appendChild(bgEl);
            }
        }

        bgEl.innerHTML = DOMPurify.sanitize(svgMarkup, {
            USE_PROFILES: { svg: true, svgFilters: false },
            ADD_TAGS: ['use'],
            FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
        });
        bgEl.style.display = 'block';

    } else if (imageUrl) {
        // --- Raster mode ---
        if (bgEl)         bgEl.style.display = 'none';
        if (emptyStateEl) emptyStateEl.style.display = 'none';
        if (overlayEl)    overlayEl.style.display = 'block';

        if (imgEl) {
            imgEl.src           = imageUrl;
            imgEl.style.display = 'block';
        }
    }
}
