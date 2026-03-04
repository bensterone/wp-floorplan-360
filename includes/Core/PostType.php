<?php
namespace Floorplan360\Core;

class PostType {
    public function register() {
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

        register_post_type( FP360_CPT, [
            'labels'       => $labels,
            'public'       => true,
            'show_in_menu' => true,
            'supports'     => [ 'title' ],
            'menu_icon'    => 'dashicons-admin-home',
            'rewrite'      => [ 'slug' => 'floorplan' ],
        ] );
    }
}