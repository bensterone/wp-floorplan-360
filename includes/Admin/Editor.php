<?php
namespace Floorplan360\Admin;

class Editor {
    public function register() {
        add_action( 'add_meta_boxes', [ $this, 'add_meta_box' ] );
        // Verwende den allgemeinen save_post Hook für bessere Kompatibilität
        add_action( 'save_post', [ $this, 'save_meta' ], 10, 2 );
    }

    public function add_meta_box() {
        add_meta_box(
            'fp360_editor',
            'Floorplan Editor',
            [ $this, 'render_ui' ],
            FP360_CPT,
            'normal',
            'high'
        );
    }

    public function render_ui( $post ) {
        // Nonce für Sicherheit
        wp_nonce_field( 'fp360_save_action', 'fp360_nonce_field' );
        
        $floorplan_img = get_post_meta( $post->ID, '_fp360_image', true );
        $hotspots_json = get_post_meta( $post->ID, '_fp360_hotspots', true );
        
        if ( ! $hotspots_json ) {
            $hotspots_json = '[]';
        }

        require FP360_PATH . 'views/meta-box.php';
    }

    public function save_meta( $post_id, $post ) {
        // Sicherheitsprüfungen
        if ( ! isset( $_POST['fp360_nonce_field'] ) || ! wp_verify_nonce( $_POST['fp360_nonce_field'], 'fp360_save_action' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( $post->post_type !== FP360_CPT ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;

        // Bild-URL speichern
        if ( isset( $_POST['fp360_image'] ) ) {
            update_post_meta( $post_id, '_fp360_image', esc_url_raw( $_POST['fp360_image'] ) );
        }

        // Hotspots speichern
        if ( isset( $_POST['fp360_hotspots'] ) ) {
            $raw = wp_unslash( $_POST['fp360_hotspots'] );
            $decoded = json_decode( $raw, true );
            
            if ( is_array( $decoded ) ) {
                $clean_hotspots = [];
                foreach ( $decoded as $hotspot ) {
                    $clean_points = [];
                    if ( isset( $hotspot['points'] ) && is_array( $hotspot['points'] ) ) {
                        foreach ( $hotspot['points'] as $point ) {
                            $clean_points[] = [
                                'x' => floatval( $point['x'] ?? 0 ),
                                'y' => floatval( $point['y'] ?? 0 )
                            ];
                        }
                    }
                    $clean_hotspots[] = [
                        'id'       => sanitize_text_field( $hotspot['id'] ?? '' ),
                        'label'    => sanitize_text_field( $hotspot['label'] ?? '' ),
                        'image360' => esc_url_raw( $hotspot['image360'] ?? '' ),
                        'points'   => $clean_points
                    ];
                }
                update_post_meta( $post_id, '_fp360_hotspots', wp_json_encode( $clean_hotspots ) );
            }
        }
    }
}
