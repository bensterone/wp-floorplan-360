<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <div style="margin-bottom: 15px;">
        <label><strong>Floorplan Image</strong></label><br>
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        <button type="button" class="button button-large" id="fp360_pick_image">
            <?php echo $floorplan_img ? 'Change Image' : 'Select Floorplan Image'; ?>
        </button>
    </div>

    <!-- Added 'is-empty' logic to handle the placeholder state -->
    <div id="fp360-canvas-container" class="<?php echo ! $floorplan_img ? 'is-empty' : ''; ?>">
        <img id="fp360-floorplan-img" 
             src="<?php echo esc_url( $floorplan_img ); ?>" 
             style="display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        
        <svg id="fp360-svg-overlay" 
             style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        </svg>
    </div>

    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <div style="margin-top:10px;">
        <button type="button" class="button" id="fp360-undo-point">
            <span class="dashicons dashicons-undo" style="padding-top:4px;"></span> Undo Last Point
        </button>
    </div>
    
    <div id="fp360-hotspot-list-admin" style="margin-top:20px;">
        <h4 style="margin-bottom:5px;">Rooms & 360° Views</h4>
        <ul id="fp360-hotspot-items"></ul>
        <p class="description">
            <strong>Pro Tip:</strong> Double-click the last point to quickly close a room shape.
        </p>
    </div>
</div>
