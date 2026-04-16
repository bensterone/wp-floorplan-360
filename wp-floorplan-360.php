<?php
/**
 * Plugin Name: Floorplan 360 Viewer
 * Description: Interactive floorplans with polygon hotspots and 360° room viewer.
 * Version: 1.7.5
 * Author: Ben Sturm / WBG Zentrum eG
 * License: GPL-2.0+
 * Text Domain: wp-floorplan-360
 * Domain Path: /languages
 * Requires at least: 5.9
 * Requires PHP: 7.4
 */

namespace Floorplan360;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// PHP version gate — show a clear admin notice instead of a cryptic parse error.
if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
    add_action( 'admin_notices', function () {
        echo '<div class="notice notice-error"><p>'
            . esc_html__( 'Floorplan 360 Viewer requires PHP 7.4 or higher. Please upgrade PHP or contact your hosting provider.', 'wp-floorplan-360' )
            . '</p></div>';
    } );
    return;
}

define( 'FP360_VERSION', '1.7.5' );
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

register_activation_hook( __FILE__, function () {
    // Register CPT directly for rewrite rules to work on activation
    $pt = new Core\PostType();
    $pt->register_cpt_raw();
    flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, function () {
    // Flush rewrite rules on deactivation to clean up the 'floorplan' slug
    flush_rewrite_rules();
} );