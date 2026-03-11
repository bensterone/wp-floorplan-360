# Floorplan 360 Viewer

Floorplan 360 Viewer is a WordPress plugin that connects 2D floorplans with 360° panorama images. Site administrators can upload a floorplan, draw polygon hotspots for rooms, and assign a 360° image to each hotspot. Visitors can then click a room on the floorplan to open the corresponding panorama in an embedded viewer.

---

## Features

### Admin editor
- **Custom post type:** `floorplan`
- **SVG-based floorplan editor:** Integrated directly into the WordPress admin post editor.
- **Precision Drawing:** Draw polygon hotspots directly on the uploaded floorplan image.
- **Visual Feedback:** Snap-to-start pulsing animation while closing shapes.
- **Efficient Workflow:** Double-click to automatically close a room shape.
- **Edit Support:** Undo the last point while drawing to correct mistakes instantly.
- **Media Integration:** Assign room labels and select 360° panoramas directly from the WordPress Media Library.
- **Responsive Geometry:** Percentage-based coordinates ensure hotspots stay perfectly aligned when the image scales on different screen sizes.

### Frontend viewer
- **Responsive Layout:** Clean two-column layout separating the floorplan and the panorama viewer.
- **Interactive Overlays:** High-performance SVG room overlays with CSS-animated hover and active states.
- **A-Frame Powered:** High-quality, immersive 360° viewer based on the industry-standard A-Frame library.
- **Seamless Transitions:** Switch between panoramas instantly without reloading the entire page.
- **Full Accessibility:** Fully navigable via keyboard using `Tab` to cycle rooms and `Enter` or `Space` to select.
- **UX States:** Includes clear placeholder and loading states for a professional user experience.

### Security and architecture
- **Origin Validation:** Strict same-origin validation for all cross-frame communication.
- **Domain Restricted:** Panorama loading is restricted to the site’s own domain to prevent asset hijacking.
- **Isolated Environment:** Iframe-based viewer with hardened security headers (`X-Frame-Options`, `CSP`).
- **Modern PHP:** Namespaced classes with PSR-4-style autoloading.
- **Performance:** Frontend assets and heavy VR libraries are loaded only on singular floorplan posts.

---

## Requirements

- WordPress 5.0+
- PHP 7.4+
- A local A-Frame build included at `assets/js/aframe.min.js`

---

## Installation

1. Copy the `wp-floorplan-360` folder into your WordPress `wp-content/plugins/` directory.
2. Make sure `assets/js/aframe.min.js` is present in the plugin folder.
3. Activate the plugin in **Plugins > Installed Plugins**.
4. After activation, a new **Floorplans** menu item will appear in the WordPress admin sidebar.

---

## Usage

### 1. Create a floorplan
1. Go to **Floorplans > Add New**.
2. Enter a title for the floorplan.
3. In the **Floorplan Editor** meta box, click **Select Floorplan Image**.
4. Choose a floorplan image (PNG, JPG, or SVG) from the Media Library.

### 2. Draw hotspots
1. Click on the floorplan image to place the first point (indicated by a pulsing green circle).
2. Continue clicking to add points defining the perimeter of the room.
3. Close the shape by either:
   - Clicking back near the pulsing green starting point, or
   - **Double-clicking** to automatically connect the current point to the start.
4. Use the **Undo Last Point** button if you need to adjust your drawing.

### 3. Assign 360° panoramas
1. Once a shape is closed, it appears in the **Rooms & 360° Views** list.
2. Enter a descriptive **Room Label**.
3. Click **Pick 360** to select the corresponding panorama image from the Media Library.
4. Repeat for each room in the building.
5. Save or publish the floorplan post.

### 4. View on the frontend
- Open the published floorplan post.
- Click a room polygon on the left.
- The corresponding 360° panorama loads in the viewer on the right.
- Visitors can also navigate room hotspots using the keyboard for improved accessibility.

---

## How it works

The plugin stores hotspot shapes as normalized coordinates between `0` and `1` rather than fixed pixels. This ensures that polygons remain perfectly aligned with the floorplan image across all devices, from mobile phones to high-resolution desktop monitors.

When a visitor selects a room, the frontend loads an iframe-based panorama viewer. The parent page and the iframe communicate through a secure `postMessage` handshake. The viewer signals when it is "Ready," and the parent sends the panorama URL, which is validated before being rendered by the A-Frame engine.

---

## Security notes

This plugin includes several defensive measures:

- **Strict Messaging:** Cross-frame messages are accepted only if the `event.origin` matches the site’s configured origin.
- **URL Validation:** The AJAX viewer endpoint and the iframe itself reject panorama URLs hosted on different domains.
- **Frame Protection:** The iframe response sends strict protection headers:
  - `X-Frame-Options: SAMEORIGIN`
  - `Content-Security-Policy: frame-ancestors 'self'`
- **Internal Validation:** The iframe performs a secondary URL validation before attempting to load a new panorama into the VR sky.

### Important limitation
For security reasons, panorama images **must** be served from the same site/domain as the WordPress installation. External panorama URLs are intentionally blocked to prevent cross-site scripting and unauthorized resource usage.

---

## Data format

Hotspots are stored in the `_fp360_hotspots` post meta field as a JSON string.

**Example structure:**

```json
[
  {
    "id": "hs_ab12cd34",
    "label": "Kitchen",
    "image360": "https://example.com/wp-content/uploads/2026/03/kitchen-360.jpg",
    "points": [
      { "x": 0.12, "y": 0.28 },
      { "x": 0.34, "y": 0.27 },
      { "x": 0.36, "y": 0.44 },
      { "x": 0.14, "y": 0.45 }
    ]
  }
]
```

To convert a normalized coordinate to pixels manually:
- `pixelX = x * containerWidth`
- `pixelY = y * containerHeight`

---

## Template override

You can customize the frontend layout by providing a template in your active theme.

Create this file in your theme directory:
`your-theme/floorplan-360/floorplan-template.php`

The plugin will automatically use this file instead of the bundled template when rendering a singular floorplan post.

---

## File structure

```text
wp-floorplan-360/
├── assets/
│   ├── css/
│   │   ├── editor.css        # Admin editor styles
│   │   └── viewer.css        # Frontend layout and SVG styles
│   ├── js/
│   │   ├── aframe.min.js     # 360 VR Engine
│   │   ├── editor.js         # Hotspot drawing logic
│   │   └── viewer.js         # Handshake and communication logic
├── includes/
│   ├── Admin/
│   │   ├── Assets.php        # Admin scripts/styles registration
│   │   └── Editor.php        # Meta box and save logic
│   ├── Core/
│   │   ├── Ajax.php          # Secure iframe viewer endpoint
│   │   ├── Plugin.php        # Main plugin controller
│   │   └── PostType.php      # CPT registration
│   ├── Frontend/
│   │   ├── Assets.php        # Frontend scripts/styles registration
│   │   └── Viewer.php        # Template redirect logic
│   └── AutoLoader.php        # PSR-4 Autoloader
├── templates/
│   └── floorplan-template.php  # Default frontend template
├── views/
│   ├── iframe-viewer.php     # Isolated A-Frame environment
│   └── meta-box.php          # Admin editor UI
├── README.md
└── wp-floorplan-360.php      # Plugin bootstrap
```

---

## Developer notes

### Custom post type
The plugin registers a public custom post type with the following slug:
`floorplan`

### Frontend loading
To keep the site fast, frontend assets (including the A-Frame library) are conditionally loaded **only** on singular floorplan posts.

### Viewer transport
The 360° viewer is isolated inside an iframe for stability. It receives panorama updates through a controlled message flow only after the viewer signals a `FP360_VIEWER_READY` state.

### Autoloading
All PHP classes use the `Floorplan360` namespace and are loaded automatically through `includes/AutoLoader.php`.

---

## Troubleshooting

**The 360° viewer does not load**
- Confirm that `assets/js/aframe.min.js` exists in the plugin folder.
- Ensure the selected panorama image is hosted on the same domain as the site.
- Check the browser console for "Unauthorized image source" or CSP errors.

**Clicking a room does nothing**
- Confirm that the room has a valid 360° image URL assigned in the admin.
- Ensure the hotspot shape contains at least three points.
- Re-save/Update the floorplan post to refresh the metadata.

**The floorplan image is missing**
- Open the floorplan post in the admin and ensure an image is selected.
- If the image was deleted from the Media Library, you must re-select a new one.

**External panorama URLs are blocked**
- This is by design. The plugin intentionally rejects panorama images from other domains to maintain a strict security boundary.

---

## License
GPL-2.0+

---

## Author
**Ben Sturm / WBG Zentrum eG**
