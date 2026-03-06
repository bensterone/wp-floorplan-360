<?php
namespace Floorplan360\Core;

use Floorplan360\Admin;
use Floorplan360\Frontend;

class Plugin {
    public function run() {
        // Register Post Type
        ( new PostType() )->register();

        // AJAX Handling (Viewer Iframe)
        ( new Ajax() )->register();

        if ( is_admin() ) {
            ( new Admin\Editor() )->register();
            ( new Admin\Assets() )->register();
        } else {
            ( new Frontend\Viewer() )->register();
            ( new Frontend\Assets() )->register();
        }
    }
}
