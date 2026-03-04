<?php
get_header();

$post_id       = get_the_ID();
$floorplan_img = get_post_meta( $post_id, '_fp360_image', true );
$hotspots_json = get_post_meta( $post_id, '_fp360_hotspots', true );
if ( ! $hotspots_json ) {
    $hotspots_json = '[]';
}
?>
<!-- CSS enqueued via Assets.php -->
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
            <p style="padding:20px;text-align:center;">No floorplan image uploaded.</p>
        <?php endif; ?>
    </div>

    <div id="fp360-right" role="region" aria-label="360 degree room view">
        <div id="fp360-placeholder">
            <p>Select a room on the floorplan to view it in 360°</p>
        </div>
        <div id="fp360-loader">Loading viewer...</div>
        <iframe id="fp360-viewer-frame"
                allowfullscreen
                title="360 degree room viewer">
        </iframe>
    </div>
</div>
<!-- JS enqueued via Assets.php -->

<?php get_footer(); ?>