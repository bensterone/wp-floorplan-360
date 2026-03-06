<?php
namespace Floorplan360\Public;

class Assets {
    public function register() {
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue() {
        if ( is_singular( FP360_CPT ) ) {
            wp_enqueue_style( 'fp360-viewer', FP360_URL . 'assets/css/viewer.css', [], FP360_VERSION );
            
            wp_enqueue_script( 'fp360-viewer', FP360_URL . 'assets/js/viewer.js', [], FP360_VERSION, true );
            
            wp_localize_script( 'fp360-viewer', 'fp360Config', [
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                // Nonce removed for frontend viewer to allow caching compatibility
            ] );
        }
    }
}