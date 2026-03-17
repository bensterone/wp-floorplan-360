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
    </style>
</head>
<body>
    <div id="loading" style="display:none;"><?php esc_html_e( 'Loading Panorama...', 'wp-floorplan-360' ); ?></div>

    <script src="<?php echo esc_url( FP360_URL . 'assets/js/aframe.min.js' ); ?>"></script>

    <script>
        const allowedOrigin = <?php echo wp_json_encode( \Floorplan360\Core\Ajax::get_allowed_origin() ); ?>;
        const autoRotate    = <?php echo isset( $_GET['autorotate'] ) && $_GET['autorotate'] === '1' ? 'true' : 'false'; ?>;

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

            // Auto-rotate — slowly spin the camera when enabled.
            // Stops immediately when the user interacts with the viewer.
            if (autoRotate) {
                let rotating   = true;
                let rafId      = null;
                let lastTime   = null;
                const DEG_PER_SEC = 8; // one full rotation every 45 seconds

                function stopRotation() {
                    rotating = false;
                    if (rafId) cancelAnimationFrame(rafId);
                }

                // Any touch or mouse interaction cancels auto-rotation
                document.addEventListener('mousedown', stopRotation, { once: true });
                document.addEventListener('touchstart', stopRotation, { once: true });

                function tick(timestamp) {
                    if (!rotating) return;
                    rafId = requestAnimationFrame(tick);

                    if (!lastTime) { lastTime = timestamp; return; }
                    const delta = (timestamp - lastTime) / 1000; // seconds
                    lastTime = timestamp;

                    const camera = document.querySelector('[camera]');
                    if (!camera) return;

                    const rot = camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                    camera.setAttribute('rotation', {
                        x: rot.x,
                        y: rot.y + (DEG_PER_SEC * delta),
                        z: rot.z
                    });
                }

                // Start rotating once the scene is ready
                const scene = document.querySelector('a-scene');
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
        <a-sky id="fp360-sky" src="#fp360-room-img" rotation="0 -130 0"></a-sky>
        <a-entity camera look-controls="magicWindowTrackingEnabled: false; touchEnabled: true;"></a-entity>
    </a-scene>
</body>
</html>