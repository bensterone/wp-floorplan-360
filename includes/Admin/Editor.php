<?php
namespace Floorplan360\Admin;

use Floorplan360\Core\Hotspots;

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
        <input type="hidden" name="fp360_settings_present" value="1" />
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

    public function save_meta( $post_id, $post ) {
        // Security checks
        if ( ! isset( $_POST['fp360_nonce_field'] ) ) {
            return;
        }
        $nonce = sanitize_text_field( wp_unslash( $_POST['fp360_nonce_field'] ) );
        if ( ! wp_verify_nonce( $nonce, 'fp360_save_action' ) ) {
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

        // Save Hotspot JSON data — sanitisation is shared with the REST path.
        if ( isset( $_POST['fp360_hotspots'] ) ) {
            $clean = Hotspots::sanitize_json( wp_unslash( $_POST['fp360_hotspots'] ) );
            update_post_meta( $post_id, '_fp360_hotspots', $clean );
        }

        // Save viewer settings — only when the Viewer Settings meta box was actually
        // submitted. Without this guard, an unchecked checkbox is indistinguishable
        // from a meta box hidden via Editor Preferences (Gutenberg unmounts hidden
        // panels entirely), so auto-rotate would be silently disabled on every save.
        if ( isset( $_POST['fp360_settings_present'] ) ) {
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
}