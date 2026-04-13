<?php
namespace Floorplan360\Block;

use Floorplan360\Frontend\Assets;

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

        // Do not render if the floorplan is password-protected and the visitor
        // has not yet entered the correct password.
        if ( post_password_required( $post ) ) {
            return '';
        }

        $floorplan_img   = get_post_meta( $post_id, '_fp360_image', true );
        $hotspots_json   = get_post_meta( $post_id, '_fp360_hotspots', true );
        $auto_rotate     = get_post_meta( $post_id, '_fp360_auto_rotate', true );
        $highlight_color = get_post_meta( $post_id, '_fp360_highlight_color', true ) ?: '#0078ff';
        $start_angle     = get_post_meta( $post_id, '_fp360_start_angle', true );
        if ( $start_angle === '' ) $start_angle = '0';

        if ( ! $hotspots_json ) {
            $hotspots_json = '[]';
        }

        // Enqueue frontend assets — needed when the block appears on a non-floorplan post
        // where Frontend\Assets::enqueue() would not have fired.
        if ( ! wp_script_is( 'fp360-viewer', 'enqueued' ) ) {
            Assets::enqueue_viewer_assets();
        }

        // Capture the template output
        ob_start();
        include FP360_PATH . 'templates/block-viewer.php';
        return ob_get_clean();
    }
}