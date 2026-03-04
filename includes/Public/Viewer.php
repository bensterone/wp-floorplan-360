<?php
namespace Floorplan360\Public;

class Viewer {
    public function register() {
        add_filter( 'template_include', [ $this, 'load_template' ] );
    }

    public function load_template( $template ) {
        if ( is_singular( FP360_CPT ) ) {
            $custom = FP360_PATH . 'templates/floorplan-template.php';
            if ( file_exists( $custom ) ) {
                return $custom;
            }
        }
        return $template;
    }
}