<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <p>
        <label><strong>Floorplan Image (JPG/PNG/SVG)</strong></label><br>
        <!-- This hidden input stores the URL for saving -->
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        
        <button type="button" class="button" id="fp360_pick_image">
            <?php echo $floorplan_img ? 'Change Image' : 'Upload / Select Image'; ?>
        </button>
    </p>

    <div id="fp360-canvas-container" style="position:relative; display:inline-block; min-width:300px; min-height:200px; background:#eee; border:1px solid #ddd;">
        <!-- Image tag is always here now, just hidden via inline style if empty -->
        <img id="fp360-floorplan-img" 
             src="<?php echo esc_url( $floorplan_img ); ?>" 
             style="max-width:100%; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        
        <svg id="fp360-svg-overlay" 
             style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; cursor:crosshair; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        </svg>
    </div>

    <!-- This hidden input stores the Hotspot JSON for saving -->
    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <div style="margin-top:10px;">
        <button type="button" class="button" id="fp360-undo-point">Undo Last Point</button>
        <button type="button" class="button button-link-delete" id="fp360-delete-selected" style="color:#d63638;">Delete Selected Hotspot</button>
    </div>
    
    <div id="fp360-hotspot-list" style="margin-top:20px; border-top:1px solid #eee; padding-top:10px;">
        <h4>Hotspots / Rooms</h4>
        <ul id="fp360-hotspot-items"></ul>
    </div>
</div>
