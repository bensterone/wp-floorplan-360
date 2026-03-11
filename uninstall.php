<?php
/**
 * Fired when the plugin is uninstalled.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Cleanup: Delete all floorplan posts and their associated metadata
$posts = get_posts( [
    'post_type'   => 'floorplan',
    'numberposts' => -1,
    'post_status' => 'any',
] );

foreach ( $posts as $post ) {
    wp_delete_post( $post->ID, true );
}
