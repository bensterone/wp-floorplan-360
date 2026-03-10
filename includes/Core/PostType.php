<?php
namespace Floorplan360\Core;

class PostType {
    public function register() {
        // Standard WordPress init hook
        add_action( 'init', [ $this, 'register_cpt_raw' ] );
    }

    /**
     * Registered as a separate method so it can be called directly 
     * by the activation hook to flush rewrite rules safely.
     */
    public function register_cpt_raw() {
        $labels = [
            'name'          => __( 'Floorplans', 'wp-floorplan-360' ),
            'singular_name' => __( 'Floorplan', 'wp-floorplan-360' ),
            'add_new'       => __( 'Add New', 'wp-floorplan-360' ),
            'edit_item'     => __( 'Edit Floorplan', 'wp-floorplan-360' ),
            'search_items'  => __( 'Search Floorplans', 'wp-floorplan-360' ),
            'menu_name'     => __( 'Floorplans', 'wp-floorplan-360' ),
        ];

        $args = [
            'labels'             => $labels,
            'public'             => true,
            'publicly_queryable' => true,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'query_var'          => true,
            'rewrite'            => [ 'slug' => 'floorplan' ],
            'capability_type'    => 'post',
            'has_archive'        => true,
            'hierarchical'       => false,
            'menu_position'      => 20,
            'supports'           => [ 'title' ],
            'menu_icon'          => 'dashicons-admin-home',
            'show_in_rest'       => true,
        ];

        register_post_type( FP360_CPT, $args );
    }
}
