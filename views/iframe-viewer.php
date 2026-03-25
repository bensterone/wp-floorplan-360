<!DOCTYPE html>
<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin:0; padding:0; }
        html, body { width:100%; height:100%; overflow:hidden; background:#000; }
        #loading {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: white; font-family: sans-serif; z-index: 100; pointer-events: none;
            background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 5px;
        }
        /* WebGL fallback message — shown only when WebGL is unavailable */
        #fp360-no-webgl {
            display: none;
            position: fixed; inset: 0;
            background: #111;
            color: #fff;
            font-family: sans-serif;
            font-size: 16px;
            text-align: center;
            padding: 40px 20px;
            z-index: 200;
        }
        #fp360-no-webgl svg {
            display: block;
            margin: 0 auto 16px;
            opacity: 0.5;
        }
        #fp360-no-webgl p { margin: 0; opacity: 0.8; }
        #fp360-no-webgl small { display: block; margin-top: 8px; opacity: 0.5; font-size: 12px; }
    </style>
</head>
<body>
    <!-- WebGL unavailable fallback — hidden until the JS check below shows it -->
    <div id="fp360-no-webgl" role="alert">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p><?php esc_html_e( '360° viewing is not supported by your browser or device.', 'wp-floorplan-360' ); ?></p>
        <small><?php esc_html_e( 'WebGL is required. Try a modern desktop browser such as Chrome or Firefox.', 'wp-floorplan-360' ); ?></small>
    </div>

    <div id="loading" style="display:none;"><?php esc_html_e( 'Loading Panorama...', 'wp-floorplan-360' ); ?></div>

    <noscript>
        <div style="color:#fff;font-family:sans-serif;padding:40px;text-align:center;background:#111;position:fixed;inset:0;">
            <?php esc_html_e( 'JavaScript is required to view 360° panoramas.', 'wp-floorplan-360' ); ?>
        </div>
    </noscript>

    <script>
    // --- WebGL availability check ---
    // Run before loading A-Frame (8MB). If WebGL is unavailable there is no
    // point downloading the library — show the fallback and stop here.
    (function () {
        function hasWebGL() {
            try {
                var canvas = document.createElement('canvas');
                return !!(
                    window.WebGLRenderingContext &&
                    ( canvas.getContext('webgl') || canvas.getContext('experimental-webgl') )
                );
            } catch (e) {
                return false;
            }
        }

        if (!hasWebGL()) {
            document.getElementById('fp360-no-webgl').style.display = 'block';
            // Signal the parent so it can show an appropriate message instead
            // of a permanent loading spinner.
            var origin = <?php echo wp_json_encode( \Floorplan360\Core\Ajax::get_allowed_origin() ); ?>;
            try {
                window.parent.postMessage({ type: 'FP360_IMAGE_ERROR', reason: 'no-webgl' }, origin);
            } catch (e) {}
            // Stop — do not load A-Frame or register any further listeners.
            throw new Error('FP360: WebGL unavailable — 360° viewer cannot start.');
        }
    })();
    </script>

    <script src="<?php echo esc_url( FP360_URL . 'assets/js/aframe.min.js' ); ?>"></script>

    <script>
        const allowedOrigin = <?php echo wp_json_encode( \Floorplan360\Core\Ajax::get_allowed_origin() ); ?>;
        const autoRotate    = <?php echo isset( $_GET['autorotate'] ) && $_GET['autorotate'] === '1' ? 'true' : 'false'; ?>;
        // Start angle: horizontal rotation applied to the sky when the scene loads.
        // Lets editors set a better default view direction per floorplan.
        const startAngle    = <?php echo (int) ( $_GET['angle'] ?? 0 ); ?>;

        function signalReady() {
            window.parent.postMessage({ type: 'FP360_VIEWER_READY' }, allowedOrigin);
        }

        function isUrlSafe(url) {
            if (!url) return false;
            try {
                const parsed = new URL(url, window.location.href);
                return parsed.origin === allowedOrigin && /^https?:$/i.test(parsed.protocol);
            } catch (e) { return false; }
        }

        window.addEventListener('message', function(event) {
            if (event.origin !== allowedOrigin) return;

            if (event.data && event.data.type === 'FP360_LOAD_IMAGE' && event.data.url) {
                if (!isUrlSafe(event.data.url)) {
                    window.parent.postMessage({ type: 'FP360_IMAGE_ERROR' }, allowedOrigin);
                    return;
                }

                const sky    = document.getElementById('fp360-sky');
                const loader = document.getElementById('loading');

                if (sky) {
                    loader.style.display = 'block';

                    sky.addEventListener('materialtextureloaded', () => {
                        loader.style.display = 'none';
                        window.parent.postMessage({ type: 'FP360_IMAGE_LOADED' }, allowedOrigin);
                    }, { once: true });

                    sky.addEventListener('materialtextureerror', () => {
                        loader.style.display = 'none';
                        window.parent.postMessage({ type: 'FP360_IMAGE_ERROR' }, allowedOrigin);
                    }, { once: true });

                    sky.setAttribute('src', event.data.url);
                }
            }
        });

        window.addEventListener('DOMContentLoaded', () => {
            const scene = document.querySelector('a-scene');
            if (scene.hasLoaded) signalReady();
            else scene.addEventListener('loaded', signalReady, { once: true });

            // Apply the start angle once the scene is ready.
            // We rotate the sky rather than the camera so the camera stays at
            // the correct pitch (0) and the horizon line remains level.
            if (startAngle !== 0) {
                const applyAngle = () => {
                    const sky = document.getElementById('fp360-sky');
                    if (sky) sky.setAttribute('rotation', `0 ${startAngle} 0`);
                };
                if (scene.hasLoaded) applyAngle();
                else scene.addEventListener('loaded', applyAngle, { once: true });
            }

            if (autoRotate) {
                let rotating   = true;
                let rafId      = null;
                let lastTime   = null;
                const DEG_PER_SEC = 8;

                function stopRotation() {
                    rotating = false;
                    if (rafId) cancelAnimationFrame(rafId);
                }

                document.addEventListener('mousedown',  stopRotation, { once: true });
                document.addEventListener('touchstart', stopRotation, { once: true });

                function tick(timestamp) {
                    if (!rotating) return;
                    rafId = requestAnimationFrame(tick);
                    if (!lastTime) { lastTime = timestamp; return; }
                    const delta = (timestamp - lastTime) / 1000;
                    lastTime = timestamp;
                    const camera = document.querySelector('[camera]');
                    if (!camera) return;
                    const rot = camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                    camera.setAttribute('rotation', { x: rot.x, y: rot.y + (DEG_PER_SEC * delta), z: rot.z });
                }

                const startWhenReady = () => requestAnimationFrame(tick);
                if (scene.hasLoaded) startWhenReady();
                else scene.addEventListener('loaded', startWhenReady, { once: true });
            }
        });
    </script>

    <a-scene embedded vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        <a-assets>
            <img id="fp360-room-img" src="<?php echo esc_url( $img ); ?>" crossorigin="anonymous">
        </a-assets>
        <a-sky id="fp360-sky" src="#fp360-room-img" rotation="0 0 0"></a-sky>
        <a-entity camera="fov: 90;"
                  look-controls="sensitivity: 0.5; magicWindowTrackingEnabled: false; touchEnabled: true;"></a-entity>
    </a-scene>
</body>
</html>