<?php
namespace Floorplan360\Core;

class PostType {
    public function register() {
        // Register the CPT on init
        add_action( 'init', [ $this, 'register_cpt' ] );
    }

    public function register_cpt() {
        $labels = [
            'name'          => 'Floorplans',
            'singular_name' => 'Floorplan',
            'add_new'       => 'Add New',
            'edit_item'     => 'Edit Floorplan',
            'search_items'  => 'Search Floorplans',
            'menu_name'     => 'Floorplans',
        ];

        $args = [
            'labels'             => $labels,
            'public'             => true,
            'publicly_queryable' => true, // Ensure it can be viewed on frontend
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
            'show_in_rest'       => true, // Enable Block Editor support
        ];

        register_post_type( FP360_CPT, $args );
    }
}
