<?php
namespace Floorplan360\Frontend;

class Viewer {
    public function register() {
        add_filter( 'template_include', [ $this, 'load_template' ] );
    }

    public function load_template( $template ) {
        if ( is_singular( FP360_CPT ) ) {
            // Check if theme has an override: your-theme/floorplan-360/floorplan-template.php
            $located = locate_template( 'floorplan-360/floorplan-template.php' );
            
            if ( $located ) {
                return $located;
            }

            // Fallback to plugin template
            return FP360_PATH . 'templates/floorplan-template.php';
        }
        return $template;
    }
}
