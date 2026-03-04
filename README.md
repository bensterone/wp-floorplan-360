# Floorplan 360 Viewer

A lightweight WordPress plugin that allows site owners to upload architectural floorplans, draw polygonal hotspot areas on them, and link each hotspot to a 360\u00b0 room image. When visitors click a hotspot the corresponding panoramic image opens in an embedded iframe powered by [A‑Frame](https://aframe.io).

---

## 📦 Features

- Custom post type `floorplan` with easy-to-use meta box editor
- Draw, edit, and delete polygonal hotspots directly on the floorplan image
- Assign a label and 360° panorama image to each hotspot
- Responsive front-end viewer with keyboard accessibility
- AJAX-driven iframe loader for seamless room switching
- Legacy coordinate support (automatic normalization)
- Minimal dependencies, no external frameworks besides A‑Frame (1.7.1 included here)

---

## 🚀 Installation

1. Copy the `wp-floorplan-360` folder to your WordPress `wp-content/plugins` directory.
2. Activate the plugin via **Plugins > Installed Plugins**.
3. A new menu item **Floorplans** will appear in the admin sidebar.

> ⚠️ Requires WordPress 5.0+ and PHP 7.4+.

---

## 🛠 Usage

### Creating a Floorplan

1. Navigate to **Floorplans > Add New**.
2. Give the post a title.
3. In the *Floorplan Editor* meta box:
   - Upload or select a floorplan image (PNG/JPG/SVG).
   - Click on the image to start drawing a hotspot polygon. The first point is green; click it again to close the shape.
   - Use the sidebar to give each hotspot a **Room Label** and attach a **360° Image URL** (use media library picker).
   - You can select, rename, or delete hotspots as needed.
4. Save or publish the post.

### Front‑end Behavior

When viewing a published floorplan on the front-end, the left side displays the floorplan with invisible clickable polygons. Clicking a hotspot:

- Highlights the shape
- Loads the associated 360° image in the right-hand iframe
- Subsequent clicks update the panorama without reloading the viewer

Users can also navigate via keyboard (Tab + Enter/Space) for accessibility.

---

## 🧩 Developer Notes

### File Structure
```
wp-floorplan-360/
├── assets/
│   ├── css/
│   │   ├── editor.css        # admin styles
│   │   └── viewer.css        # front-end styles
│   ├── js/
│   │   ├── aframe.min.js     # A-Frame library (external)
│   │   ├── editor.js         # admin hotspot editor logic
│   │   └── viewer.js         # front-end viewer logic
│   └── ...
├── includes/
│   ├── Admin/                # admin-specific classes
│   ├── Core/                 # registration & bootstrap
│   ├── Public/               # front-end classes
│   └── AutoLoader.php        # PSR-4 autoloader
├── templates/                # custom template for single floorplan
├── views/                    # HTML fragments for meta box & iframe
└── wp-floorplan-360.php      # plugin bootstrap
```

### Namespacing & Autoloading
Everything lives under the `Floorplan360` namespace. The autoloader converts class names to file paths using `includes/` as the base.

### Constants
- `FP360_VERSION` – plugin version, used for cache busting
- `FP360_PATH` – absolute filesystem path
- `FP360_URL` – plugin URL
- `FP360_CPT` – custom post type slug

### Actions & Filters
- `plugins_loaded` → initialize plugin
- `init` → registers CPT
- `wp_ajax_fp360_viewer` → returns iframe markup
- `template_include` → override singular template
- `admin_enqueue_scripts` / `wp_enqueue_scripts` → load assets conditionally

### JavaScript
Two vanilla scripts handle all front-end interactions. They normalize coordinates, manage SVG overlays, and cooperate via postMessage-like iframe API.

### Extending
- Add additional post meta or UI controls by extending `Admin\Editor`
- Modify template output by copying `templates/floorplan-template.php` into your theme
- Replace the viewer logic by hooking into `fp360_viewer` AJAX action if needed

---

## 🛠 Development & Testing

- Use your preferred local WP environment (e.g. LocalWP, Docker).
- Code is written in PHP 7+ and ES6 JavaScript; no build step required.
- To add linting/formatting, consider PHP_CodeSniffer and ESLint.

---

## 📄 License
GPL-2.0+

---

## 💬 Support
For questions or contributions, open an issue or submit a pull request on the repository.

Enjoy building interactive floorplans! 🏠🌐
