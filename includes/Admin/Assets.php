<?php
namespace Floorplan360\Admin;

class Assets {
    public function register() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue( $hook ) {
        global $post;
        if ( ( $hook === 'post.php' || $hook === 'post-new.php' ) && $post->post_type === FP360_CPT ) {
            wp_enqueue_media();
            
            wp_enqueue_style( 'fp360-admin', FP360_URL . 'assets/css/editor.css', [], FP360_VERSION );
            
            wp_enqueue_script( 'fp360-admin', FP360_URL . 'assets/js/editor.js', [ 'jquery' ], FP360_VERSION, true );
        }
    }
}