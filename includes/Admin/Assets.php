<?php
namespace Floorplan360\Admin;

class Assets {
    public function register() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue() {
        $screen = get_current_screen();
        
        // Use screen base and post_type for robust detection
        if ( $screen && 'post' === $screen->base && FP360_CPT === $screen->post_type ) {
            wp_enqueue_media();
            
            wp_enqueue_style( 'fp360-admin', FP360_URL . 'assets/css/editor.css', [], FP360_VERSION );
            
            wp_enqueue_script( 
                'fp360-admin', 
                FP360_URL . 'assets/js/editor.js', 
                [ 'jquery', 'media-views' ], 
                FP360_VERSION, 
                true 
            );

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
