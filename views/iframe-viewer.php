<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin:0; padding:0; }
        html, body { width:100%; height:100%; overflow:hidden; background:#000; }
        a-scene { width:100%; height:100%; }
    </style>
</head>
<body>
    <!-- A-Frame loaded from assets -->
    <script src="<?php echo esc_url( FP360_URL . 'assets/js/aframe.min.js' ); ?>"></script>
    <script>
        // Called from parent window to change the 360° image without recreating the scene.
        window.fp360LoadImage = function (url) {
            var img = document.getElementById('fp360-room-img');
            if (!img) return;
            img.setAttribute('src', url);
        };
    </script>

    <a-scene embedded vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        <a-assets>
            <img id="fp360-room-img" src="<?php echo esc_url( $img ); ?>" crossorigin="anonymous">
        </a-assets>

        <a-sky id="fp360-sky" src="#fp360-room-img" rotation="0 -130 0"></a-sky>
        <a-camera look-controls="reverseMouseDrag: false;"></a-camera>
    </a-scene>
</body>
</html>