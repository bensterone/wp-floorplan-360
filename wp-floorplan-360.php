<?php
/**
 * Plugin Name: Floorplan 360 Viewer
 * Description: Interactive floorplans with polygon hotspots and 360° room viewer.
 * Version: 1.2.0
 * Author: Ben Sturm / WBG Zentrum eG
 * License: GPL-2.0+
 */

namespace Floorplan360;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define Constants
define( 'FP360_VERSION', '1.2.0' );
define( 'FP360_PATH', plugin_dir_path( __FILE__ ) );
define( 'FP360_URL', plugin_dir_url( __FILE__ ) );
define( 'FP360_CPT', 'floorplan' );

// Require Autoloader
require_once FP360_PATH . 'includes/AutoLoader.php';

// Initialize
function init() {
    $plugin = new Core\Plugin();
    $plugin->run();
}
add_action( 'plugins_loaded', 'Floorplan360\\init' );

register_activation_hook( __FILE__, function() {
    // 1. Manually trigger the post type registration
    $post_type = new Core\PostType();
    $post_type->register_cpt(); // We call the registration function directly
    
    // 2. Clear the permalinks
    flush_rewrite_rules();
});
