<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <div style="margin-bottom: 15px;">
        <label><strong>Floorplan Image</strong></label><br>
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        <button type="button" class="button button-large" id="fp360_pick_image">
            <?php echo $floorplan_img ? 'Change Image' : 'Select Floorplan Image'; ?>
        </button>
    </div>

    <!-- Added line-height: 0 to fix the shifting issue -->
    <div id="fp360-canvas-container" style="position:relative; background:#f0f0f0; border:2px dashed #ccc; min-height:200px; display:inline-block; max-width:100%; line-height: 0;">
        <img id="fp360-floorplan-img" 
             src="<?php echo esc_url( $floorplan_img ); ?>" 
             style="display: <?php echo $floorplan_img ? 'block' : 'none'; ?>; max-width:100%; height:auto; margin:0; padding:0;">
        
        <svg id="fp360-svg-overlay" 
             style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        </svg>
    </div>

    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <div style="margin-top:10px;">
        <button type="button" class="button" id="fp360-undo-point">Undo Last Point</button>
    </div>
    
    <div id="fp360-hotspot-list-admin" style="margin-top:20px;">
        <h4>Rooms & 360° Views</h4>
        <ul id="fp360-hotspot-items"></ul>
        <p class="description">
            1. Click points on the image to draw a room.<br>
            2. <strong>Click the green pulsing point</strong> to finish the room.<br>
            3. Link each room to a 360° image.
        </p>
    </div>
</div>
