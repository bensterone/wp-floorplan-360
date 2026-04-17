<?php
namespace Floorplan360\Core;

/**
 * DxfMeta
 *
 * Registers the post-meta fields used by the DXF pipeline and the editor
 * REST flow, so the editor JS can read and write them without a full reload.
 *
 * Meta fields:
 *   _fp360_svg_markup        — sanitised SVG string (longtext)
 *   _fp360_dxf_attachment_id — WP attachment ID of the original .dxf file
 *   _fp360_dxf_layers        — JSON object: layer visibility state
 *   _fp360_image             — raster floorplan URL (cleared atomically on DXF import)
 *   _fp360_hotspots          — JSON array of room polygons (atomic write on DXF import)
 */
class DxfMeta {

    public function register() {
        add_action( 'init', [ $this, 'register_meta' ] );
    }

    public function register_meta() {
        // Checks permission against the specific post being edited, not just the
        // generic capability — prevents Contributors from overwriting other users'
        // floorplans (IDOR). WordPress passes ($allowed, $meta_key, $post_id).
        $auth = function ( $allowed, $meta_key, $post_id ) {
            return current_user_can( 'edit_post', $post_id );
        };

        // SVG markup — large text, sanitised on save
        register_post_meta( FP360_CPT, '_fp360_svg_markup', [
            'type'              => 'string',
            'single'            => true,
            'default'           => '',
            'show_in_rest'      => true,
            'auth_callback'     => $auth,
            'sanitize_callback' => [ $this, 'sanitize_svg' ],
        ] );

        // Original DXF attachment ID
        register_post_meta( FP360_CPT, '_fp360_dxf_attachment_id', [
            'type'          => 'integer',
            'single'        => true,
            'default'       => 0,
            'show_in_rest'  => true,
            'auth_callback' => $auth,
        ] );

        // Layer visibility state — JSON object of { layerName: bool }.
        // sanitize_text_field() would strip < and > from layer names that legally
        // contain them in CAD (e.g. "Walls<Interior>") and corrupt the JSON, so
        // we decode-validate-re-encode instead.
        register_post_meta( FP360_CPT, '_fp360_dxf_layers', [
            'type'              => 'string',
            'single'            => true,
            'default'           => '',
            'show_in_rest'      => true,
            'auth_callback'     => $auth,
            'sanitize_callback' => [ self::class, 'sanitize_layers_json' ],
        ] );

        // Raster floorplan image URL — registered here so the REST API can clear
        // it when a DXF import replaces the raster background.
        register_post_meta( FP360_CPT, '_fp360_image', [
            'type'              => 'string',
            'single'            => true,
            'default'           => '',
            'show_in_rest'      => true,
            'auth_callback'     => $auth,
            'sanitize_callback' => 'sanitize_url',
        ] );

        // Hotspots JSON — registered for REST so the DXF importer can persist
        // auto-detected rooms atomically with the SVG markup. Same Hotspots::sanitize_json
        // helper is used by the classic form-submit path (Admin\Editor::save_meta).
        register_post_meta( FP360_CPT, '_fp360_hotspots', [
            'type'              => 'string',
            'single'            => true,
            'default'           => '[]',
            'show_in_rest'      => true,
            'auth_callback'     => $auth,
            'sanitize_callback' => [ Hotspots::class, 'sanitize_json' ],
        ] );
    }

    /**
     * Validate and re-encode the layer visibility JSON.
     *
     * Decodes to an associative array of { layerName: bool }. Layer names are
     * passed through unchanged (CAD layer names may contain spaces, punctuation,
     * and angle brackets); values are coerced to boolean. On any decode failure
     * an empty object is returned so a malformed payload never overwrites
     * stored state with junk.
     *
     * @param  string $raw  Raw JSON string.
     * @return string       Sanitised JSON string.
     */
    public static function sanitize_layers_json( string $raw ): string {
        $decoded = json_decode( $raw, true );
        if ( ! is_array( $decoded ) ) {
            return '{}';
        }
        $clean = [];
        foreach ( $decoded as $name => $visible ) {
            // Reject non-string keys; everything else accepted as-is.
            if ( ! is_string( $name ) ) continue;
            $clean[ $name ] = (bool) $visible;
        }
        // JSON_FORCE_OBJECT keeps `{}` from becoming `[]` when $clean is empty.
        return wp_json_encode( $clean, JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT );
    }

    /**
     * Server-side belt-and-suspenders sanitisation of the SVG string.
     * The JS already runs DOMPurify before sending; this is an extra layer.
     *
     * wp_kses internally lowercases all attribute names, which breaks SVG's
     * case-sensitive `viewBox` attribute. We restore the correct casing after
     * sanitisation so the SVG scales responsively in the browser.
     *
     * @param  string $svg  Raw SVG markup from the REST request.
     * @return string       Sanitised SVG markup with viewBox casing restored.
     */
    public function sanitize_svg( string $svg ): string {
        return self::kses_svg( $svg );
    }

    /**
     * Sanitise an SVG string for safe output and restore case-sensitive
     * attributes that wp_kses unconditionally lowercases.
     *
     * Use this everywhere SVG markup is echoed to the page (templates, meta-box).
     *
     * @param  string $svg  SVG markup (stored or raw).
     * @return string       Safe SVG markup ready for echo.
     */
    public static function kses_svg( string $svg ): string {
        $clean = wp_kses( $svg, self::svg_kses_allowed() );
        // wp_kses lowercases attribute names; SVG requires camelCase for viewBox.
        return str_replace( 'viewbox=', 'viewBox=', $clean );
    }

    /**
     * Returns the wp_kses allowlist for SVG elements and attributes.
     *
     * @return array
     */
    public static function svg_kses_allowed(): array {
        return [
            'svg'      => [ 'xmlns' => true, 'viewbox' => true, 'width' => true, 'height' => true, 'class' => true ],
            'g'        => [ 'id' => true, 'style' => true, 'transform' => true, 'class' => true, 'stroke' => true, 'stroke-width' => true, 'fill' => true ],
            'path'     => [ 'd' => true, 'style' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
            'line'     => [ 'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'style' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
            'circle'   => [ 'cx' => true, 'cy' => true, 'r' => true, 'style' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
            'polyline' => [ 'points' => true, 'style' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
            'text'     => [ 'x' => true, 'y' => true, 'font-family' => true, 'font-size' => true, 'fill' => true, 'transform' => true, 'class' => true ],
            'rect'     => [ 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
            'use'      => [ 'href' => true, 'xlink:href' => true, 'x' => true, 'y' => true, 'class' => true ],
        ];
    }
}
