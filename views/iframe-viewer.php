<!DOCTYPE html>
<html lang="en">
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
    <div id="loading" style="display:none;">Loading Panorama...</div>

    <script src="<?php echo esc_url( FP360_URL . 'assets/js/aframe.min.js' ); ?>"></script>

    <script>
        const allowedOrigin = <?php echo wp_json_encode( \Floorplan360\Frontend\fp360_get_allowed_origin() ); ?>;

        function postToParent(message) {
            if (!allowedOrigin) return;
            window.parent.postMessage(message, allowedOrigin);
        }

        function signalReady() {
            postToParent({ type: 'FP360_VIEWER_READY' });
        }

        function isUrlSafe(url) {
            if (!url) return false;

            try {
                const parsed = new URL(url, window.location.href);

                if (parsed.origin !== allowedOrigin) {
                    return false;
                }

                return /^https?:$/i.test(parsed.protocol);
            } catch (e) {
                return false;
            }
        }

        function loadSkyImage(url) {
            const sky = document.getElementById('fp360-sky');
            const loaderHint = document.getElementById('loading');

            if (!sky || !isUrlSafe(url)) {
                postToParent({ type: 'FP360_IMAGE_ERROR' });
                return;
            }

            loaderHint.style.display = 'block';

            const onLoaded = function () {
                loaderHint.style.display = 'none';
                postToParent({ type: 'FP360_IMAGE_LOADED' });
            };

            const onError = function () {
                loaderHint.style.display = 'none';
                postToParent({ type: 'FP360_IMAGE_ERROR' });
            };

            sky.addEventListener('materialtextureloaded', onLoaded, { once: true });
            sky.addEventListener('error', onError, { once: true });

            sky.setAttribute('src', url);
        }

        window.addEventListener('message', function(event) {
            if (event.origin !== allowedOrigin) return;

            if (event.data && event.data.type === 'FP360_LOAD_IMAGE' && event.data.url) {
                loadSkyImage(event.data.url);
            }
        });

        window.addEventListener('DOMContentLoaded', function() {
            const scene = document.querySelector('a-scene');
            if (scene.hasLoaded) {
                signalReady();
            } else {
                scene.addEventListener('loaded', signalReady, { once: true });
            }
        });
    </script>

    <a-scene embedded
             vr-mode-ui="enabled: false"
             device-orientation-permission-ui="enabled: false"
             renderer="antialias: true; colorManagement: true;">
        <a-assets>
            <img id="fp360-room-img" src="<?php echo esc_url( $img ); ?>" crossorigin="anonymous">
        </a-assets>
        <a-sky id="fp360-sky" src="#fp360-room-img" rotation="0 -130 0"></a-sky>
        <a-entity camera look-controls="magicWindowTrackingEnabled: false; touchEnabled: true;"></a-entity>
    </a-scene>
</body>
</html>
