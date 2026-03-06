<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin:0; padding:0; }
        html, body { width:100%; height:100%; overflow:hidden; background:#000; }
        /* Simple CSS loader while A-Frame initializes */
        #loading {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: white; font-family: sans-serif; z-index: 1; pointer-events: none;
        }
    </style>
</head>
<body>
    <div id="loading" style="display:none;">Updating View...</div>

    <script src="<?php echo esc_url( FP360_URL . 'assets/js/aframe.min.js' ); ?>"></script>
    
    <script>
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'FP360_LOAD_IMAGE' && event.data.url) {
                var sky = document.getElementById('fp360-sky');
                var loaderHint = document.getElementById('loading');
                
                if (sky) {
                    loaderHint.style.display = 'block';
                    // The 'materialtextureloaded' is a specific A-Frame event
                    sky.addEventListener('materialtextureloaded', function() {
                        loaderHint.style.display = 'none';
                    }, { once: true });
                    
                    sky.setAttribute('src', event.data.url);
                }
            }
        });
    </script>

    <a-scene embedded 
             vr-mode-ui="enabled: false" 
             device-orientation-permission-ui="enabled: false"
             renderer="antialias: true; colorManagement: true;">
        <a-assets>
            <!-- Preload initial image with crossorigin to prevent canvas taint -->
            <img id="fp360-room-img" src="<?php echo esc_url( $img ); ?>" crossorigin="anonymous">
        </a-assets>

        <a-sky id="fp360-sky" src="#fp360-room-img" rotation="0 -130 0"></a-sky>
        
        <!-- Standardized camera for best desktop/mobile pan experience -->
        <a-entity camera look-controls="magicWindowTrackingEnabled: false; touchEnabled: true;"></a-entity>
    </a-scene>
</body>
</html>