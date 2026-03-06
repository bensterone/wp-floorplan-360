<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer', [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    public function render_viewer() {
        send_origin_headers();
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( 'Content-Security-Policy: frame-ancestors \'self\'' );
        header( 'Content-Type: text/html; charset=utf-8' );

        $img   = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';
        // Now using the 'title' parameter if you want to display it inside the iframe
        $title = isset( $_GET['title'] ) ? sanitize_text_field( wp_unslash( $_GET['title'] ) ) : '';
        
        if ( empty( $img ) ) {
            wp_die( 'No image specified.', 400 );
        }

        $site_url  = wp_parse_url( get_site_url(), PHP_URL_HOST );
        $image_url = wp_parse_url( $img, PHP_URL_HOST );

        if ( $image_url && $image_url !== $site_url ) {
            wp_die( 'Unauthorized image source.', 403 );
        }
        
        if ( file_exists( FP360_PATH . 'views/iframe-viewer.php' ) ) {
            require FP360_PATH . 'views/iframe-viewer.php';
        }

        exit;
    }
}
