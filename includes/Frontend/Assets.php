<?php
namespace Floorplan360\Frontend;
use Floorplan360\Core\Ajax;

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
                'origin'  => Ajax::get_allowed_origin(),
            ] );
        }
    }
}

function fp360_get_allowed_origin() {
    $home = wp_parse_url( home_url( '/' ) );

    if ( empty( $home['scheme'] ) || empty( $home['host'] ) ) {
        return '';
    }

    $origin = $home['scheme'] . '://' . $home['host'];

    if ( ! empty( $home['port'] ) ) {
        $origin .= ':' . (int) $home['port'];
    }

    return esc_url_raw( $origin );
}
