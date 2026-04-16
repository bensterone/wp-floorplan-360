# Floorplan 360 Viewer

A WordPress plugin for housing cooperatives and property managers. Upload a raster floorplan image **or import a DXF vector drawing**, draw room polygons in the admin editor, assign a 360° panorama to each room, and embed the result anywhere on your site — as a dedicated page or as a Gutenberg block inside any post or page.

![Plugin Version](https://img.shields.io/badge/version-1.7.4-blue) ![PHP](https://img.shields.io/badge/PHP-7.4%2B-green) ![WordPress](https://img.shields.io/badge/WordPress-5.9%2B-blue) ![License](https://img.shields.io/badge/license-GPL--2.0%2B-orange)

---

## Features

### Admin editor
- **Rectangle tool** — click and drag to draw a room rectangle. Edges snap automatically to the nearest wall pixel in the floorplan image. The primary tool for most workflows.
- **Polygon tool** — click to place points, double-click to close. For rooms with irregular shapes or diagonal walls.
- **Vertex drag editing** — click any polygon to select it, then drag its corner handles to fine-tune the shape without redrawing.
- **Merge tool** — shift-click two overlapping rectangles and click Merge to combine them into a single L-shaped polygon. Designed for hallways and open-plan layouts.
- **DXF import** — import an AutoCAD DXF file directly. The plugin parses all LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, and INSERT (block reference) entities entirely in the browser (no server-side CAD library required) and renders an inline SVG. Supports multi-layer DXF files; layers are rendered in correct draw order using a Painter's algorithm. Arc bulge mathematics are fully implemented for curved wall segments.
- **Colour-coded rooms** — each room is automatically assigned a distinct colour from a 12-colour palette, visible in both the editor and the frontend viewer.
- **Viewer settings** — per-floorplan options for auto-rotating the panorama, choosing the active room highlight colour, and setting the panorama start angle.
- **Experimental tools** — auto room detection and click-to-seed fill are available behind an Experimental panel. See the note below.

### Frontend viewer
- **360° panorama viewer** — powered by A-Frame. Visitors click a room and the panorama loads in an inline viewer without leaving the page.
- **Fullscreen button** — a fullscreen toggle is rendered inside the viewer panel. Uses the native Fullscreen API on desktop browsers and a CSS fake-fullscreen fallback (`position:fixed; inset:0; height:100svh`) for iOS Safari, which does not support the Fullscreen API inside iframes.
- **Gutenberg block** — embed any floorplan into any post or page with the `Floorplan 360 Viewer` block. Works with both raster image and DXF SVG floorplans.
- **Multiple instances** — place the block several times on the same page with different floorplans. Each viewer operates independently.
- **Responsive layout** — two-column floorplan/viewer layout on desktop, single-column stack on mobile with a scrollable room list.
- **Accessible** — all room polygons are keyboard-navigable (`Tab` to focus, `Enter` or `Space` to open). ARIA roles and labels throughout.
- **Scroll to zoom** — mouse wheel zooms the panorama on desktop; two-finger pinch zooms on touch devices and trackpads.
- **Gyroscope / tilt to look** — on supported mobile devices a button appears in the viewer allowing visitors to look around by tilting their phone. iOS 13+ prompts for permission via a native dialog; Android grants it silently.
- **WebGL fallback** — if the visitor's browser does not support WebGL, a clear error message is shown instead of a black box.

### Security and architecture
- **Iframe-based viewer** — A-Frame runs in a sandboxed iframe with strict `postMessage` origin validation, `X-Frame-Options`, and `Content-Security-Policy` headers.
- **CDN-compatible** — panorama URLs are validated against the WordPress media library on the server side. The frontend viewer accepts images from any origin passed by the trusted parent window, so CDN-offloaded or S3-hosted media works correctly.
- **UUID validation** — hotspot IDs are validated against a strict regex rather than passed through `sanitize_key`, preventing silent data corruption.
- **Per-post capability checks** — REST API `auth_callback` closures use `current_user_can('edit_post', $post_id)` for all meta fields, preventing IDOR/privilege escalation by Contributors.
- **SVG sanitisation** — DXF-generated SVG is sanitised on save via `wp_kses` with an explicit SVG allowlist. A post-sanitisation `str_replace` pass restores the case-sensitive `viewBox` attribute that `wp_kses` lowercases.
- **Client-side DXF sanitisation** — DOMPurify runs on the raw SVG string in the browser before it is sent to the server, as defence-in-depth against malicious DXF files.
- **Modern PHP** — namespaced classes with PSR-4-style autoloading.
- **Modular JavaScript** — editor logic is split into ES modules under `src/editor/` and compiled by webpack. The DXF parser runs in a Web Worker to keep the UI responsive during import.
- **Translatable** — full i18n support. German (`de_DE`) translation included.

---

## Known Limitations

- **Gutenberg block: max 100 floorplans.** The block's floorplan selector loads up to 100 published floorplans (a WordPress REST API ceiling). If you manage more than 100, any beyond the first 100 cannot be selected from the block settings panel — use the floorplan's dedicated URL as a workaround.
- **DXF entity support.** The DXF parser handles LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, and INSERT entities. SPLINE, HATCH, 3DSOLID, and other complex types are silently skipped. Standard architectural floor plan exports work best.
- **Experimental room detection** (auto-detect and seed fill) is unreliable on most real-world floorplans. Use Rectangle or Polygon for all production work.

---

## Requirements

- WordPress 5.9 or higher
- PHP 7.4 or higher
- Node.js 20 or higher (development only)
- `assets/js/aframe.min.js` v1.7.1 (bundled)

---

## Installation

1. Download or clone this repository into your `wp-content/plugins/` directory:
   ```
   wp-content/plugins/wp-floorplan-360/
   ```

2. `aframe.min.js` (v1.7.1) is bundled in the repository at `assets/js/aframe.min.js`. No separate download is needed.

3. Activate the plugin in **Plugins > Installed Plugins**.

4. A **Floorplans** menu item will appear in the WordPress admin sidebar.

---

## Usage

### Creating a floorplan

1. Go to **Floorplans > Add New** and enter a title.
2. In the **Floorplan Editor** meta box:
   - Click **Select Floorplan Image** to choose a raster PNG/JPG from the Media Library, **or**
   - Click **Import DXF** to upload an AutoCAD DXF file directly from your computer.
3. The image or vector drawing appears in the editor canvas, scaled to fit the available width.

### Importing a DXF file

1. Click **Import DXF** in the toolbar.
2. Select a `.dxf` file. The file is parsed entirely in the browser by a Web Worker — no server-side CAD dependency is required.
3. The parsed geometry is rendered as an inline SVG and displayed in the canvas. All layers are preserved and drawn in correct Painter's algorithm order.
4. The SVG is sanitised and saved to the floorplan post via the REST API. The raster image field is cleared automatically.
5. Draw rooms over the vector drawing exactly as you would over a raster image.

> **Note:** DXF import supports LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, and INSERT entities. Complex solids, hatching, splines, and 3D geometry are ignored. Best results with standard architectural floor plan exports.

### Drawing rooms — Rectangle tool (recommended)

The rectangle tool is the primary workflow for standard apartments.

1. Click **Rectangle** in the toolbar — the button turns blue.
2. Click and drag over a room on the floorplan.
3. Release — the rectangle edges snap automatically to the nearest wall lines. A coloured polygon appears.
4. Repeat for each room.
5. For L-shaped rooms (e.g. a hallway): draw two overlapping rectangles, shift-click both to select them, then click **Merge**.

### Drawing rooms — Polygon tool

For irregular rooms or rooms the rectangle tool cannot capture cleanly.

1. Click **Polygon** in the toolbar — the button turns blue.
2. Click to place points around the room perimeter.
3. Close the shape by clicking near the first point (green pulse) or **double-clicking**.
4. Click **Polygon** again to exit polygon mode without saving.

### Editing rooms

- **Move a vertex** — click a polygon to select it, then drag any of the white circle handles at its corners.
- **Undo** — removes the last point while drawing in polygon mode.
- **Delete** — click the Delete button next to a room in the list below the canvas.
- **Clear All** — removes all rooms at once (with confirmation).

### Assigning panoramas

1. In the **Rooms & 360° Views** list below the canvas, enter a **Room Label** for each polygon.
2. Click **Pick 360** to select the corresponding panorama image from the Media Library.
3. Publish or update the floorplan post.

### Viewing on the frontend

The floorplan post has its own dedicated URL (e.g. `/floorplan/apartment-3b/`). Visitors click a room polygon — the 360° panorama loads in the viewer panel. Rooms are also keyboard-navigable. A fullscreen button in the viewer panel allows visitors to expand the panorama to fill the screen.

### Embedding with the Gutenberg block

1. Open any post or page in the block editor.
2. Add the **Floorplan 360 Viewer** block (found under the Media category).
3. In the block settings panel, select the floorplan to display.
4. Set the block alignment to **Wide width** for best results on themes with a narrow content column.

The block supports both raster image and DXF SVG floorplans — the correct rendering path is selected automatically server-side.

### Viewer settings

Each floorplan has a **Viewer Settings** meta box in the admin sidebar:

- **Auto-rotate panorama** — slowly rotates the camera when the panorama loads. Stops on user interaction.
- **Active room colour** — the highlight colour used for the selected room polygon on the frontend.
- **Panorama start angle** — horizontal rotation applied when the panorama first loads (-180 to 180 degrees). Useful for setting the default view direction so visitors see the most relevant part of the room immediately.

---

## Experimental tools

> **These tools are not reliably functional in the current version.** Results vary widely depending on the floorplan image. They are left in place for future development. **Use the Rectangle or Polygon tool for all production work.**

The **Experimental** button in the toolbar reveals two automatic room detection tools. They work only on clean, high-contrast black-and-white floorplans without furniture, colour fills, or decorative elements. On most real-world floorplan images they will produce incorrect or no results.

### Seed fill

1. Click **Seed Rooms** — the cursor changes to a crosshair.
2. Click once inside each room. Numbered markers appear.
3. Click **Run Fill** — the algorithm attempts to generate polygons from the marked regions.
4. Review results, delete false positives, and draw any missed rooms manually.
5. **Clear Seeds** removes all markers without running the fill.

### Auto-detect

Attempts to detect all rooms automatically with no clicks required. Click **Auto-Detect** and the algorithm runs immediately.

The **Sensitivity** slider (2–8) controls how aggressively thin features (text, furniture, door arcs) are removed before detection. This tool is unreliable on most real-world floorplans.

---

## How it works

**Coordinate storage** — hotspot points are stored as normalised coordinates between `0` and `1` rather than fixed pixels. Room outlines stay perfectly aligned with the floorplan image at any screen size.

**DXF pipeline** — when the user clicks Import DXF, the raw file bytes are handed to a Webpack-compiled Web Worker (`parser.worker.js`). The worker parses the DXF ASCII format, resolves INSERT block references recursively, applies scale/rotation/translation transforms, converts ARC entities to SVG path arcs using the bulge tangent formula, and returns a flat list of SVG path strings to the main thread. The main thread assembles them into an `<svg>` element, runs DOMPurify for client-side sanitisation, and sends the markup to the server via `wp.apiFetch` using the REST API.

**SVG sanitisation** — `DxfMeta::kses_svg()` wraps `wp_kses` with an explicit SVG element/attribute allowlist. Because `wp_kses` lowercases all attribute names and SVG's `viewBox` is case-sensitive, a `str_replace('viewbox=', 'viewBox=', ...)` pass is applied after sanitisation. This helper is called at every SVG output point: on REST save, in the singular floorplan template, in the Gutenberg block template, and in the admin meta-box.

**Secure iframe viewer** — when a visitor clicks a room, the plugin loads an A-Frame panorama viewer inside a sandboxed iframe served via `admin-ajax.php`. The parent page and iframe communicate through a `postMessage` handshake:

1. The iframe signals `FP360_VIEWER_READY` when A-Frame has initialised.
2. The parent sends `FP360_LOAD_IMAGE` with the panorama URL.
3. The iframe confirms `FP360_IMAGE_LOADED` on success, or `FP360_IMAGE_ERROR` on failure.

All messages are validated against the site's own origin. The iframe only accepts `postMessage` events from the trusted WordPress parent window, and only loads images with `http` or `https` protocols — this allows CDN and S3-hosted panoramas to work correctly while blocking `javascript:` and `data:` URIs.

**Wall snapping** — when a rectangle is drawn, the plugin rasterises the floorplan image, applies a morphological opening to remove thin features, then searches outward from each edge for the nearest dark wall pixel and snaps to it.

**Three rendering paths** — the plugin has three distinct HTML output paths that are kept consistent:
1. **Singular template** (`templates/floorplan-template.php`) — used when visiting the floorplan's own URL.
2. **Gutenberg block** (`templates/block-viewer.php` + `includes/Block/Block.php`) — used when the block is embedded in any post or page.
3. **Admin meta-box** (`views/meta-box.php`) — the editor canvas in the WordPress admin.

All three paths check for SVG markup first, then raster image, then fall back to an empty-state notice.

---

## Security

| Measure | Detail |
|---|---|
| Origin validation | `postMessage` events accepted only from the site's own origin |
| URL validation | Server-side: panorama URLs validated against local media library — CDN-compatible. Client-side: only `http`/`https` protocols accepted. |
| Frame protection | Iframe includes `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'` |
| Input sanitisation | `esc_url_raw`, `sanitize_text_field`, UUID regex validation, coordinate clamping |
| Nonce verification | All meta box saves verified with `wp_verify_nonce` |
| Per-post capability checks | REST `auth_callback` uses `current_user_can('edit_post', $post_id)` — prevents IDOR/privilege escalation by Contributors |
| SVG sanitisation | `wp_kses` with explicit allowlist + `viewBox` casing fix; DOMPurify client-side as defence-in-depth |
| WebGL check | A-Frame not loaded if WebGL unavailable — clear error shown instead |

---

## File structure

```
wp-floorplan-360/
├── assets/
│   ├── css/
│   │   ├── block-editor.css
│   │   ├── editor.css
│   │   └── viewer.css
│   └── js/
│       ├── aframe.min.js                          # A-Frame 1.7.1 (bundled, MIT)
│       ├── block-editor.asset.php
│       ├── block-editor.js                        # Compiled Gutenberg block
│       ├── editor.js                              # Compiled admin editor (main chunk)
│       ├── src_editor_dxf_index_js.editor.js      # Webpack dynamic-import chunk: DXF UI
│       ├── src_editor_dxf_parser_worker_js.editor.js  # Webpack chunk: DXF Web Worker
│       └── viewer.js                              # Frontend viewer
├── includes/
│   ├── Admin/
│   │   ├── Assets.php
│   │   └── Editor.php
│   ├── Block/
│   │   └── Block.php
│   ├── Core/
│   │   ├── Ajax.php
│   │   ├── DxfMeta.php                            # Meta registration, SVG sanitisation, kses_svg()
│   │   ├── DxfUpload.php                          # DXF MIME type handling
│   │   ├── Plugin.php
│   │   └── PostType.php
│   ├── Frontend/
│   │   ├── Assets.php
│   │   └── Viewer.php
│   └── AutoLoader.php
├── languages/
│   ├── wp-floorplan-360.pot
│   ├── wp-floorplan-360-de_DE.po
│   └── wp-floorplan-360-de_DE.mo
├── src/
│   ├── block-editor.js
│   └── editor/
│       ├── state.js
│       ├── helpers.js
│       ├── render.js
│       ├── ui.js
│       ├── dxf/
│       │   ├── index.js                           # DXF importer entry (lazy-loaded)
│       │   ├── parser.worker.js                   # Web Worker: DXF parser
│       │   ├── renderer.js                        # SVG assembly
│       │   ├── transformer.js                     # INSERT block reference resolver
│       │   ├── ui.js                              # Import dialog + REST upload
│       │   └── utils.js                           # Arc/bulge math, coordinate helpers
│       ├── tools/
│       │   ├── polygon.js
│       │   ├── rectangle.js
│       │   └── merge.js
│       ├── detection/
│       │   ├── image.js
│       │   ├── auto.js
│       │   └── seed.js
│       └── helpers/
│           └── floorplan-background.js
├── templates/
│   ├── block-viewer.php                           # Gutenberg block server-side render template
│   └── floorplan-template.php                     # Singular floorplan page template
├── views/
│   ├── iframe-viewer.php                          # A-Frame viewer (loaded in sandboxed iframe)
│   └── meta-box.php                               # Admin editor canvas + toolbar
├── block.json
├── package.json
├── webpack.editor.js
├── uninstall.php
└── wp-floorplan-360.php
```

---

## Development

### Building

```bash
npm install
npm run build           # builds both editor and block
npm run build:editor    # builds assets/js/editor.js and chunk files only
npm run build:block     # builds assets/js/block-editor.js only
npm run start:editor    # watch mode for editor development
```

The editor bundle is built by a custom `webpack.editor.js` config (not `@wordpress/scripts`) because it compiles Web Workers and dynamic imports. This produces three output files in `assets/js/`:
- `editor.js` — main editor chunk
- `src_editor_dxf_index_js.editor.js` — DXF importer UI (dynamic import chunk)
- `src_editor_dxf_parser_worker_js.editor.js` — DXF parser Web Worker chunk

All three are committed to the repository so the plugin can be installed without running `npm`.

### Regenerating translations

```bash
php wp-cli.phar i18n make-pot . languages/wp-floorplan-360.pot --domain=wp-floorplan-360 --exclude=block.json
```

Then open `languages/wp-floorplan-360-de_DE.po` in Poedit, update from the POT file, translate new strings, save, and commit both `.po` and `.mo`.

---

## Troubleshooting

**The 360° viewer shows a black box**
- Confirm `assets/js/aframe.min.js` exists in the plugin folder.
- Check the browser console for CSP or origin errors.

**Clicking a room does nothing**
- Confirm the room has a valid 360° image URL assigned in the admin.
- Ensure the polygon has at least three points.
- Re-save the floorplan post.

**The 360° image doesn't load (CDN or S3)**
- Ensure the image URL uses `http` or `https`.
- If the browser console shows a CORS error, confirm your CDN or storage bucket returns an `Access-Control-Allow-Origin` header.

**The rectangle tool does not snap to walls**
- The image must be in the WordPress Media Library — pixel data cannot be read from cross-origin images without correct CORS headers.
- Try adjusting the sensitivity slider if walls are being eroded or missed.

**DXF import produces no geometry or a blank canvas**
- Ensure the DXF file uses ASCII format (not binary DXF). Most CAD applications export ASCII by default.
- Confirm the geometry is on the XY plane. 3D geometry is ignored.
- Complex entities (SPLINE, HATCH, 3DSOLID) are not supported — use LINE and LWPOLYLINE for floor plan outlines.

**Auto-detect / Seed fill produces poor results**
- These tools are experimental and unreliable on most real-world floorplans.
- Use the Rectangle or Polygon tool instead.

---

## Changelog

### 1.7.4 (patch)

- **Fix: redundant `wp_kses` on frontend removed.** SVG is now echoed directly from the database value (already sanitised on save), eliminating a potential multi-second TTFB spike on large DXF drawings.
- **Fix: rectangle tool now works on DXF floorplans.** Previously the tool silently aborted when no raster image was present; it now falls back to a plain rectangle without wall snapping.
- **Fix: `<use>` tag added to SVG KSES allowlist.** Aligns the server-side allowlist with the client-side DOMPurify configuration.
- **Fix: nonce decoupled from Floorplan Editor meta box.** Nonce is now output via `edit_form_after_title` so Viewer Settings always save even if the editor meta box is hidden.
- **Fix: CPT registers `custom-fields` support.** Ensures conventional REST API meta handling and silences static analysis tools.

### 1.7.4 (initial)

- **DXF import** — full client-side DXF-to-SVG pipeline with Web Worker parsing, arc/bulge math, INSERT block reference resolution, and Painter's algorithm layer ordering.
- **Fullscreen viewer** — fullscreen toggle button in the panorama viewer; CSS fake-fullscreen fallback for iOS Safari.
- **Security: IDOR fix** — REST `auth_callback` for all meta fields now uses `current_user_can('edit_post', $post_id)` instead of the generic `edit_posts` capability.
- **Security: SVG `viewBox` fix** — `DxfMeta::kses_svg()` helper restores the case-sensitive `viewBox` attribute after `wp_kses` lowercases it.
- **`_fp360_image` REST registration** — the raster image URL meta field is now registered with `show_in_rest: true` so the DXF import flow can atomically clear it via the REST API.
- **Gutenberg block DXF support** — `Block::render()` now fetches `_fp360_svg_markup` and `block-viewer.php` has a full SVG/raster/empty-state branch, consistent with the singular template.
- **Webpack chunk fix** — `.gitignore` whitelist updated so dynamic-import and Web Worker chunk files (`*.editor.js`) are committed to the repository.

---

## Third-party libraries

| Library | Version | License | Usage |
|---|---|---|---|
| [A-Frame](https://aframe.io) | 1.7.1 | MIT | 360° panorama rendering |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4+ | Apache-2.0 / MPL-2.0 | Client-side SVG sanitisation |

---

## License

GPL-2.0+

---

## Author

**Ben Sturm** — [WBG Zentrum eG](https://wbg-zentrum.de)
