<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer', [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    public function render_viewer() {
        $nonce = isset( $_GET['nonce'] ) ? $_GET['nonce'] : '';
        if ( ! wp_verify_nonce( $nonce, 'fp360_viewer_nonce' ) ) {
            wp_die( 'Access denied.' );
        }

        $img = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';
        
        if ( empty( $img ) ) {
            wp_die( 'No image specified.' );
        }
        
        // Load the view file
        require FP360_PATH . 'views/iframe-viewer.php';
        exit;
    }
}