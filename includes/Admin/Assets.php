<?php
namespace Floorplan360\Admin;

class Assets {
    public function register() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue( $hook ) {
        // Get current post type reliably
        $post_type = get_post_type();
        
        if ( ( $hook === 'post.php' || $hook === 'post-new.php' ) && $post_type === FP360_CPT ) {
            // Load WordPress Media Uploader
            wp_enqueue_media();
            
            wp_enqueue_style( 'fp360-admin', FP360_URL . 'assets/css/editor.css', [], FP360_VERSION );
            
            // Added 'media-views' as a dependency to ensure 'wp.media' exists
            wp_enqueue_script( 
                'fp360-admin', 
                FP360_URL . 'assets/js/editor.js', 
                [ 'jquery', 'media-views' ], 
                FP360_VERSION, 
                true 
            );
        }
    }
}
