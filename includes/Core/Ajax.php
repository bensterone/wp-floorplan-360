<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer', [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    /**
     * Centralized helper to get the allowed origin for security checks.
     *
     * Tries to build a precise scheme://host[:port] string from home_url().
     * Falls back to home_url() itself if wp_parse_url() cannot extract the
     * individual parts (e.g. on non-standard server configurations), so the
     * viewer always has a valid, non-empty origin to compare against.
     */
    public static function get_allowed_origin() {
        $home = wp_parse_url( home_url( '/' ) );

        // Fallback: if parsing fails for any reason, use home_url() directly.
        // This guarantees we never return an empty string, which would cause
        // all postMessage origin checks to fail silently.
        if ( empty( $home['scheme'] ) || empty( $home['host'] ) ) {
            return esc_url_raw( home_url() );
        }

        $origin = $home['scheme'] . '://' . $home['host'];
        if ( ! empty( $home['port'] ) ) {
            $origin .= ':' . (int) $home['port'];
        }
        return esc_url_raw( $origin );
    }

    public function render_viewer() {
        // Security headers first — before any output and before
        // send_origin_headers(), so there is no risk of duplication.
        header_remove( 'X-Frame-Options' );
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( 'Content-Security-Policy: frame-ancestors \'self\'' );
        header( 'Content-Type: text/html; charset=utf-8' );
        send_origin_headers();

        $img = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';

        if ( empty( $img ) ) {
            wp_die( 'No image specified.', 400 );
        }

        $allowed_host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
        $image_host   = wp_parse_url( $img, PHP_URL_HOST );

        if ( $image_host && $allowed_host && strtolower( $image_host ) !== strtolower( $allowed_host ) ) {
            wp_die( 'Unauthorized image source.', 403 );
        }

        if ( file_exists( FP360_PATH . 'views/iframe-viewer.php' ) ) {
            require FP360_PATH . 'views/iframe-viewer.php';
        }

        exit;
    }
}