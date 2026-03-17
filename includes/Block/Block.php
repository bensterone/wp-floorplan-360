<?php
namespace Floorplan360\Block;

use Floorplan360\Core\Ajax;

class Block {
    public function register() {
        add_action( 'init', [ $this, 'register_block' ] );
    }

    public function register_block() {
        // register_block_type reads block.json automatically —
        // it handles script/style enqueueing for us.
        register_block_type(
            FP360_PATH . 'block.json',
            [
                'render_callback' => [ $this, 'render' ],
            ]
        );
    }

    /**
     * Server-side render callback.
     * Called by WordPress whenever the block appears on a frontend page or post.
     *
     * @param array $attributes Block attributes saved in the editor (floorplanId).
     * @return string           The HTML output for this block.
     */
    public function render( $attributes ) {
        $post_id = isset( $attributes['floorplanId'] ) ? (int) $attributes['floorplanId'] : 0;

        if ( ! $post_id ) {
            return '';
        }

        // Make sure the referenced floorplan post actually exists and is published.
        $post = get_post( $post_id );
        if ( ! $post || $post->post_type !== FP360_CPT || $post->post_status !== 'publish' ) {
            return '';
        }

        // Do not render if the current visitor cannot read this post.
        // This prevents private or password-protected floorplans from being
        // exposed publicly via a block embedded on another page.
        if ( ! current_user_can( 'read_post', $post_id ) ) {
            return '';
        }

        $floorplan_img = get_post_meta( $post_id, '_fp360_image', true );
        $hotspots_json = get_post_meta( $post_id, '_fp360_hotspots', true );

        if ( ! $hotspots_json ) {
            $hotspots_json = '[]';
        }

        // Enqueue frontend assets — needed when the block appears on a non-floorplan post
        // where Frontend\Assets::enqueue() would not have fired.
        if ( ! wp_script_is( 'fp360-viewer', 'enqueued' ) ) {
            wp_enqueue_style( 'fp360-viewer', FP360_URL . 'assets/css/viewer.css', [], FP360_VERSION );
            wp_enqueue_script( 'fp360-viewer', FP360_URL . 'assets/js/viewer.js', [], FP360_VERSION, true );

            wp_localize_script( 'fp360-viewer', 'fp360Config', [
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'origin'  => Ajax::get_allowed_origin(),
                'i18n'    => [
                    'viewRoom'           => __( 'View room', 'wp-floorplan-360' ),
                    'noPanoramaAssigned' => __( 'No 360° image assigned to this room.', 'wp-floorplan-360' ),
                    'viewerLoadError'    => __( 'The 360° image could not be loaded.', 'wp-floorplan-360' ),
                ],
            ] );
        }

        // Capture the template output
        ob_start();
        include FP360_PATH . 'templates/block-viewer.php';
        return ob_get_clean();
    }
}