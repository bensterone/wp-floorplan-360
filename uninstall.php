<?php
/**
 * Fired when the plugin is uninstalled.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

/**
 * Deletes all floorplan posts (and their meta) for the current site.
 */
function fp360_delete_site_data() {
    $posts = get_posts( [
        'post_type'   => 'floorplan',
        'numberposts' => -1,
        'post_status' => 'any',
    ] );

    foreach ( $posts as $post ) {
        wp_delete_post( $post->ID, true );
    }
}

if ( is_multisite() ) {
    // On a network install the plugin may have been active on every sub-site.
    // Iterate all sites so no orphaned posts are left behind.
    $sites = get_sites( [ 'number' => 0 ] );
    foreach ( $sites as $site ) {
        switch_to_blog( $site->blog_id );
        fp360_delete_site_data();
        restore_current_blog();
    }
} else {
    fp360_delete_site_data();
}
