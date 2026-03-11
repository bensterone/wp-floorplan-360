<?php
/**
 * Block render template for the Floorplan 360 Viewer block.
 *
 * Variables available (set by Block::render() before include):
 *   $post_id        int     The floorplan post ID.
 *   $floorplan_img  string  URL of the floorplan image.
 *   $hotspots_json  string  JSON string of hotspot data.
 */

defined( 'ABSPATH' ) || exit;
?>
<div id="fp360-wrap-<?php echo esc_attr( $post_id ); ?>" class="fp360-wrap">
    <div class="fp360-left">
        <?php if ( $floorplan_img ) : ?>
            <img id="fp360-floorplan-img-<?php echo esc_attr( $post_id ); ?>"
                 class="fp360-floorplan-img"
                 src="<?php echo esc_url( $floorplan_img ); ?>"
                 alt="<?php echo esc_attr( get_the_title( $post_id ) ); ?>"
                 loading="lazy">
            <svg class="fp360-svg-overlay"
                 data-hotspots='<?php echo esc_attr( $hotspots_json ); ?>'
                 data-instance="<?php echo esc_attr( $post_id ); ?>">
            </svg>
        <?php else : ?>
            <p class="fp360-no-image-notice">
                <?php esc_html_e( 'No floorplan image uploaded.', 'wp-floorplan-360' ); ?>
            </p>
        <?php endif; ?>
    </div>

    <div class="fp360-right"
         role="region"
         aria-label="<?php echo esc_attr__( '360 degree room view', 'wp-floorplan-360' ); ?>">

        <div class="fp360-placeholder">
            <p><?php esc_html_e( 'Select a room on the floorplan to view it in 360°', 'wp-floorplan-360' ); ?></p>
        </div>

        <div class="fp360-loader"><?php esc_html_e( 'Loading viewer...', 'wp-floorplan-360' ); ?></div>

        <div class="fp360-status" aria-live="polite"></div>

        <iframe class="fp360-viewer-frame"
                allowfullscreen
                title="<?php echo esc_attr__( '360 degree room viewer', 'wp-floorplan-360' ); ?>">
        </iframe>
    </div>
</div>
