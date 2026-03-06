<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <div style="margin-bottom: 15px;">
        <label><strong>Floorplan Image</strong></label><br>
        <!-- name="fp360_image" muss mit $_POST['fp360_image'] in Editor.php übereinstimmen -->
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        <button type="button" class="button button-large" id="fp360_pick_image">
            <?php echo $floorplan_img ? 'Change Image' : 'Select Floorplan Image'; ?>
        </button>
    </div>

    <div id="fp360-canvas-container" style="position:relative; background:#f0f0f0; border:2px dashed #ccc; min-height:200px; display:inline-block; max-width:100%;">
        <img id="fp360-floorplan-img" 
             src="<?php echo esc_url( $floorplan_img ); ?>" 
             style="display: <?php echo $floorplan_img ? 'block' : 'none'; ?>; max-width:100%; height:auto;">
        
        <svg id="fp360-svg-overlay" 
             style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        </svg>
    </div>

    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <div id="fp360-hotspot-list-admin" style="margin-top:20px;">
        <h4>Defined Hotspots</h4>
        <ul id="fp360-hotspot-items"></ul>
        <p class="description">Click on the image to draw. Click the green start point to close a shape.</p>
    </div>
</div>
