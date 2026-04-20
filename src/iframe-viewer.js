import { Viewer } from '@photo-sphere-viewer/core';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';

import '@photo-sphere-viewer/core/index.css';

const config        = window.FP360_VIEWER_CONFIG || {};
const allowedOrigin = config.allowedOrigin || window.location.origin;
const autoRotate    = !!config.autoRotate;
// PSV works in radians; start angle comes in as degrees from PHP.
const startYaw      = ((Number(config.startAngle) || 0) * Math.PI) / 180;
const initialImage  = config.initialImage || '';

const loader = document.getElementById('loading');
const gyroBtn = document.getElementById('fp360-gyro-btn');

function postToParent(message) {
    try {
        window.parent.postMessage(message, allowedOrigin);
    } catch (e) { /* parent gone or origin mismatch — silent */ }
}

function isUrlSafe(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url, window.location.href);
        return /^https?:$/i.test(parsed.protocol);
    } catch (e) { return false; }
}

const viewer = new Viewer({
    container:    document.getElementById('fp360-viewer'),
    panorama:     initialImage,
    defaultYaw:   startYaw,
    navbar:       false,
    loadingTxt:   '',
    loadingImg:   null,
    mousewheel:   true,
    touchmoveTwoFingers: false,
    plugins: [
        [AutorotatePlugin, {
            autostartDelay: autoRotate ? 100 : null,
            autorotateSpeed: '8rpm',
            autostartOnIdle: false,
        }],
        [GyroscopePlugin, { touchmove: true }],
    ],
});

const autorotate = viewer.getPlugin(AutorotatePlugin);
const gyroscope  = viewer.getPlugin(GyroscopePlugin);

// Any user interaction cancels autorotate.
const stopAutorotate = () => autorotate && autorotate.stop();
viewer.addEventListener('click',  stopAutorotate);
viewer.addEventListener('key-press', stopAutorotate);

viewer.addEventListener('ready', () => {
    if (loader) loader.style.display = 'none';
    postToParent({ type: 'FP360_VIEWER_READY' });

    // WebGL context loss — iOS Safari drops the context on backgrounding
    // or memory pressure. Without this handler the user sees a frozen
    // frame with no explanation. We show the existing no-WebGL overlay
    // and tell the parent so it can update its own state.
    //
    // We intentionally do NOT call preventDefault() on the event:
    // doing so would keep the canvas alive and fire webglcontextrestored
    // later, but Three.js would need a full re-init to render again. A
    // page reload is simpler and more reliable than a restore path we
    // cannot fully exercise across devices.
    const canvas = document.querySelector('#fp360-viewer canvas');
    if (canvas) {
        canvas.addEventListener('webglcontextlost', () => {
            const overlay = document.getElementById('fp360-no-webgl');
            if (overlay) overlay.style.display = 'block';
            if (loader) loader.style.display = 'none';
            postToParent({ type: 'FP360_IMAGE_ERROR', reason: 'webgl-lost' });
        });
    }
});

viewer.addEventListener('panorama-loaded', () => {
    if (loader) loader.style.display = 'none';
    postToParent({ type: 'FP360_IMAGE_LOADED' });
});

window.addEventListener('message', (event) => {
    if (event.origin !== allowedOrigin) return;
    const data = event.data;
    if (!data || data.type !== 'FP360_LOAD_IMAGE' || !data.url) return;

    if (!isUrlSafe(data.url)) {
        postToParent({ type: 'FP360_IMAGE_ERROR' });
        return;
    }

    if (loader) loader.style.display = 'block';
    viewer.setPanorama(data.url, { showLoader: false })
        .catch(() => {
            if (loader) loader.style.display = 'none';
            postToParent({ type: 'FP360_IMAGE_ERROR' });
        });
});

// --- Gyroscope / magic-window button ---
// Only shown on touch-capable devices exposing DeviceOrientationEvent.
// iOS 13+ requires an explicit user-gesture permission request; Android does not.
// After the first permission grant the button toggles gyro on/off freely.
(function initGyroButton() {
    if (!gyroBtn) return;
    if (!('ontouchstart' in window) || typeof DeviceOrientationEvent === 'undefined') return;

    const needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function';
    let gyroActive        = false;
    let permissionGranted = !needsPermission; // Android never needs a prompt
    gyroBtn.style.display = 'flex';

    function enableGyro() {
        stopAutorotate();
        if (gyroscope) gyroscope.start();
        gyroActive = true;
        gyroBtn.classList.add('is-active');
        gyroBtn.setAttribute('aria-pressed', 'true');
    }

    function disableGyro() {
        if (gyroscope) gyroscope.stop();
        gyroActive = false;
        gyroBtn.classList.remove('is-active');
        gyroBtn.setAttribute('aria-pressed', 'false');
    }

    gyroBtn.addEventListener('click', () => {
        // Toggle off if already active
        if (gyroActive) {
            disableGyro();
            return;
        }

        // Toggle on — request permission once on iOS, then enable directly
        if (!permissionGranted) {
            DeviceOrientationEvent.requestPermission()
                .then((state) => {
                    if (state === 'granted') {
                        permissionGranted = true;
                        enableGyro();
                    } else {
                        gyroBtn.style.display = 'none';
                    }
                })
                .catch(() => { gyroBtn.style.display = 'none'; });
        } else {
            enableGyro();
        }
    });
})();
