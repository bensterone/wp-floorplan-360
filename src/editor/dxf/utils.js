/**
 * utils.js
 * Shared utilities for the DXF pipeline: unicode decoding, MTEXT stripping,
 * XML escaping, and bulge-to-SVG-arc math.
 */

/**
 * Decode DXF \U+XXXX unicode escapes to real characters.
 * @param {string} text
 * @returns {string}
 */
export function decodeUnicode(text) {
    return text.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );
}

/**
 * Strip MTEXT formatting codes and return plain text.
 * Codes handled: \P (paragraph), \A...; (alignment), \f...; (font),
 * \H...; (height), \W...; (width factor), \S...^...; (stacking),
 * \~ (non-breaking space → space), {{ }} grouping braces.
 * @param {string} text
 * @returns {string}
 */
export function stripMtext(text) {
    return text
        // stacked fractions: \S<num>^<den>; → num/den
        .replace(/\\S([^;^]+)\^([^;]*);?/g, '$1/$2')
        // font, height, width, alignment, color directives
        .replace(/\\[fFhHwWaAcCpPqQ][^;]*;/g, '')
        // paragraph break
        .replace(/\\P/g, ' ')
        // non-breaking space
        .replace(/\\~/g, ' ')
        // remaining backslash codes
        .replace(/\\[^\\]/g, '')
        // remove grouping braces
        .replace(/[{}]/g, '')
        .trim();
}

/**
 * Escape XML/SVG special characters.
 * @param {string} str
 * @returns {string}
 */
export function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Round a number to 2 decimal places for compact SVG output.
 * @param {number} n
 * @returns {number}
 */
export function r2(n) {
    return Math.round(n * 100) / 100;
}

/**
 * Given two SVG-space points p1 and p2 and a DXF bulge value, return the
 * SVG arc parameters needed to draw the arc segment.
 *
 * Bulge = tan(θ/4) where θ is the central angle of the arc.
 * Positive bulge = arc curves LEFT from p1→p2 = CCW in DXF = CW in SVG (Y-flipped).
 *
 * @param {{x:number,y:number}} p1  Start point (SVG coords, after Y-flip)
 * @param {{x:number,y:number}} p2  End point (SVG coords, after Y-flip)
 * @param {number} bulge
 * @returns {{radius:number, largeArc:0|1, sweep:0|1}}
 */
export function bulgeToSvgArc(p1, p2, bulge) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1e-9) return { radius: 0, largeArc: 0, sweep: 0 };

    const absBulge = Math.abs(bulge);
    // sagitta = (chord / 2) * |bulge|
    const sagitta = (dist / 2) * absBulge;
    // radius from chord and sagitta: r = (half_chord² + sagitta²) / (2 * sagitta)
    const halfChord = dist / 2;
    const radius = (halfChord * halfChord + sagitta * sagitta) / (2 * sagitta);

    // |bulge| > 1 → included angle > 180° → large arc
    const largeArc = absBulge > 1 ? 1 : 0;

    // Positive DXF bulge = CCW = after Y-flip becomes CW in SVG = sweep-flag 1
    const sweep = bulge > 0 ? 1 : 0;

    return { radius, largeArc, sweep };
}

/**
 * Convert a DXF ARC (center/radius/startAngle/endAngle in DXF space, degrees)
 * to an SVG <path> d string. All coordinate arguments are already in SVG space
 * (Y-flipped, scaled) except the angles which are handled here.
 *
 * @param {number} cx     Center X in SVG coords
 * @param {number} cy     Center Y in SVG coords
 * @param {number} r      Radius in SVG units
 * @param {number} startDeg  Start angle in DXF degrees (CCW from east, pre-flip)
 * @param {number} endDeg    End angle in DXF degrees (CCW from east, pre-flip)
 * @returns {string}  SVG path d attribute value
 */
export function arcToSvgPath(cx, cy, r, startDeg, endDeg) {
    // DXF angles are CCW from positive X, but SVG Y is flipped so we negate.
    const startRad = (-startDeg * Math.PI) / 180;
    const endRad   = (-endDeg   * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    // Angular span going CCW in DXF space (before flip)
    let span = endDeg - startDeg;
    if (span <= 0) span += 360;
    const largeArc = span > 180 ? 1 : 0;
    // CCW in DXF (pre-flip) → CW in SVG → sweep=0 (SVG sweep-flag: 1=CW)
    // After Y-flip CCW becomes CW, but SVG sweep=1 is the clockwise direction.
    // End result: DXF CCW arcs use sweep=0 in Y-flipped SVG.
    const sweep = 0;

    return `M ${r2(x1)} ${r2(y1)} A ${r2(r)} ${r2(r)} 0 ${largeArc} ${sweep} ${r2(x2)} ${r2(y2)}`;
}

/**
 * Return the SVG <circle> attributes for a DXF CIRCLE entity.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {string}  e.g. `cx="10.5" cy="20.3" r="5.0"`
 */
export function circleAttrs(cx, cy, r) {
    return `cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"`;
}
