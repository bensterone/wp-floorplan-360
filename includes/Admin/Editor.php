<?php
namespace Floorplan360\Admin;

class Editor {
    public function register() {
        add_action( 'add_meta_boxes',       [ $this, 'add_meta_box' ] );
        add_action( 'save_post',            [ $this, 'save_meta' ], 10, 2 );
        // Output the nonce outside any meta box so it is always present in the
        // POST data even if the user hides the Floorplan Editor meta box via
        // Screen Options or the Gutenberg options panel.
        add_action( 'edit_form_after_title', [ $this, 'render_nonce' ] );
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

    public function render_nonce( $post ) {
        if ( $post->post_type !== FP360_CPT ) return;
        wp_nonce_field( 'fp360_save_action', 'fp360_nonce_field' );
    }

    public function render_ui( $post ) {

        $floorplan_img = get_post_meta( $post->ID, '_fp360_image', true );
        $svg_markup    = get_post_meta( $post->ID, '_fp360_svg_markup', true );
        $hotspots_json = get_post_meta( $post->ID, '_fp360_hotspots', true );

        if ( ! $hotspots_json ) {
            $hotspots_json = '[]';
        }

        require FP360_PATH . 'views/meta-box.php';
    }

    public function render_settings( $post ) {
        $auto_rotate     = get_post_meta( $post->ID, '_fp360_auto_rotate', true );
        $highlight_color = get_post_meta( $post->ID, '_fp360_highlight_color', true );
        $start_angle     = get_post_meta( $post->ID, '_fp360_start_angle', true );

        if ( empty( $highlight_color ) ) {
            $highlight_color = '#0078ff';
        }
        if ( $start_angle === '' ) {
            $start_angle = '0';
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
        <p>
            <label for="fp360_start_angle">
                <strong><?php esc_html_e( 'Panorama start angle:', 'wp-floorplan-360' ); ?></strong>
            </label><br>
            <input type="number"
                   id="fp360_start_angle"
                   name="fp360_start_angle"
                   value="<?php echo esc_attr( $start_angle ); ?>"
                   min="-180" max="180" step="1"
                   style="margin-top:6px; width:80px;" />
            <span style="margin-left:6px; font-size:12px; color:#666;">
                <?php esc_html_e( 'Horizontal rotation when panorama first loads (-180 to 180)', 'wp-floorplan-360' ); ?>
            </span>
        </p>
        <?php
    }

    /**
     * Validates a hotspot ID.
     *
     * Accepts standard UUIDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) and
     * the legacy fallback format (hs_<timestamp>_<random>). Rejects anything
     * else to prevent injection via crafted IDs.
     *
     * Using sanitize_key() was insufficient — it lowercases and strips
     * non-alphanumeric characters, which would mangle any future ID format
     * and could silently produce duplicate IDs if two values collide after
     * stripping. Explicit validation is safer.
     *
     * @param  string $id  Raw ID string from JSON payload.
     * @return string      Validated ID, or empty string if invalid.
     */
    private function validate_hotspot_id( string $id ): string {
        // Standard UUID v4: 8-4-4-4-12 hex groups separated by hyphens.
        if ( preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id ) ) {
            return strtolower( $id );
        }
        // Legacy fallback ID format: hs_<digits>_<alphanumeric>
        if ( preg_match( '/^hs_[0-9]+_[a-z0-9]+$/i', $id ) ) {
            return $id;
        }
        return '';
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
            update_post_meta( $post_id, '_fp360_image', esc_url_raw( wp_unslash( $_POST['fp360_image'] ) ) );
        }

        // Save Hotspot JSON data
        if ( isset( $_POST['fp360_hotspots'] ) ) {
            $raw     = wp_unslash( $_POST['fp360_hotspots'] );
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

                    $validated_id = $this->validate_hotspot_id( $hotspot['id'] ?? '' );
                    if ( empty( $validated_id ) ) continue; // discard hotspots with invalid IDs

                    $clean_hotspots[] = [
                        'id'       => $validated_id,
                        'label'    => sanitize_text_field( $hotspot['label'] ?? '' ),
                        'image360' => esc_url_raw( $hotspot['image360'] ?? '' ),
                        'color'    => sanitize_hex_color( $hotspot['color'] ?? '' ) ?: '#4fa8e8',
                        'points'   => $clean_points,
                    ];
                }
                update_post_meta( $post_id, '_fp360_hotspots', wp_json_encode( $clean_hotspots, JSON_UNESCAPED_UNICODE ) );
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

        if ( isset( $_POST['fp360_start_angle'] ) ) {
            $angle = (int) $_POST['fp360_start_angle'];
            $angle = max( -180, min( 180, $angle ) ); // clamp to valid range
            update_post_meta( $post_id, '_fp360_start_angle', (string) $angle );
        }
    }
}