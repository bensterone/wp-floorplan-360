<?php
namespace Floorplan360\Admin;

class Editor {
    public function register() {
        add_action( 'add_meta_boxes', [ $this, 'add_meta_box' ] );
        add_action( 'save_post', [ $this, 'save_meta' ], 10, 2 );
    }

    public function add_meta_box() {
        add_meta_box(
            'fp360_editor',
            __( 'Floorplan Editor', 'wp-floorplan-360' ),
            [ $this, 'render_ui' ],
            FP360_CPT,
            'normal',
            'high'
        );

        add_meta_box(
            'fp360_settings',
            __( 'Viewer Settings', 'wp-floorplan-360' ),
            [ $this, 'render_settings' ],
            FP360_CPT,
            'side',
            'default'
        );
    }

    public function render_ui( $post ) {
        wp_nonce_field( 'fp360_save_action', 'fp360_nonce_field' );

        $floorplan_img = get_post_meta( $post->ID, '_fp360_image', true );
        $hotspots_json = get_post_meta( $post->ID, '_fp360_hotspots', true );

        if ( ! $hotspots_json ) {
            $hotspots_json = '[]';
        }

        require FP360_PATH . 'views/meta-box.php';
    }

    public function render_settings( $post ) {
        $auto_rotate     = get_post_meta( $post->ID, '_fp360_auto_rotate', true );
        $highlight_color = get_post_meta( $post->ID, '_fp360_highlight_color', true );

        // Default highlight colour — a clear, accessible blue
        if ( empty( $highlight_color ) ) {
            $highlight_color = '#0078ff';
        }
        ?>
        <p>
            <label>
                <input type="checkbox"
                       name="fp360_auto_rotate"
                       value="1"
                       <?php checked( $auto_rotate, '1' ); ?> />
                <?php esc_html_e( 'Auto-rotate panorama', 'wp-floorplan-360' ); ?>
            </label>
        </p>
        <p>
            <label for="fp360_highlight_color">
                <strong><?php esc_html_e( 'Active room colour:', 'wp-floorplan-360' ); ?></strong>
            </label><br>
            <input type="color"
                   id="fp360_highlight_color"
                   name="fp360_highlight_color"
                   value="<?php echo esc_attr( $highlight_color ); ?>"
                   style="margin-top:6px; width:48px; height:28px; cursor:pointer; border:1px solid #ccc; border-radius:3px;" />
            <span style="margin-left:6px; font-size:12px; color:#666;">
                <?php esc_html_e( 'Colour of the selected room polygon', 'wp-floorplan-360' ); ?>
            </span>
        </p>
        <?php
    }

    public function save_meta( $post_id, $post ) {
        // Security checks
        if ( ! isset( $_POST['fp360_nonce_field'] ) || ! wp_verify_nonce( $_POST['fp360_nonce_field'], 'fp360_save_action' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( wp_is_post_revision( $post_id ) ) return;
        if ( $post->post_type !== FP360_CPT ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;

        // Save floorplan image URL
        if ( isset( $_POST['fp360_image'] ) ) {
            update_post_meta( $post_id, '_fp360_image', esc_url_raw( $_POST['fp360_image'] ) );
        }

        // Save Hotspot JSON data
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
                                'x' => max( 0, min( 1, (float) ( $point['x'] ?? 0 ) ) ),
                                'y' => max( 0, min( 1, (float) ( $point['y'] ?? 0 ) ) ),
                            ];
                        }
                    }
                    if ( count( $clean_points ) < 3 ) continue;

                    $clean_hotspots[] = [
                        'id'       => sanitize_key( $hotspot['id'] ?? '' ),
                        'label'    => sanitize_text_field( $hotspot['label'] ?? '' ),
                        'image360' => esc_url_raw( $hotspot['image360'] ?? '' ),
                        // Colour is a hex value — sanitize_hex_color() returns '' for
                        // invalid input, so we fall back to a safe default blue.
                        'color'    => sanitize_hex_color( $hotspot['color'] ?? '' ) ?: '#4fa8e8',
                        'points'   => $clean_points,
                    ];
                }
                update_post_meta( $post_id, '_fp360_hotspots', wp_json_encode( $clean_hotspots ) );
            }
        }
        // Save viewer settings
        update_post_meta(
            $post_id,
            '_fp360_auto_rotate',
            isset( $_POST['fp360_auto_rotate'] ) ? '1' : '0'
        );

        if ( isset( $_POST['fp360_highlight_color'] ) ) {
            $color = sanitize_hex_color( wp_unslash( $_POST['fp360_highlight_color'] ) );
            if ( $color ) {
                update_post_meta( $post_id, '_fp360_highlight_color', $color );
            }
        }
    }
}