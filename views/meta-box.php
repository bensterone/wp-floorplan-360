<?php defined('ABSPATH') || exit; ?>
<div id="fp360-editor-wrap">
    <div style="margin-bottom: 15px;">
        <label><strong><?php esc_html_e( 'Floorplan Image', 'wp-floorplan-360' ); ?></strong></label><br>
        <input type="hidden" name="fp360_image" id="fp360_image_url" value="<?php echo esc_attr( $floorplan_img ); ?>">
        <button type="button" class="button button-large" id="fp360_pick_image">
            <?php
            echo $floorplan_img
                ? esc_html__( 'Change Image', 'wp-floorplan-360' )
                : esc_html__( 'Select Floorplan Image', 'wp-floorplan-360' );
            ?>
        </button>
    </div>

    <div id="fp360-canvas-container">
        <p id="fp360-empty-state" <?php echo $floorplan_img ? 'style="display:none;"' : ''; ?>>
            <?php esc_html_e( 'Floorplan preview will appear here.', 'wp-floorplan-360' ); ?>
        </p>
        <img id="fp360-floorplan-img"
             src="<?php echo esc_url( $floorplan_img ); ?>"
             crossorigin="anonymous"
             alt=""
             style="display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">

        <svg id="fp360-svg-overlay"
             style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; display: <?php echo $floorplan_img ? 'block' : 'none'; ?>;">
        </svg>
    </div>

    <input type="hidden" name="fp360_hotspots" id="fp360_hotspots_data" value="<?php echo esc_attr( $hotspots_json ); ?>">

    <div class="fp360-toolbar">
        <button type="button" class="button" id="fp360-undo-point">
            <span class="dashicons dashicons-undo" style="padding-top:4px;"></span>
            <?php esc_html_e( 'Undo Last Point', 'wp-floorplan-360' ); ?>
        </button>

        <button type="button" class="button button-primary" id="fp360-detect-rooms">
            <span class="dashicons dashicons-search" style="padding-top:4px;"></span>
            <?php esc_html_e( 'Detect Rooms', 'wp-floorplan-360' ); ?>
        </button>

        <button type="button" class="button" id="fp360-clear-rooms">
            <span class="dashicons dashicons-trash" style="padding-top:4px;"></span>
            <?php esc_html_e( 'Clear All Rooms', 'wp-floorplan-360' ); ?>
        </button>

        <label class="fp360-tolerance-label">
            <?php esc_html_e( 'Sensitivity:', 'wp-floorplan-360' ); ?>
            <input type="range"
                   id="fp360-detect-tolerance"
                   min="2" max="8" value="3" step="1">
            <span id="fp360-detect-tolerance-val">3</span>
        </label>
    </div>

    <p id="fp360-detect-status" style="display:none;"></p>

    <div id="fp360-hotspot-list-admin" style="margin-top:20px;">
        <h4 style="margin-bottom:5px;"><?php esc_html_e( 'Rooms & 360° Views', 'wp-floorplan-360' ); ?></h4>
        <ul id="fp360-hotspot-items"></ul>
        <p class="description">
            <strong><?php esc_html_e( 'Pro Tip:', 'wp-floorplan-360' ); ?></strong>
            <?php esc_html_e( 'Double-click the last point to quickly close a room shape.', 'wp-floorplan-360' ); ?>
        </p>
    </div>
</div>