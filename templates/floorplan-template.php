<?php
get_header();

$post_id       = get_the_ID();
$floorplan_img = get_post_meta( $post_id, '_fp360_image', true );
$hotspots_json = get_post_meta( $post_id, '_fp360_hotspots', true );
if ( ! $hotspots_json ) {
    $hotspots_json = '[]';
}
?>
<div id="fp360-wrap">
    <div id="fp360-left">
        <?php if ( $floorplan_img ) : ?>
            <img id="fp360-floorplan-img"
                 src="<?php echo esc_url( $floorplan_img ); ?>"
                 alt="<?php echo esc_attr( get_the_title() ); ?>"
                 loading="lazy">
            <svg id="fp360-svg-overlay"
                 data-hotspots='<?php echo esc_attr( $hotspots_json ); ?>'>
            </svg>
        <?php else : ?>
            <p class="fp360-no-image-notice">
                <?php esc_html_e( 'No floorplan image uploaded.', 'wp-floorplan-360' ); ?>
            </p>
        <?php endif; ?>
    </div>

    <div id="fp360-right" role="region" aria-label="<?php echo esc_attr__( '360 degree room view', 'wp-floorplan-360' ); ?>">
        <div id="fp360-placeholder">
            <p><?php esc_html_e( 'Select a room on the floorplan to view it in 360°', 'wp-floorplan-360' ); ?></p>
        </div>
        
        <div id="fp360-loader"><?php esc_html_e( 'Loading viewer...', 'wp-floorplan-360' ); ?></div>
        
        <!-- Fixed: Added the status element for JS feedback -->
        <div id="fp360-status" aria-live="polite"></div>

        <iframe id="fp360-viewer-frame"
                allowfullscreen
                title="<?php echo esc_attr__( '360 degree room viewer', 'wp-floorplan-360' ); ?>">
        </iframe>
    </div>
</div>

<?php get_footer(); ?>
