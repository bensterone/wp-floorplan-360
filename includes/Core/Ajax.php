<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer', [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    public function render_viewer() {
        // Security: Prevent this AJAX response from being framed by external sites
        send_origin_headers();
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( 'Content-Security-Policy: frame-ancestors \'self\'' );
        header( 'Content-Type: text/html; charset=utf-8' );

        $img = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';
        
        if ( empty( $img ) ) {
            wp_die( 'No image specified.', 400 );
        }
        
        // Load the view file
        if ( file_exists( FP360_PATH . 'views/iframe-viewer.php' ) ) {
            require FP360_PATH . 'views/iframe-viewer.php';
        }

        exit;
    }
}