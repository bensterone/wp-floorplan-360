<?php
namespace Floorplan360\Core;

class Ajax {
    public function register() {
        add_action( 'wp_ajax_fp360_viewer',        [ $this, 'render_viewer' ] );
        add_action( 'wp_ajax_nopriv_fp360_viewer', [ $this, 'render_viewer' ] );
    }

    /**
     * Centralised helper to get the allowed postMessage origin.
     *
     * Builds a precise scheme://host[:port] string from home_url().
     * Falls back to home_url() itself if wp_parse_url() cannot extract
     * the individual parts, so the viewer always has a valid origin.
     */
    public static function get_allowed_origin() {
        $home = wp_parse_url( home_url( '/' ) );

        if ( empty( $home['scheme'] ) || empty( $home['host'] ) ) {
            return esc_url_raw( home_url() );
        }

        $origin = $home['scheme'] . '://' . $home['host'];
        if ( ! empty( $home['port'] ) ) {
            $origin .= ':' . (int) $home['port'];
        }
        return esc_url_raw( $origin );
    }

    /**
     * Validates that an image URL is safe to load in the viewer.
     *
     * Previous approach: strict host string comparison.
     * Problem: breaks CDN setups (cdn.example.com vs example.com),
     * offloaded media hosts, and object-storage integrations.
     *
     * New approach: check whether the URL resolves to an attachment
     * that exists in the local WordPress media library. If it does,
     * it was uploaded by an authorised user and is safe to display.
     * If not, fall back to comparing the URL host against home_url()
     * — this covers rare edge cases where attachments are served from
     * a mapped domain that isn't the CDN.
     *
     * @param  string $img  Sanitised image URL.
     * @return bool         True if the URL is permitted.
     */
    private function is_image_permitted( string $img ): bool {
        if ( empty( $img ) ) {
            return false;
        }

        // Primary check: does this URL belong to a local media attachment?
        // Works transparently with CDNs, S3 offload, and custom media hosts
        // because the attachment record exists in the DB regardless of where
        // the file is physically served from.
        $attachment_id = attachment_url_to_postid( $img );
        if ( $attachment_id > 0 ) {
            return true;
        }

        // Secondary check: same host as the WordPress installation.
        // Catches edge cases where wp_get_attachment_url() returns a
        // different URL format than what was stored (e.g. http vs https).
        $allowed_host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
        $image_host   = wp_parse_url( $img, PHP_URL_HOST );

        if ( $image_host && $allowed_host ) {
            // Strip leading 'www.' from both sides before comparing so that
            // example.com and www.example.com are treated as the same host.
            $strip = fn( $h ) => preg_replace( '/^www\./i', '', strtolower( $h ) );
            if ( $strip( $image_host ) === $strip( $allowed_host ) ) {
                return true;
            }
        }

        return false;
    }

    public function render_viewer() {
        // Security headers first — before any output.
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( "Content-Security-Policy: frame-ancestors 'self'" );
        header( 'Content-Type: text/html; charset=utf-8' );
        send_origin_headers();

        $img = isset( $_GET['img'] ) ? esc_url_raw( wp_unslash( $_GET['img'] ) ) : '';

        if ( empty( $img ) ) {
            wp_die( 'No image specified.', 400 );
        }

        if ( ! $this->is_image_permitted( $img ) ) {
            wp_die( 'Unauthorized image source.', 403 );
        }

        if ( file_exists( FP360_PATH . 'views/iframe-viewer.php' ) ) {
            require FP360_PATH . 'views/iframe-viewer.php';
        }

        exit;
    }
}