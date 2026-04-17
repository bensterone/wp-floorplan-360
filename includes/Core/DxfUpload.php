<?php
namespace Floorplan360\Core;

/**
 * DxfUpload
 *
 * Allows admins to upload .dxf files via the WordPress media library.
 * The DXF is stored for archival purposes only — the generated SVG is kept
 * in post meta, NOT uploaded as a media file.
 */
class DxfUpload {

    public function register() {
        add_filter( 'upload_mimes',               [ $this, 'allow_dxf_mime' ] );
        add_filter( 'wp_check_filetype_and_ext',  [ $this, 'fix_dxf_ext' ], 10, 5 );
    }

    /**
     * Add .dxf to the list of allowed upload MIME types.
     *
     * @param array $mimes
     * @return array
     */
    public function allow_dxf_mime( array $mimes ): array {
        $mimes['dxf'] = 'application/dxf';
        return $mimes;
    }

    /**
     * Bypass the real_mime check for .dxf files — but only the specific case
     * we need to fix.
     *
     * WordPress uses finfo_file() to detect the real MIME type, which identifies
     * DXF (plain text) as text/plain and therefore blocks the upload even when
     * upload_mimes allows it. We rewrite the result ONLY when finfo reported
     * text/plain for a file whose name ends in .dxf — anything else (a double
     * extension like payload.php.dxf that WordPress already rejected, a real
     * mime mismatch, an executable header) is left untouched so we don't
     * weaken WP's other security checks.
     *
     * @param array       $data      { ext, type, proper_filename }
     * @param string      $file      Path to the temp file
     * @param string      $filename  Original filename
     * @param array|null  $mimes     Allowed MIME types (unused here)
     * @param string|bool $real_mime Real MIME type detected by finfo
     * @return array
     */
    public function fix_dxf_ext( array $data, string $file, string $filename, $mimes, $real_mime ): array {
        if (
            $real_mime === 'text/plain'
            && strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) === 'dxf'
        ) {
            $data['ext']  = 'dxf';
            $data['type'] = 'application/dxf';
        }
        return $data;
    }
}
