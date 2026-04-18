<?php
// Scalar guard: `(int) []` emits an E_WARNING in PHP 8+ if someone passes
// ?angle[]=…, so coerce non-scalar values to 0 first.
$angle_raw  = $_GET['angle'] ?? 0;
$angle      = is_scalar( $angle_raw ) ? (int) $angle_raw : 0;
$angle      = max( -180, min( 180, $angle ) );
$autorotate = isset( $_GET['autorotate'] ) && $_GET['autorotate'] === '1';
?>
<!DOCTYPE html>
<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="<?php echo esc_url( FP360_URL . 'assets/css/iframe-viewer.css' ); ?>">
    <style>
        * { margin:0; padding:0; }
        html, body { width:100%; height:100%; overflow:hidden; background:#000; }
        #fp360-viewer { position: fixed; inset: 0; }
        #loading {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: white; font-family: sans-serif; z-index: 100; pointer-events: none;
            background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 5px;
        }
        #fp360-no-webgl {
            display: none;
            position: fixed; inset: 0;
            background: #111; color: #fff;
            font-family: sans-serif; font-size: 16px;
            text-align: center; padding: 40px 20px;
            z-index: 200;
        }
        #fp360-no-webgl svg { display: block; margin: 0 auto 16px; opacity: 0.5; }
        #fp360-no-webgl p { margin: 0; opacity: 0.8; }
        #fp360-no-webgl small { display: block; margin-top: 8px; opacity: 0.5; font-size: 12px; }

        #fp360-gyro-btn {
            display: none;
            position: fixed; bottom: 16px; left: 50%;
            transform: translateX(-50%);
            align-items: center; gap: 7px;
            padding: 8px 18px;
            background: rgba(0,0,0,0.65);
            color: #fff; font-family: sans-serif; font-size: 13px;
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 20px; cursor: pointer;
            z-index: 100;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            transition: background 0.2s, border-color 0.2s;
            white-space: nowrap;
            -webkit-tap-highlight-color: transparent;
        }
        #fp360-gyro-btn.is-active {
            background: rgba(0,120,255,0.8);
            border-color: rgba(100,180,255,0.5);
        }
        #fp360-gyro-btn svg { flex-shrink: 0; }
    </style>
</head>
<body>
    <div id="fp360-no-webgl" role="alert">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p><?php esc_html_e( '360° viewing is not supported by your browser or device.', 'wp-floorplan-360' ); ?></p>
        <small><?php esc_html_e( 'WebGL is required. Try a modern desktop browser such as Chrome or Firefox.', 'wp-floorplan-360' ); ?></small>
    </div>

    <div id="fp360-viewer"></div>

    <div id="loading"><?php esc_html_e( 'Loading Panorama...', 'wp-floorplan-360' ); ?></div>

    <button id="fp360-gyro-btn"
            aria-label="<?php esc_attr_e( 'Enable tilt to look around', 'wp-floorplan-360' ); ?>"
            aria-pressed="false">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21.5 2v6h-6"/>
            <path d="M2.5 12A10 10 0 0 1 18.64 5.36L21.5 8"/>
            <path d="M2.5 22v-6h6"/>
            <path d="M21.5 12A10 10 0 0 1 5.36 18.64L2.5 16"/>
        </svg>
        <?php esc_html_e( 'Tilt to look', 'wp-floorplan-360' ); ?>
    </button>

    <noscript>
        <div style="color:#fff;font-family:sans-serif;padding:40px;text-align:center;background:#111;position:fixed;inset:0;">
            <?php esc_html_e( 'JavaScript is required to view 360° panoramas.', 'wp-floorplan-360' ); ?>
        </div>
    </noscript>

    <script>
    // WebGL pre-flight before loading the bundle. If it fails there is no
    // point downloading ~600 KB of PSV + Three.js — tell the parent and stop.
    (function () {
        function hasWebGL() {
            try {
                var canvas = document.createElement('canvas');
                return !!(
                    window.WebGLRenderingContext &&
                    ( canvas.getContext('webgl') || canvas.getContext('experimental-webgl') )
                );
            } catch (e) { return false; }
        }
        var origin = <?php echo wp_json_encode( \Floorplan360\Core\Ajax::get_allowed_origin() ); ?>;
        if (!hasWebGL()) {
            document.getElementById('fp360-no-webgl').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
            try { window.parent.postMessage({ type: 'FP360_IMAGE_ERROR', reason: 'no-webgl' }, origin); } catch (e) {}
            throw new Error('FP360: WebGL unavailable — 360° viewer cannot start.');
        }
        window.FP360_VIEWER_CONFIG = {
            allowedOrigin: origin,
            initialImage:  <?php echo wp_json_encode( $img ); ?>,
            autoRotate:    <?php echo $autorotate ? 'true' : 'false'; ?>,
            startAngle:    <?php echo $angle; ?>
        };
    })();
    </script>

    <script src="<?php echo esc_url( FP360_URL . 'assets/js/iframe-viewer.js' ); ?>"></script>
</body>
</html>
