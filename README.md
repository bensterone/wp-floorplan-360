# Floorplan 360 Viewer

A WordPress plugin for housing cooperatives and property managers. Upload a floorplan image, draw interactive room polygons directly in the editor, assign a 360° panorama to each room, and embed the result anywhere on your site — as a dedicated page or as a Gutenberg block inside any post or page.

![Plugin Version](https://img.shields.io/badge/version-1.3.0-blue) ![PHP](https://img.shields.io/badge/PHP-7.4%2B-green) ![WordPress](https://img.shields.io/badge/WordPress-5.9%2B-blue) ![License](https://img.shields.io/badge/license-GPL--2.0%2B-orange)

---

## Features

- **Visual hotspot editor** — click directly on the floorplan to draw room polygons. Snap-to-start closing, undo support, and real-time SVG preview.
- **360° panorama viewer** — powered by A-Frame. Visitors click a room and the panorama loads in an inline viewer without leaving the page.
- **Gutenberg block** — embed any floorplan into any post or page with the `Floorplan 360 Viewer` block. Select the floorplan from the block settings panel.
- **Multiple instances** — place the block several times on the same page with different floorplans. Each viewer operates independently.
- **Responsive layout** — two-column floorplan/viewer layout on desktop, single-column stack on mobile.
- **Accessible** — all room polygons are keyboard-navigable (`Tab` to focus, `Enter` or `Space` to open). ARIA roles and labels throughout.
- **Secure** — iframe-based viewer with strict `postMessage` origin validation, `X-Frame-Options`, and `Content-Security-Policy` headers. Panorama URLs must be hosted on the same domain.
- **Translatable** — full i18n support. German (`de_DE`) translation included.

---

## Requirements

- WordPress 5.9 or higher
- PHP 7.4 or higher
- `assets/js/aframe.min.js` v1.7.1 (bundled)

---

## Installation

1. Download or clone this repository into your `wp-content/plugins/` directory:
   ```
   wp-content/plugins/wp-floorplan-360/
   ```

2. `aframe.min.js` (v1.7.1) is bundled in the repository at `assets/js/aframe.min.js` and will be copied automatically. No separate download is needed.

3. Activate the plugin in **Plugins > Installed Plugins**.

4. A **Floorplans** menu item will appear in the WordPress admin sidebar.

---

## Usage

### Creating a floorplan

1. Go to **Floorplans > Add New** and enter a title.
2. In the **Floorplan Editor** meta box, click **Select Floorplan Image** and choose an image from the Media Library (PNG, JPG, or SVG).
3. The image appears in the editor canvas.

### Drawing room hotspots

1. Click anywhere on the floorplan to place the first point — it pulses green.
2. Continue clicking to outline the room perimeter.
3. Close the shape by either:
   - Clicking back near the pulsing green first point, or
   - **Double-clicking** anywhere to close automatically.
4. Use **Undo Last Point** to remove the most recent point if needed.
5. The finished shape appears in the **Rooms & 360° Views** list below the canvas.

### Assigning panoramas

1. In the **Rooms & 360° Views** list, enter a descriptive **Room Label** for each shape.
2. Click **Pick 360** next to a room to select its panorama image from the Media Library.
3. Publish or update the floorplan post.

### Viewing on the frontend

The floorplan post has its own dedicated URL (e.g. `/floorplan/my-apartment/`). Visitors click a room polygon on the left — the 360° panorama loads in the viewer panel on the right. Room polygons are also keyboard-navigable.

### Embedding with the Gutenberg block

1. Open any post or page in the block editor.
2. Add the **Floorplan 360 Viewer** block (found under the Media category).
3. In the block settings panel on the right, select the floorplan to display.
4. Set the block alignment to **Wide width** for best results on themes with a narrow content column.

---

## How it works

**Coordinate storage** — Hotspot points are stored as normalised coordinates between `0` and `1` rather than fixed pixels. This ensures room outlines remain perfectly aligned with the floorplan image at any screen size.

**Secure iframe viewer** — When a visitor clicks a room, the plugin loads an A-Frame panorama viewer inside a sandboxed iframe served via `admin-ajax.php`. The parent page and iframe communicate through a `postMessage` handshake:

1. The iframe signals `FP360_VIEWER_READY` when A-Frame has initialised.
2. The parent sends `FP360_LOAD_IMAGE` with the panorama URL.
3. The iframe confirms `FP360_IMAGE_LOADED` on success, or `FP360_IMAGE_ERROR` on failure.

All messages are validated against the site's own origin. Panorama URLs from external domains are rejected at both the PHP and JavaScript level.

---

## Security

| Measure | Detail |
|---|---|
| Origin validation | `postMessage` events accepted only from the site's own origin |
| URL validation | Panorama URLs must share the same host as the WordPress installation |
| Frame protection | Iframe response includes `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'` |
| Input sanitisation | All saved data is sanitised server-side (`esc_url_raw`, `sanitize_text_field`, coordinate clamping) |
| Nonce verification | All meta box saves verified with `wp_verify_nonce` |
| Capability checks | `current_user_can('edit_post')` enforced on every save |

> **Note:** Panorama images must be hosted on the same domain as your WordPress site. External URLs are intentionally blocked.

---

## File structure

```
wp-floorplan-360/
├── assets/
│   ├── css/
│   │   ├── block-editor.css     # Gutenberg editor preview styles
│   │   ├── editor.css           # Admin floorplan editor styles
│   │   └── viewer.css           # Frontend viewer styles (singular + block)
│   └── js/
│       ├── aframe.min.js        # A-Frame 1.7.1 VR library (bundled, MIT licensed)
│       ├── block-editor.asset.php
│       ├── block-editor.js      # Compiled Gutenberg block (from src/)
│       ├── editor.js            # Admin hotspot drawing editor
│       └── viewer.js            # Frontend multi-instance viewer
├── includes/
│   ├── Admin/
│   │   ├── Assets.php           # Admin script/style enqueue
│   │   └── Editor.php           # Meta box registration and save logic
│   ├── Block/
│   │   └── Block.php            # Gutenberg block registration and render callback
│   ├── Core/
│   │   ├── Ajax.php             # Iframe viewer AJAX endpoint
│   │   ├── Plugin.php           # Plugin bootstrap
│   │   └── PostType.php         # Custom post type registration
│   ├── Frontend/
│   │   ├── Assets.php           # Frontend script/style enqueue
│   │   └── Viewer.php           # Template loader for singular floorplan posts
│   └── AutoLoader.php           # PSR-4 class autoloader
├── languages/
│   ├── wp-floorplan-360.pot     # Translation template
│   ├── wp-floorplan-360-de_DE.po
│   └── wp-floorplan-360-de_DE.mo
├── src/
│   └── block-editor.js          # Gutenberg block source (compile with npm)
├── templates/
│   ├── block-viewer.php         # Frontend template for the Gutenberg block
│   └── floorplan-template.php   # Singular floorplan post template
├── views/
│   ├── iframe-viewer.php        # A-Frame viewer served inside the iframe
│   └── meta-box.php             # Admin editor UI
├── block.json                   # Gutenberg block manifest
├── package.json                 # npm build configuration
├── uninstall.php                # Clean uninstall hook
└── wp-floorplan-360.php         # Plugin entry point
```

---

## Development

### Building the Gutenberg block

The block editor UI is written in modern JavaScript using `@wordpress/scripts`. The compiled output (`assets/js/block-editor.js`) is committed to the repository, so a build step is only needed if you modify `src/block-editor.js`.

```bash
npm install
npm run build
```

### Regenerating the translation template

Requires PHP and WP-CLI (`wp-cli.phar`).

```bash
php wp-cli.phar i18n make-pot . languages/wp-floorplan-360.pot --domain=wp-floorplan-360 --exclude=block.json
```

### Theme compatibility

The plugin uses a two-column flex layout. On themes with a narrow content column (such as Twenty Twenty-Five, which defaults to 645px), set the Gutenberg block alignment to **Wide width** in the editor. The singular floorplan post template automatically expands to the theme's wide width setting.

---

## Third-party libraries

| Library | Version | License | Usage |
|---|---|---|---|
| [A-Frame](https://aframe.io) | 1.7.1 | MIT | 360° panorama rendering inside the iframe viewer |

---

## License

This plugin is licensed under the [GPL-2.0+](https://www.gnu.org/licenses/gpl-2.0.html).

---

## Author

**Ben Sturm** — [WBG Zentrum eG](https://wbg-zentrum.de)