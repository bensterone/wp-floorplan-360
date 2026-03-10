<?php
/**
 * Plugin Name: Floorplan 360 Viewer
 * Description: Interactive floorplans with polygon hotspots and 360° room viewer.
 * Version: 1.3
 * Author: Ben Sturm / WBG Zentrum eG
 * License: GPL-2.0+
 * Text Domain: wp-floorplan-360
 * Domain Path: /languages
 */

namespace Floorplan360;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'FP360_VERSION', '1.3' );
define( 'FP360_PATH', plugin_dir_path( __FILE__ ) );
define( 'FP360_URL', plugin_dir_url( __FILE__ ) );
define( 'FP360_CPT', 'floorplan' );

require_once FP360_PATH . 'includes/AutoLoader.php';

function init() {
    load_plugin_textdomain(
        'wp-floorplan-360',
        false,
        dirname( plugin_basename( __FILE__ ) ) . '/languages'
    );

    $plugin = new Core\Plugin();
    $plugin->run();
}
add_action( 'plugins_loaded', 'Floorplan360\\init' );

register_activation_hook( __FILE__, function() {
    // Register CPT directly for rewrite rules to work on activation
    $pt = new Core\PostType();
    $pt->register_cpt_raw(); 
    flush_rewrite_rules();
});

register_deactivation_hook( __FILE__, function() {
    // Flush rewrite rules on deactivation to clean up the 'floorplan' slug
    flush_rewrite_rules();
});
