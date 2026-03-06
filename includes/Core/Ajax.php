<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer', [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    public function render_viewer() {
        // 1. Security Headers: Prevent this AJAX response from being framed by external sites
        send_origin_headers();
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( 'Content-Security-Policy: frame-ancestors \'self\'' );
        header( 'Content-Type: text/html; charset=utf-8' );

        // 2. Input Validation
        $img = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';
        
        if ( empty( $img ) ) {
            wp_die( 'No image specified.', 400 );
        }

        /**
         * 3. Security Check: Domain Validation
         * We want to ensure that the image being requested belongs to this website's 
         * domain or a trusted source. This prevents "Open Redirect" style abuse 
         * where people use your viewer to display external malicious panoramas.
         */
        $site_url  = wp_parse_url( get_site_url(), PHP_URL_HOST );
        $image_url = wp_parse_url( $img, PHP_URL_HOST );

        // If the image host exists and doesn't match our site host, block it.
        // We allow empty $image_url in case of relative paths.
        if ( $image_url && $image_url !== $site_url ) {
            wp_die( 'Unauthorized image source. Images must be hosted on ' . esc_html( $site_url ), 403 );
        }
        
        // 4. Load the view file
        if ( file_exists( FP360_PATH . 'views/iframe-viewer.php' ) ) {
            require FP360_PATH . 'views/iframe-viewer.php';
        }

        exit;
    }
}
