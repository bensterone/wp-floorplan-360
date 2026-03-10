<?php
namespace Floorplan360\Admin;

class Assets {
    public function register() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue( $hook ) {
        if ( ( $hook === 'post.php' || $hook === 'post-new.php' ) && get_post_type() === FP360_CPT ) {
            wp_enqueue_media();
            
            wp_enqueue_style( 'fp360-admin', FP360_URL . 'assets/css/editor.css', [], FP360_VERSION );
            
            wp_enqueue_script( 
                'fp360-admin', 
                FP360_URL . 'assets/js/editor.js', 
                [ 'jquery', 'media-views' ], 
                FP360_VERSION, 
                true 
            );

            // Fix: Localize the admin script so the JS i18n object exists
            wp_localize_script( 'fp360-admin', 'fp360Admin', [
                'i18n' => [
                    'pick360'           => __( 'Pick 360', 'wp-floorplan-360' ),
                    'deleteRoom'        => __( 'Delete Room', 'wp-floorplan-360' ),
                    'deleteRoomConfirm' => __( 'Delete this room?', 'wp-floorplan-360' ),
                ],
            ] );
        }
    }
}
