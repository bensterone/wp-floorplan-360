<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <p>
        <label><strong>Floorplan Image (JPG/PNG/SVG)</strong></label><br>
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        <button type="button" class="button" id="fp360_pick_image">
            <?php echo $floorplan_img ? 'Change Image' : 'Upload / Select Image'; ?>
        </button>
    </p>

    <div id="fp360-canvas-container" style="position:relative;display:inline-block;max-width:100%;">
        <?php if ( $floorplan_img ) : ?>
            <img id="fp360-floorplan-img" src="<?php echo esc_url( $floorplan_img ); ?>" style="max-width:100%;display:block;">
        <?php endif; ?>
        <svg id="fp360-svg-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;"></svg>
    </div>

    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <p style="margin-top:8px;">
        <button type="button" class="button" id="fp360-undo-point" title="Undo last point (Esc)">
            <span class="dashicons dashicons-undo" style="vertical-align:text-bottom;"></span> Undo Point
        </button>
        <button type="button" class="button" id="fp360-clear-drawing">Cancel Drawing</button>
    </p>
    
    <div id="fp360-hotspot-list" style="margin-top:16px;">
        <h4>Hotspots</h4>
        <p class="description">Click on floorplan to add points. Click start point (green) to close shape.</p>
        <ul id="fp360-hotspot-items"></ul>
    </div>
    
    <p>
        <button type="button" class="button button-secondary" id="fp360-delete-selected">Delete Selected Hotspot</button>
    </p>
</div>