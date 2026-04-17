<?php
namespace Floorplan360\Core;

/**
 * Hotspots
 *
 * Centralised sanitisation for the `_fp360_hotspots` JSON payload.
 * Used by both the classic form-submit path (Admin\Editor::save_meta)
 * and the REST path (DxfMeta::register_meta), so the validation rules
 * stay in lockstep across entry points.
 */
class Hotspots {

    /**
     * Validate a hotspot ID.
     *
     * Accepts standard UUIDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) and
     * the legacy fallback format (hs_<timestamp>_<random>). Rejects anything
     * else to prevent injection via crafted IDs.
     *
     * @param  string $id  Raw ID string from JSON payload.
     * @return string      Validated ID, or empty string if invalid.
     */
    public static function sanitize_id( string $id ): string {
        if ( preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id ) ) {
            return strtolower( $id );
        }
        if ( preg_match( '/^hs_[0-9]+_[a-z0-9]+$/i', $id ) ) {
            return $id;
        }
        return '';
    }

    /**
     * Decode, validate, and re-encode a hotspots JSON payload.
     *
     * Hotspots with fewer than 3 points or invalid IDs are dropped.
     * On any decode failure the empty array `[]` is returned so a malformed
     * payload never overwrites stored data with junk.
     *
     * @param  string $raw  Raw JSON string (already wp_unslash'd).
     * @return string       Sanitised JSON string.
     */
    public static function sanitize_json( string $raw ): string {
        $decoded = json_decode( $raw, true );
        if ( ! is_array( $decoded ) ) {
            return '[]';
        }

        $clean = [];
        foreach ( $decoded as $hotspot ) {
            $points = [];
            if ( isset( $hotspot['points'] ) && is_array( $hotspot['points'] ) ) {
                foreach ( $hotspot['points'] as $point ) {
                    $points[] = [
                        'x' => max( 0, min( 1, (float) ( $point['x'] ?? 0 ) ) ),
                        'y' => max( 0, min( 1, (float) ( $point['y'] ?? 0 ) ) ),
                    ];
                }
            }
            if ( count( $points ) < 3 ) continue;

            $id = self::sanitize_id( $hotspot['id'] ?? '' );
            if ( $id === '' ) continue;

            $clean[] = [
                'id'       => $id,
                'label'    => sanitize_text_field( $hotspot['label'] ?? '' ),
                'image360' => esc_url_raw( $hotspot['image360'] ?? '' ),
                'color'    => sanitize_hex_color( $hotspot['color'] ?? '' ) ?: '#4fa8e8',
                'points'   => $points,
            ];
        }

        return wp_json_encode( $clean, JSON_UNESCAPED_UNICODE );
    }
}
