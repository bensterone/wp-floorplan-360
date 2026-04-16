<?php
namespace Floorplan360\Admin;

class Assets {
    public function register() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
    }

    public function enqueue() {
        $screen = get_current_screen();

        // Only load on the floorplan post edit screen
        if ( $screen && 'post' === $screen->base && FP360_CPT === $screen->post_type ) {
            wp_enqueue_media();

            wp_enqueue_style( 'fp360-admin', FP360_URL . 'assets/css/editor.css', [], FP360_VERSION );

            wp_enqueue_script(
                'fp360-admin',
                FP360_URL . 'assets/js/editor.js',
                [ 'jquery', 'media-views', 'wp-api-fetch' ],
                FP360_VERSION,
                true
            );

            wp_localize_script( 'fp360-admin', 'fp360Admin', [
                'postId'    => get_the_ID(),
                'restUrl'   => esc_url_raw( rest_url() ),
                'nonce'     => wp_create_nonce( 'wp_rest' ),
                'dxfLayers' => get_post_meta( get_the_ID(), '_fp360_dxf_layers', true ) ?: '',
                'i18n' => [
                    'pick360'            => __( 'Pick 360', 'wp-floorplan-360' ),
                    'selectFloorplan'    => __( 'Select Floorplan Image', 'wp-floorplan-360' ),
                    'deleteRoom'         => __( 'Delete Room', 'wp-floorplan-360' ),
                    'deleteRoomConfirm'  => __( 'Delete this room?', 'wp-floorplan-360' ),
                    'newRoom'            => __( 'New Room', 'wp-floorplan-360' ),
                    'roomLabel'          => __( 'Room Label', 'wp-floorplan-360' ),
                    'detectRooms'        => __( 'Detect Rooms', 'wp-floorplan-360' ),
                    'detecting'          => __( 'Detecting…', 'wp-floorplan-360' ),
                    'detectedRooms'      => __( 'Detected {n} room(s). Review polygons and assign 360° images.', 'wp-floorplan-360' ),
                    'noRoomsFound'       => __( 'No rooms detected. Try a lower sensitivity value, or draw rooms manually.', 'wp-floorplan-360' ),
                    'noImageForDetect'   => __( 'Please upload a floorplan image first.', 'wp-floorplan-360' ),
                    'detectionError'     => __( 'Detection failed. Please draw rooms manually.', 'wp-floorplan-360' ),
                    'detectConfirmClear' => __( 'Clear existing rooms and re-detect?', 'wp-floorplan-360' ),
                    'clearAllConfirm'    => __( 'Delete all rooms? This cannot be undone until you save.', 'wp-floorplan-360' ),
                    'clearAllRooms'      => __( 'Clear All Rooms', 'wp-floorplan-360' ),
                    'seedMode'           => __( 'Seed Rooms', 'wp-floorplan-360' ),
                    'seedModeActive'     => __( '✕ Cancel Seed Mode', 'wp-floorplan-360' ),
                    'seedModeHint'       => __( 'Click once inside each room, then click Run Fill.', 'wp-floorplan-360' ),
                    'runFill'            => __( 'Run Fill', 'wp-floorplan-360' ),
                    'clearSeeds'         => __( 'Clear Seeds', 'wp-floorplan-360' ),
                    'rectTool'           => __( 'Rectangle', 'wp-floorplan-360' ),
                    'rectModeActive'     => __( '✕ Cancel Rectangle', 'wp-floorplan-360' ),
                    'polyTool'           => __( 'Polygon', 'wp-floorplan-360' ),
                    'polyModeActive'     => __( '✕ Cancel Polygon', 'wp-floorplan-360' ),
                    'mergeRooms'         => __( 'Merge', 'wp-floorplan-360' ),
                    'mergeError'         => __( 'Rooms must overlap or share an edge to merge.', 'wp-floorplan-360' ),
                    'cancel'             => __( 'Cancel', 'wp-floorplan-360' ),
                    'ok'                 => __( 'OK', 'wp-floorplan-360' ),
                    'importDxf'          => __( 'Import DXF', 'wp-floorplan-360' ),
                    'dxfSaving'          => __( 'Saving…', 'wp-floorplan-360' ),
                    'dxfSaved'           => __( 'DXF floorplan saved.', 'wp-floorplan-360' ),
                    'dxfSaveError'       => __( 'Failed to save the DXF floorplan. Please try again.', 'wp-floorplan-360' ),
                ],
            ] );
        }
    }
}