<?php
namespace Floorplan360\Core;

/**
 * DxfMeta
 *
 * Registers the three post-meta fields used by the DXF pipeline and exposes
 * them through the REST API so the editor JS can read and write them without
 * a full page reload.
 *
 * Meta fields:
 *   _fp360_svg_markup        — sanitised SVG string (longtext)
 *   _fp360_dxf_attachment_id — WP attachment ID of the original .dxf file
 *   _fp360_dxf_layers        — JSON string: layer visibility state
 */
class DxfMeta {

    public function register() {
        add_action( 'init', [ $this, 'register_meta' ] );
    }

    public function register_meta() {
        $auth = function () {
            return current_user_can( 'edit_posts' );
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

        // Layer visibility state (JSON string)
        register_post_meta( FP360_CPT, '_fp360_dxf_layers', [
            'type'              => 'string',
            'single'            => true,
            'default'           => '',
            'show_in_rest'      => true,
            'auth_callback'     => $auth,
            'sanitize_callback' => 'sanitize_text_field',
        ] );
    }

    /**
     * Server-side belt-and-suspenders sanitisation of the SVG string.
     * The JS already runs DOMPurify before sending; this is an extra layer.
     *
     * @param  string $svg  Raw SVG markup from the REST request.
     * @return string       Sanitised SVG markup.
     */
    public function sanitize_svg( string $svg ): string {
        return wp_kses( $svg, $this->svg_kses_allowed() );
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
        ];
    }
}
