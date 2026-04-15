<?php
namespace Floorplan360\Frontend;

use Floorplan360\Core\Ajax;

class Assets {
    public function register() {
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue() {
        if ( is_singular( FP360_CPT ) ) {
            self::enqueue_viewer_assets();
        }
    }

    /**
     * Enqueues and localises all frontend viewer assets.
     * Called both for the floorplan CPT template (via enqueue() above) and
     * for the Gutenberg block when it appears on a non-floorplan post
     * (via Block::render). Keeping it in one place avoids config drift.
     */
    public static function enqueue_viewer_assets() {
        wp_enqueue_style( 'fp360-viewer', FP360_URL . 'assets/css/viewer.css', [], FP360_VERSION );
        wp_enqueue_script( 'fp360-viewer', FP360_URL . 'assets/js/viewer.js', [], FP360_VERSION, true );

        wp_localize_script( 'fp360-viewer', 'fp360Config', [
            'ajaxUrl' => admin_url( 'admin-ajax.php' ),
            'origin'  => Ajax::get_allowed_origin(),
            'i18n'    => [
                'viewRoom'           => __( 'View room', 'wp-floorplan-360' ),
                'noPanoramaAssigned' => __( 'No 360° image assigned to this room.', 'wp-floorplan-360' ),
                'viewerLoadError'    => __( 'The 360° image could not be loaded.', 'wp-floorplan-360' ),
                'enterFullscreen'    => __( 'Enter fullscreen', 'wp-floorplan-360' ),
                'exitFullscreen'     => __( 'Exit fullscreen', 'wp-floorplan-360' ),
                'back'               => __( 'Back', 'wp-floorplan-360' ),
            ],
        ] );
    }
}
