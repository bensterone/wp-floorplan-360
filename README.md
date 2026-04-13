# Floorplan 360 Viewer

A WordPress plugin for housing cooperatives and property managers. Upload a floorplan image, draw room polygons in the admin editor, assign a 360° panorama to each room, and embed the result anywhere on your site — as a dedicated page or as a Gutenberg block inside any post or page.

![Plugin Version](https://img.shields.io/badge/version-1.7.2-blue) ![PHP](https://img.shields.io/badge/PHP-7.4%2B-green) ![WordPress](https://img.shields.io/badge/WordPress-5.9%2B-blue) ![License](https://img.shields.io/badge/license-GPL--2.0%2B-orange)

---

## Features

### Admin editor
- **Rectangle tool** — click and drag to draw a room rectangle. Edges snap automatically to the nearest wall pixel in the floorplan image. The primary tool for most workflows.
- **Polygon tool** — click to place points, double-click to close. For rooms with irregular shapes or diagonal walls.
- **Vertex drag editing** — click any polygon to select it, then drag its corner handles to fine-tune the shape without redrawing.
- **Merge tool** — shift-click two overlapping rectangles and click Merge to combine them into a single L-shaped polygon. Designed for hallways and open-plan layouts.
- **Colour-coded rooms** — each room is automatically assigned a distinct colour from a 12-colour palette, visible in both the editor and the frontend viewer.
- **Viewer settings** — per-floorplan options for auto-rotating the panorama, choosing the active room highlight colour, and setting the panorama start angle.
- **Experimental tools** — auto room detection and click-to-seed fill are available behind an Experimental panel. See the note below.

### Frontend viewer
- **360° panorama viewer** — powered by A-Frame. Visitors click a room and the panorama loads in an inline viewer without leaving the page.
- **Gutenberg block** — embed any floorplan into any post or page with the `Floorplan 360 Viewer` block.
- **Multiple instances** — place the block several times on the same page with different floorplans. Each viewer operates independently.
- **Responsive layout** — two-column floorplan/viewer layout on desktop, single-column stack on mobile with a scrollable room list.
- **Accessible** — all room polygons are keyboard-navigable (`Tab` to focus, `Enter` or `Space` to open). ARIA roles and labels throughout.
- **WebGL fallback** — if the visitor's browser does not support WebGL, a clear error message is shown instead of a black box.

### Security and architecture
- **Iframe-based viewer** — A-Frame runs in a sandboxed iframe with strict `postMessage` origin validation, `X-Frame-Options`, and `Content-Security-Policy` headers.
- **CDN-compatible** — panorama URLs are validated against the WordPress media library on the server side. The frontend viewer accepts images from any origin passed by the trusted parent window, so CDN-offloaded or S3-hosted media works correctly.
- **UUID validation** — hotspot IDs are validated against a strict regex rather than passed through `sanitize_key`, preventing silent data corruption.
- **Modern PHP** — namespaced classes with PSR-4-style autoloading.
- **Modular JavaScript** — editor logic is split into ES modules under `src/editor/` and compiled to a single bundle by webpack.
- **Translatable** — full i18n support. German (`de_DE`) translation included.

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
2. In the **Floorplan Editor** meta box, click **Select Floorplan Image** and choose an image from the Media Library (PNG or JPG recommended).
3. The image appears in the editor canvas, scaled to fit the available width.

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

The floorplan post has its own dedicated URL (e.g. `/floorplan/apartment-3b/`). Visitors click a room polygon — the 360° panorama loads in the viewer panel. Rooms are also keyboard-navigable.

### Embedding with the Gutenberg block

1. Open any post or page in the block editor.
2. Add the **Floorplan 360 Viewer** block (found under the Media category).
3. In the block settings panel, select the floorplan to display.
4. Set the block alignment to **Wide width** for best results on themes with a narrow content column.

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

**Secure iframe viewer** — when a visitor clicks a room, the plugin loads an A-Frame panorama viewer inside a sandboxed iframe served via `admin-ajax.php`. The parent page and iframe communicate through a `postMessage` handshake:

1. The iframe signals `FP360_VIEWER_READY` when A-Frame has initialised.
2. The parent sends `FP360_LOAD_IMAGE` with the panorama URL.
3. The iframe confirms `FP360_IMAGE_LOADED` on success, or `FP360_IMAGE_ERROR` on failure.

All messages are validated against the site's own origin. The iframe only accepts `postMessage` events from the trusted WordPress parent window, and only loads images with `http` or `https` protocols — this allows CDN and S3-hosted panoramas to work correctly while blocking `javascript:` and `data:` URIs.

**Wall snapping** — when a rectangle is drawn, the plugin rasterises the floorplan image, applies a morphological opening to remove thin features, then searches outward from each edge for the nearest dark wall pixel and snaps to it.

---

## Security

| Measure | Detail |
|---|---|
| Origin validation | `postMessage` events accepted only from the site's own origin |
| URL validation | Server-side: panorama URLs validated against local media library — CDN-compatible. Client-side: only `http`/`https` protocols accepted. |
| Frame protection | Iframe includes `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'` |
| Input sanitisation | `esc_url_raw`, `sanitize_text_field`, UUID regex validation, coordinate clamping |
| Nonce verification | All meta box saves verified with `wp_verify_nonce` |
| Capability checks | `current_user_can('edit_post')` enforced on every save |
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
│       ├── aframe.min.js        # A-Frame 1.7.1 (bundled, MIT)
│       ├── block-editor.asset.php
│       ├── block-editor.js      # Compiled Gutenberg block
│       ├── editor.js            # Compiled admin editor
│       └── viewer.js            # Frontend viewer
├── includes/
│   ├── Admin/
│   │   ├── Assets.php
│   │   └── Editor.php
│   ├── Block/
│   │   └── Block.php
│   ├── Core/
│   │   ├── Ajax.php
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
│       ├── tools/
│       │   ├── polygon.js
│       │   ├── rectangle.js
│       │   └── merge.js
│       └── detection/
│           ├── image.js
│           ├── auto.js
│           └── seed.js
├── templates/
│   ├── block-viewer.php
│   └── floorplan-template.php
├── views/
│   ├── iframe-viewer.php
│   └── meta-box.php
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
npm run build:editor    # builds assets/js/editor.js only
npm run build:block     # builds assets/js/block-editor.js only
npm run start:editor    # watch mode for editor development
```

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

**Auto-detect / Seed fill produces poor results**
- These tools are experimental and unreliable on most real-world floorplans.
- Use the Rectangle or Polygon tool instead.

---

## Third-party libraries

| Library | Version | License | Usage |
|---|---|---|---|
| [A-Frame](https://aframe.io) | 1.7.1 | MIT | 360° panorama rendering |

---

## License

GPL-2.0+

---

## Author

**Ben Sturm** — [WBG Zentrum eG](https://wbg-zentrum.de)
