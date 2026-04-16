"use strict";
(self["webpackChunkwp_floorplan_360"] = self["webpackChunkwp_floorplan_360"] || []).push([["src_editor_dxf_index_js"],{

/***/ "./src/editor/dxf/index.js"
/*!*********************************!*\
  !*** ./src/editor/dxf/index.js ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mountDxfImporter: () => (/* reexport safe */ _ui_js__WEBPACK_IMPORTED_MODULE_0__.mountDxfImporter)
/* harmony export */ });
/* harmony import */ var _ui_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ui.js */ "./src/editor/dxf/ui.js");
/**
 * dxf/index.js
 * Public API for the DXF importer module.
 * Dynamically imported from the editor when the user clicks "Import DXF".
 */



/***/ },

/***/ "./src/editor/dxf/renderer.js"
/*!************************************!*\
  !*** ./src/editor/dxf/renderer.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   layerCounts: () => (/* binding */ layerCounts),
/* harmony export */   renderSvg: () => (/* binding */ renderSvg)
/* harmony export */ });
/* harmony import */ var dompurify__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! dompurify */ "./node_modules/dompurify/dist/purify.es.mjs");
/* harmony import */ var _transformer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./transformer.js */ "./src/editor/dxf/transformer.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/editor/dxf/utils.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * renderer.js
 * Converts SVG-space geometry (output of transformer.toSvgSpace) into a
 * sanitised SVG string ready for storage as post meta.
 */





// ---------------------------------------------------------------------------
// Layer style map
// ---------------------------------------------------------------------------

var LAYER_STYLES = {
  walls: {
    stroke: '#1a1a1a',
    strokeWidth: 2.5
  },
  doors: {
    stroke: '#444444',
    strokeWidth: 1.0
  },
  windows: {
    stroke: '#555555',
    strokeWidth: 0.8
  },
  wallitems: {
    stroke: '#777777',
    strokeWidth: 0.5
  },
  roomitems: {
    stroke: '#888888',
    strokeWidth: 0.5
  },
  plumbing: {
    stroke: '#999999',
    strokeWidth: 0.5
  },
  furnitures: {
    stroke: '#aaaaaa',
    strokeWidth: 0.4
  },
  nocategory: {
    stroke: '#aaaaaa',
    strokeWidth: 0.4
  },
  texts: {
    stroke: 'none',
    strokeWidth: 0
  }
};
function styleFor(layer) {
  return LAYER_STYLES[layer] || {
    stroke: '#888888',
    strokeWidth: 0.5
  };
}

// Painter's algorithm: layers further down the list are rendered on top.
var LAYER_ORDER = ['wallitems', 'nocategory', 'furnitures', 'roomitems', 'plumbing', 'walls', 'windows', 'doors'];

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

/**
 * Build the `d` attribute string for a single polyline / closed polygon.
 */
function polylineToPathD(vertices, closed) {
  if (vertices.length < 2) return '';
  var d = "M ".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(vertices[0].x), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(vertices[0].y));
  for (var i = 0; i < vertices.length - 1; i++) {
    var v = vertices[i];
    var next = vertices[i + 1];
    if (v.bulge && Math.abs(v.bulge) >= 0.01) {
      var arc = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.bulgeToSvgArc)(v, next, v.bulge);
      d += " A ".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(arc.radius), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(arc.radius), " 0 ").concat(arc.largeArc, " ").concat(arc.sweep, " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(next.x), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(next.y));
    } else {
      d += " L ".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(next.x), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(next.y));
    }
  }
  if (closed && vertices.length > 1) {
    // Handle bulge on the last vertex back to first
    var last = vertices[vertices.length - 1];
    var first = vertices[0];
    if (last.bulge && Math.abs(last.bulge) >= 0.01) {
      var _arc = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.bulgeToSvgArc)(last, first, last.bulge);
      d += " A ".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(_arc.radius), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(_arc.radius), " 0 ").concat(_arc.largeArc, " ").concat(_arc.sweep, " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(first.x), " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(first.y));
    }
    d += ' Z';
  }
  return d;
}

/**
 * Convert one geometry item to an SVG element string.
 */
function geometryToSvg(item) {
  switch (item.type) {
    case 'polyline':
      {
        var d = polylineToPathD(item.vertices, item.closed);
        return d ? "<path d=\"".concat(d, "\"/>") : '';
      }
    case 'line':
      return "<line x1=\"".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.x1), "\" y1=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.y1), "\" x2=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.x2), "\" y2=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.y2), "\"/>");
    case 'arc':
      {
        var _d = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.arcToSvgPath)(item.cx, item.cy, item.radius, item.startAngle, item.endAngle);
        return "<path d=\"".concat(_d, "\"/>");
      }
    case 'circle':
      return "<circle cx=\"".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.cx), "\" cy=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.cy), "\" r=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(item.r), "\"/>");
    default:
      return '';
  }
}

/**
 * Render a single text entity as an SVG <text> element.
 */
function textToSvg(t) {
  var transform = t.rotation ? " transform=\"rotate(".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.rotation), ",").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.x), ",").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.y), ")\"") : '';
  return "<text x=\"".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.x), "\" y=\"").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.y), "\" ") + "font-family=\"Arial,Helvetica,sans-serif\" " + "font-size=\"".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(t.height), "\" fill=\"#333333\"").concat(transform, ">") + "".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.escapeXml)(t.text), "</text>");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render the full SVG string for the given transformed data.
 *
 * @param {{ geometry: Array, texts: Array, svgHeight: number }} transformedData
 *   Output of transformer.toSvgSpace()
 * @param {Set<string>} visibleLayers
 *   Set of layer names that should be rendered
 * @returns {string}  DOMPurify-sanitised SVG markup
 */
function renderSvg(transformedData, visibleLayers) {
  var geometry = transformedData.geometry,
    texts = transformedData.texts,
    svgHeight = transformedData.svgHeight;
  var groups = [];

  // Geometry layers in painter order
  var _iterator = _createForOfIteratorHelper(LAYER_ORDER),
    _step;
  try {
    var _loop = function _loop() {
        var layerName = _step.value;
        if (!visibleLayers.has(layerName)) return 0; // continue
        var style = styleFor(layerName);
        var items = geometry.filter(function (g) {
          return g.layer === layerName;
        }).map(geometryToSvg).filter(Boolean);
        if (items.length === 0) return 0; // continue
        groups.push("  <g id=\"layer-".concat(layerName, "\" ") + "stroke=\"".concat(style.stroke, "\" stroke-width=\"").concat(style.strokeWidth, "\" fill=\"none\">") + "\n    ".concat(items.join('\n    '), "\n  </g>"));
      },
      _ret;
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      _ret = _loop();
      if (_ret === 0) continue;
    }

    // Text layer — always on top
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  if (visibleLayers.has('texts')) {
    var textItems = texts.filter(function (t) {
      return t.layer === 'texts' || t.layer === '0';
    }).map(textToSvg);
    if (textItems.length > 0) {
      groups.push("  <g id=\"layer-texts\">\n    ".concat(textItems.join('\n    '), "\n  </g>"));
    }
  }
  var svgStr = "<svg xmlns=\"http://www.w3.org/2000/svg\" " + "viewBox=\"0 0 ".concat(_transformer_js__WEBPACK_IMPORTED_MODULE_1__.SVG_WIDTH, " ").concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.r2)(svgHeight), "\" ") + "width=\"100%\" class=\"fp360-dxf-svg\">\n" + groups.join('\n') + "\n</svg>";
  return dompurify__WEBPACK_IMPORTED_MODULE_0__["default"].sanitize(svgStr, {
    USE_PROFILES: {
      svg: true,
      svgFilters: false
    },
    ADD_TAGS: ['use'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
  });
}

/**
 * Return per-layer entity counts from resolved geometry.
 * @param {{ geometry: Array, texts: Array }} transformedData
 * @returns {Object<string, number>}
 */
function layerCounts(transformedData) {
  var counts = {};
  var _iterator2 = _createForOfIteratorHelper(transformedData.geometry),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var item = _step2.value;
      counts[item.layer] = (counts[item.layer] || 0) + 1;
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  var _iterator3 = _createForOfIteratorHelper(transformedData.texts),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var t = _step3.value;
      counts[t.layer] = (counts[t.layer] || 0) + 1;
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  return counts;
}

/***/ },

/***/ "./src/editor/dxf/transformer.js"
/*!***************************************!*\
  !*** ./src/editor/dxf/transformer.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SVG_WIDTH: () => (/* binding */ SVG_WIDTH),
/* harmony export */   calculateBBox: () => (/* binding */ calculateBBox),
/* harmony export */   resolveInserts: () => (/* binding */ resolveInserts),
/* harmony export */   toSvgSpace: () => (/* binding */ toSvgSpace)
/* harmony export */ });
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * transformer.js
 * Resolves INSERT entities, computes the bounding box, and converts all DXF
 * geometry from DXF world-space (Y-up, metres) to SVG viewport-space (Y-down).
 *
 * SVG internal coordinate space: width = SVG_WIDTH px, height proportional.
 */

var SVG_WIDTH = 1000;

// ---------------------------------------------------------------------------
// INSERT resolution
// ---------------------------------------------------------------------------

/**
 * Transform a single point from block-local space to drawing space.
 * @param {number} px  Block-local X
 * @param {number} py  Block-local Y
 * @param {{scaleX,scaleY,rotation,x,y}} ins  INSERT parameters
 * @returns {{x:number, y:number}}
 */
function transformPoint(px, py, ins) {
  var rad = ins.rotation * Math.PI / 180;
  var cos = Math.cos(rad);
  var sin = Math.sin(rad);
  var sx = px * ins.scaleX;
  var sy = py * ins.scaleY;
  return {
    x: sx * cos - sy * sin + ins.x,
    y: sx * sin + sy * cos + ins.y
  };
}

/**
 * Adjust bulge sign for mirrored inserts (negative scale product).
 * When scaleX * scaleY < 0 the geometry is mirrored, reversing arc direction.
 */
function adjustBulge(bulge, ins) {
  return ins.scaleX * ins.scaleY < 0 ? -bulge : bulge;
}

/**
 * Expand all INSERT entities in `rawEntities` by looking up their block
 * definitions and transforming every block-entity into drawing space.
 *
 * Returns a flat entity bucket with the same shape as the parser output but
 * with no inserts — just resolved geometry (polylines, lines, arcs, circles,
 * texts).
 *
 * @param {object} rawEntities  Parser-produced entity bucket
 * @param {object} blocks       Parser-produced blocks map
 * @returns {object}  Resolved entity bucket (no inserts key)
 */
function resolveInserts(rawEntities, blocks) {
  var out = {
    polylines: _toConsumableArray(rawEntities.polylines),
    lines: _toConsumableArray(rawEntities.lines),
    arcs: _toConsumableArray(rawEntities.arcs),
    circles: _toConsumableArray(rawEntities.circles),
    texts: _toConsumableArray(rawEntities.texts)
  };
  var _iterator = _createForOfIteratorHelper(rawEntities.inserts),
    _step;
  try {
    var _loop = function _loop() {
      var ins = _step.value;
      var block = blocks[ins.blockName];
      if (!block) {
        console.warn('[fp360-dxf] INSERT references unknown block:', ins.blockName);
        return 1; // continue
      }

      // Effective layer — layer 0 inherits the INSERT's layer (DXF spec)
      function resolveLayer(entityLayer) {
        return !entityLayer || entityLayer === '0' ? ins.layer : entityLayer;
      }

      // Polylines
      var _iterator2 = _createForOfIteratorHelper(block.entities.polylines),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var poly = _step2.value;
          var verts = poly.vertices.map(function (v) {
            var p = transformPoint(v.x, v.y, ins);
            return _objectSpread(_objectSpread({}, p), {}, {
              bulge: v.bulge ? adjustBulge(v.bulge, ins) : 0
            });
          });
          out.polylines.push({
            layer: resolveLayer(poly.layer),
            vertices: verts,
            closed: poly.closed
          });
        }

        // Lines
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      var _iterator3 = _createForOfIteratorHelper(block.entities.lines),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var ln = _step3.value;
          var p1 = transformPoint(ln.x1, ln.y1, ins);
          var p2 = transformPoint(ln.x2, ln.y2, ins);
          out.lines.push({
            layer: resolveLayer(ln.layer),
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y
          });
        }

        // Arcs
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      var _iterator4 = _createForOfIteratorHelper(block.entities.arcs),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var arc = _step4.value;
          var center = transformPoint(arc.cx, arc.cy, ins);
          var radius = arc.radius * Math.abs(ins.scaleX);
          var startAngle = arc.startAngle + ins.rotation;
          var endAngle = arc.endAngle + ins.rotation;
          // Mirrored insert: swap and negate angles
          if (ins.scaleX * ins.scaleY < 0) {
            var _ref = [-endAngle, -startAngle];
            startAngle = _ref[0];
            endAngle = _ref[1];
          }
          out.arcs.push({
            layer: resolveLayer(arc.layer),
            cx: center.x,
            cy: center.y,
            radius: radius,
            startAngle: startAngle,
            endAngle: endAngle
          });
        }

        // Circles
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
      var _iterator5 = _createForOfIteratorHelper(block.entities.circles),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var circ = _step5.value;
          var _center = transformPoint(circ.cx, circ.cy, ins);
          out.circles.push({
            layer: resolveLayer(circ.layer),
            cx: _center.x,
            cy: _center.y,
            radius: circ.radius * Math.abs(ins.scaleX)
          });
        }

        // Texts
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
      var _iterator6 = _createForOfIteratorHelper(block.entities.texts),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var txt = _step6.value;
          var pos = transformPoint(txt.x, txt.y, ins);
          out.texts.push({
            layer: resolveLayer(txt.layer),
            x: pos.x,
            y: pos.y,
            height: txt.height * Math.abs(ins.scaleY),
            rotation: txt.rotation + ins.rotation,
            text: txt.text
          });
        }

        // Nested INSERTs inside a block are not handled (uncommon and expensive).
        // Log a warning if they exist.
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
      if (block.entities.inserts && block.entities.inserts.length > 0) {
        console.warn('[fp360-dxf] Nested INSERT in block', ins.blockName, '— skipped');
      }
    };
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      if (_loop()) continue;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

/**
 * Compute the bounding box of all resolved geometry (all layers, not just
 * visible ones — so bbox is stable when toggling layers).
 * Adds 8 % padding on each side.
 *
 * @param {object} resolved  Output of resolveInserts()
 * @returns {{minX,minY,maxX,maxY}}
 */
function calculateBBox(resolved) {
  var minX = Infinity,
    minY = Infinity;
  var maxX = -Infinity,
    maxY = -Infinity;
  function expand(x, y) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  var _iterator7 = _createForOfIteratorHelper(resolved.polylines),
    _step7;
  try {
    for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
      var p = _step7.value;
      var _iterator10 = _createForOfIteratorHelper(p.vertices),
        _step10;
      try {
        for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
          var v = _step10.value;
          expand(v.x, v.y);
        }
      } catch (err) {
        _iterator10.e(err);
      } finally {
        _iterator10.f();
      }
    }
  } catch (err) {
    _iterator7.e(err);
  } finally {
    _iterator7.f();
  }
  var _iterator8 = _createForOfIteratorHelper(resolved.lines),
    _step8;
  try {
    for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
      var l = _step8.value;
      expand(l.x1, l.y1);
      expand(l.x2, l.y2);
    }
  } catch (err) {
    _iterator8.e(err);
  } finally {
    _iterator8.f();
  }
  var _iterator9 = _createForOfIteratorHelper(resolved.arcs),
    _step9;
  try {
    for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
      var a = _step9.value;
      expand(a.cx - a.radius, a.cy - a.radius);
      expand(a.cx + a.radius, a.cy + a.radius);
    }
  } catch (err) {
    _iterator9.e(err);
  } finally {
    _iterator9.f();
  }
  var _iterator0 = _createForOfIteratorHelper(resolved.circles),
    _step0;
  try {
    for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
      var c = _step0.value;
      expand(c.cx - c.radius, c.cy - c.radius);
      expand(c.cx + c.radius, c.cy + c.radius);
    }
  } catch (err) {
    _iterator0.e(err);
  } finally {
    _iterator0.f();
  }
  var _iterator1 = _createForOfIteratorHelper(resolved.texts),
    _step1;
  try {
    for (_iterator1.s(); !(_step1 = _iterator1.n()).done;) {
      var t = _step1.value;
      expand(t.x, t.y);
    }
  } catch (err) {
    _iterator1.e(err);
  } finally {
    _iterator1.f();
  }
  if (!isFinite(minX)) return {
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 100
  };
  var padX = (maxX - minX) * 0.08;
  var padY = (maxY - minY) * 0.08;
  return {
    minX: minX - padX,
    minY: minY - padY,
    maxX: maxX + padX,
    maxY: maxY + padY
  };
}

// ---------------------------------------------------------------------------
// DXF → SVG coordinate transform
// ---------------------------------------------------------------------------

/**
 * Convert a DXF-space point to SVG viewport coords.
 * DXF: Y up.  SVG: Y down.  SVG_WIDTH = 1000 internal units.
 *
 * @param {number} x  DXF X
 * @param {number} y  DXF Y
 * @param {object} bbox  From calculateBBox()
 * @param {number} scale  (bbox.maxX - bbox.minX) / SVG_WIDTH, pre-computed
 * @param {number} svgH   SVG height in internal units, pre-computed
 * @returns {{x:number, y:number}}
 */
function dxfToSvg(x, y, bbox, scale, svgH) {
  return {
    x: (x - bbox.minX) / scale,
    y: svgH - (y - bbox.minY) / scale
  };
}

// ---------------------------------------------------------------------------
// Full transform: resolved entities → SVG-space entities
// ---------------------------------------------------------------------------

/**
 * Transform all resolved geometry into SVG viewport coordinates.
 *
 * @param {object} resolved  Output of resolveInserts()
 * @param {object} bbox      Output of calculateBBox()
 * @returns {{ geometry: Array, texts: Array, svgHeight: number }}
 */
function toSvgSpace(resolved, bbox) {
  var scale = (bbox.maxX - bbox.minX) / SVG_WIDTH;
  var svgH = (bbox.maxY - bbox.minY) / scale;
  var geometry = [];
  var texts = [];

  // Polylines
  var _iterator11 = _createForOfIteratorHelper(resolved.polylines),
    _step11;
  try {
    for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
      var p = _step11.value;
      var verts = p.vertices.map(function (v) {
        var s = dxfToSvg(v.x, v.y, bbox, scale, svgH);
        return {
          x: s.x,
          y: s.y,
          bulge: v.bulge || 0
        };
      });
      geometry.push({
        type: 'polyline',
        layer: p.layer,
        vertices: verts,
        closed: p.closed
      });
    }

    // Lines
  } catch (err) {
    _iterator11.e(err);
  } finally {
    _iterator11.f();
  }
  var _iterator12 = _createForOfIteratorHelper(resolved.lines),
    _step12;
  try {
    for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
      var l = _step12.value;
      var p1 = dxfToSvg(l.x1, l.y1, bbox, scale, svgH);
      var p2 = dxfToSvg(l.x2, l.y2, bbox, scale, svgH);
      geometry.push({
        type: 'line',
        layer: l.layer,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y
      });
    }

    // Arcs — store center/radius in SVG space + original DXF angles (handled in renderer)
  } catch (err) {
    _iterator12.e(err);
  } finally {
    _iterator12.f();
  }
  var _iterator13 = _createForOfIteratorHelper(resolved.arcs),
    _step13;
  try {
    for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
      var a = _step13.value;
      var c = dxfToSvg(a.cx, a.cy, bbox, scale, svgH);
      geometry.push({
        type: 'arc',
        layer: a.layer,
        cx: c.x,
        cy: c.y,
        radius: a.radius / scale,
        startAngle: a.startAngle,
        endAngle: a.endAngle
      });
    }

    // Circles
  } catch (err) {
    _iterator13.e(err);
  } finally {
    _iterator13.f();
  }
  var _iterator14 = _createForOfIteratorHelper(resolved.circles),
    _step14;
  try {
    for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
      var _c = _step14.value;
      var center = dxfToSvg(_c.cx, _c.cy, bbox, scale, svgH);
      geometry.push({
        type: 'circle',
        layer: _c.layer,
        cx: center.x,
        cy: center.y,
        r: _c.radius / scale
      });
    }

    // Texts
  } catch (err) {
    _iterator14.e(err);
  } finally {
    _iterator14.f();
  }
  var _iterator15 = _createForOfIteratorHelper(resolved.texts),
    _step15;
  try {
    for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
      var t = _step15.value;
      var pos = dxfToSvg(t.x, t.y, bbox, scale, svgH);
      var height = Math.max(t.height / scale, 11);
      texts.push({
        layer: t.layer,
        x: pos.x,
        y: pos.y,
        height: height,
        rotation: -t.rotation,
        // negate for Y-flip
        text: t.text
      });
    }
  } catch (err) {
    _iterator15.e(err);
  } finally {
    _iterator15.f();
  }
  return {
    geometry: geometry,
    texts: texts,
    svgHeight: svgH
  };
}

/***/ },

/***/ "./src/editor/dxf/ui.js"
/*!******************************!*\
  !*** ./src/editor/dxf/ui.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mountDxfImporter: () => (/* binding */ mountDxfImporter)
/* harmony export */ });
/* harmony import */ var _transformer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./transformer.js */ "./src/editor/dxf/transformer.js");
/* harmony import */ var _renderer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./renderer.js */ "./src/editor/dxf/renderer.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * dxf/ui.js
 * Modal panel for DXF import: file picker, Web Worker progress,
 * layer toggles, SVG preview, rooms list, Apply/Cancel.
 *
 * Exported: mountDxfImporter(container, { onApply, onCancel })
 */




// Layers that should be checked ON by default in the toggle list + used for room labels.
var DEFAULT_ON = new Set(['walls', 'doors', 'windows', 'texts', 'roomitems', 'nocategory']);

// Layer display order in the checkbox list (matches the painter render order).
var LAYER_DISPLAY_ORDER = ['walls', 'doors', 'windows', 'texts', 'wallitems', 'roomitems', 'plumbing', 'furnitures', 'nocategory'];

// Timeout for worker parse (30 s).
var WORKER_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Internal state (per-mount instance)
// ---------------------------------------------------------------------------

var _parsed = null; // raw parser output
var _transformed = null; // toSvgSpace() output
var _visibleLayers = new Set(DEFAULT_ON);
var _worker = null;
var _workerTimer = null;
var _dxfFile = null;
var _layerState = {}; // { layerName: boolean } for persistence

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el(tag) {
  var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var e = document.createElement(tag);
  for (var _i = 0, _Object$entries = Object.entries(attrs); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
      k = _Object$entries$_i[0],
      v = _Object$entries$_i[1];
    if (k === 'className') e.className = v;else if (k === 'style') e.style.cssText = v;else e.setAttribute(k, v);
  }
  if (text) e.textContent = text;
  return e;
}

// ---------------------------------------------------------------------------
// Modal markup
// ---------------------------------------------------------------------------

function buildModal(callbacks) {
  /* ---- Overlay ---- */
  var overlay = el('div', {
    id: 'fp360-dxf-modal',
    style: 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;' + 'display:flex;align-items:center;justify-content:center;' + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
  });

  /* ---- Dialog ---- */
  var dialog = el('div', {
    style: 'background:#fff;border-radius:4px;width:90%;max-width:860px;' + 'max-height:90vh;display:flex;flex-direction:column;' + 'box-shadow:0 8px 32px rgba(0,0,0,.35);overflow:hidden;'
  });

  /* ---- Header ---- */
  var header = el('div', {
    style: 'display:flex;align-items:center;justify-content:space-between;' + 'padding:14px 20px;border-bottom:1px solid #e0e0e0;background:#f9f9f9;'
  });
  var title = el('h3', {
    style: 'margin:0;font-size:15px;color:#1d2327;'
  }, 'Import DXF Floorplan');
  var closeBtn = el('button', {
    style: 'background:none;border:none;cursor:pointer;font-size:20px;color:#666;padding:0;'
  }, '×');
  closeBtn.addEventListener('click', callbacks.onCancel);
  header.append(title, closeBtn);

  /* ---- File row ---- */
  var fileRow = el('div', {
    style: 'padding:12px 20px;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;gap:12px;'
  });
  var fileInput = el('input', {
    type: 'file',
    accept: '.dxf',
    style: 'flex:1;'
  });
  var fileLabel = el('span', {
    style: 'font-size:13px;color:#666;'
  }, 'No file selected');
  fileRow.append(fileInput, fileLabel);

  /* ---- Body (preview + sidebar) ---- */
  var body = el('div', {
    style: 'display:flex;flex:1;overflow:hidden;min-height:0;'
  });

  /* Preview pane */
  var previewPane = el('div', {
    style: 'flex:1;background:#f0f0f0;overflow:auto;position:relative;min-width:0;'
  });
  var previewBg = el('div', {
    style: 'position:absolute;inset:0;background:' + 'repeating-conic-gradient(#ccc 0% 25%,#e8e8e8 0% 50%) 0 0/20px 20px;'
  });
  var previewEl = el('div', {
    id: 'fp360-dxf-preview',
    style: 'position:relative;z-index:1;padding:8px;'
  });
  previewPane.append(previewBg, previewEl);

  /* Sidebar */
  var sidebar = el('div', {
    style: 'width:240px;flex-shrink:0;display:flex;flex-direction:column;' + 'border-left:1px solid #e0e0e0;overflow-y:auto;'
  });
  var layerSection = el('div', {
    style: 'padding:12px;border-bottom:1px solid #eee;'
  });
  var layerTitle = el('p', {
    style: 'margin:0 0 8px;font-size:12px;font-weight:600;color:#1d2327;text-transform:uppercase;letter-spacing:.5px;'
  }, 'Layers');
  var layerList = el('div', {
    id: 'fp360-dxf-layers',
    style: 'display:flex;flex-direction:column;gap:4px;'
  });
  layerSection.append(layerTitle, layerList);
  var roomSection = el('div', {
    style: 'padding:12px;'
  });
  var roomTitle = el('p', {
    style: 'margin:0 0 8px;font-size:12px;font-weight:600;color:#1d2327;text-transform:uppercase;letter-spacing:.5px;'
  }, 'Rooms detected');
  var roomNote = el('p', {
    style: 'font-size:11px;color:#888;margin:-4px 0 8px 0;'
  }, 'Labels are taken from layers: texts, roomitems, nocategory');
  var roomList = el('ul', {
    id: 'fp360-dxf-rooms',
    style: 'margin:0;padding:0;list-style:none;font-size:13px;color:#444;'
  });
  roomSection.append(roomTitle, roomNote, roomList);
  sidebar.append(layerSection, roomSection);
  body.append(previewPane, sidebar);

  /* ---- Footer ---- */
  var footer = el('div', {
    style: 'display:flex;align-items:center;justify-content:space-between;' + 'padding:10px 20px;border-top:1px solid #e0e0e0;background:#f9f9f9;'
  });
  var progressWrap = el('div', {
    style: 'flex:1;display:flex;align-items:center;gap:10px;'
  });
  var progressBar = el('div', {
    id: 'fp360-dxf-progress-bar',
    style: 'flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;'
  });
  var progressFill = el('div', {
    style: 'height:100%;width:0;background:#0073aa;transition:width .15s;'
  });
  progressBar.appendChild(progressFill);
  var progressText = el('span', {
    style: 'font-size:12px;color:#666;white-space:nowrap;'
  });
  progressWrap.append(progressBar, progressText);
  var btnGroup = el('div', {
    style: 'display:flex;gap:8px;'
  });
  var cancelBtn = el('button', {
    className: 'button',
    style: 'margin-left:12px;'
  }, 'Cancel');
  var applyBtn = el('button', {
    className: 'button button-primary',
    disabled: 'disabled'
  }, 'Apply');
  cancelBtn.addEventListener('click', callbacks.onCancel);
  applyBtn.addEventListener('click', function () {
    return callbacks.onApply();
  });
  btnGroup.append(cancelBtn, applyBtn);
  footer.append(progressWrap, btnGroup);
  dialog.append(header, fileRow, body, footer);
  overlay.appendChild(dialog);

  // Close on overlay click (outside dialog)
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) callbacks.onCancel();
  });
  return {
    overlay: overlay,
    fileInput: fileInput,
    fileLabel: fileLabel,
    previewEl: previewEl,
    layerList: layerList,
    roomList: roomList,
    progressFill: progressFill,
    progressText: progressText,
    applyBtn: applyBtn
  };
}

// ---------------------------------------------------------------------------
// Layer toggle UI
// ---------------------------------------------------------------------------

var _reRenderTimer = null;
function buildLayerToggles(layerList, layerNames, counts, onToggle) {
  layerList.innerHTML = '';
  var _iterator = _createForOfIteratorHelper(LAYER_DISPLAY_ORDER),
    _step;
  try {
    var _loop = function _loop() {
        var name = _step.value;
        if (!layerNames.has(name) && name !== 'walls') return 0; // continue
        if (name === '0') return 0; // continue
        var count = counts[name] || 0;
        var checked = _visibleLayers.has(name);
        var row = el('label', {
          style: 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;'
        });
        var cb = el('input', {
          type: 'checkbox'
        });
        cb.checked = checked;
        var label = el('span', {}, "".concat(name));
        var badge = el('span', {
          style: 'margin-left:auto;font-size:11px;color:#999;'
        }, String(count));
        row.append(cb, label, badge);
        layerList.appendChild(row);
        cb.addEventListener('change', function () {
          if (cb.checked) _visibleLayers.add(name);else _visibleLayers["delete"](name);
          _layerState[name] = cb.checked;

          // Debounced re-render
          clearTimeout(_reRenderTimer);
          _reRenderTimer = setTimeout(onToggle, 200);
        });
      },
      _ret;
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      _ret = _loop();
      if (_ret === 0) continue;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}

// ---------------------------------------------------------------------------
// Preview re-render (called on layer toggle)
// ---------------------------------------------------------------------------

function rerenderPreview(previewEl) {
  if (!_transformed) return;
  var svg = (0,_renderer_js__WEBPACK_IMPORTED_MODULE_1__.renderSvg)(_transformed, _visibleLayers);
  previewEl.innerHTML = svg;
}

// ---------------------------------------------------------------------------
// Rooms list
// ---------------------------------------------------------------------------

function buildRoomList(roomList, texts) {
  roomList.innerHTML = '';
  var roomTexts = texts.filter(function (t) {
    return t.layer === 'texts' || t.layer === 'roomitems' || t.layer === '0' || t.layer === 'nocategory';
  });
  if (roomTexts.length === 0) {
    var li = el('li', {
      style: 'color:#999;font-style:italic;'
    }, 'No room labels found');
    roomList.appendChild(li);
    return;
  }
  var _iterator2 = _createForOfIteratorHelper(roomTexts),
    _step2;
  try {
    var _loop2 = function _loop2() {
      var t = _step2.value;
      // Seed editable label from parsed text; mutations are written back to t.label.
      t.label = t.text;
      var li = el('li', {
        style: 'padding:2px 0;'
      });
      var input = el('input', {
        type: 'text',
        style: 'width:100%;font-size:13px;border:1px solid #ddd;padding:2px 4px;border-radius:2px;box-sizing:border-box;'
      });
      input.value = t.label;
      input.addEventListener('input', function () {
        t.label = input.value;
      });
      li.appendChild(input);
      roomList.appendChild(li);
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      _loop2();
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
}

// ---------------------------------------------------------------------------
// Worker management
// ---------------------------------------------------------------------------

function terminateWorker() {
  if (_worker) {
    _worker.terminate();
    _worker = null;
  }
  if (_workerTimer) {
    clearTimeout(_workerTimer);
    _workerTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Mount the DXF importer modal inside `container`.
 *
 * @param {HTMLElement} container
 * @param {{ onApply: Function, onCancel: Function }} callbacks
 *   onApply(svgMarkup: string, rooms: Array) — called when user clicks Apply.
 *   onCancel() — called when user cancels.
 */
function mountDxfImporter(container, _ref) {
  var _onApply = _ref.onApply,
    _onCancel = _ref.onCancel;
  // Reset instance state
  _parsed = null;
  _transformed = null;
  _visibleLayers = new Set(DEFAULT_ON);
  _layerState = {};
  _dxfFile = null;
  terminateWorker();
  var dom = buildModal({
    onCancel: function onCancel() {
      terminateWorker();
      if (dom.overlay.parentNode) dom.overlay.parentNode.removeChild(dom.overlay);
      _onCancel();
    },
    onApply: function onApply() {
      if (!_transformed) return;
      var svgMarkup = (0,_renderer_js__WEBPACK_IMPORTED_MODULE_1__.renderSvg)(_transformed, _visibleLayers);
      var rooms = _transformed.texts.filter(function (t) {
        return t.layer === 'texts' || t.layer === 'roomitems' || t.layer === '0' || t.layer === 'nocategory';
      }).map(function (t) {
        return {
          label: t.label || t.text,
          normX: t.x / 1000,
          normY: t.y / (_transformed.svgHeight || 1000)
        };
      });
      _onApply(svgMarkup, rooms, _dxfFile, JSON.stringify(_layerState));
      if (dom.overlay.parentNode) dom.overlay.parentNode.removeChild(dom.overlay);
    }
  });
  document.body.appendChild(dom.overlay);

  // ---- File input handler ----
  dom.fileInput.addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    _dxfFile = file;
    dom.fileLabel.textContent = "".concat(file.name, " (").concat((file.size / 1024 / 1024).toFixed(2), " MB)");

    // Large-file warning
    if (file.size > 5 * 1024 * 1024) {
      if (!confirm("This is a large file (".concat((file.size / 1024 / 1024).toFixed(1), " MB). Parsing may take a moment. Continue?"))) {
        dom.fileInput.value = '';
        dom.fileLabel.textContent = 'No file selected';
        return;
      }
    }
    dom.progressText.textContent = 'Reading file…';
    dom.progressFill.style.width = '0%';
    dom.applyBtn.disabled = true;
    dom.previewEl.innerHTML = '';
    terminateWorker();
    var reader = new FileReader();
    reader.onload = function () {
      startWorker(reader.result, dom);
    };
    reader.onerror = function () {
      setStatus(dom, 'error', 'Failed to read the file.');
    };
    // Force Windows-1252 for DXF R2000 compatibility
    reader.readAsText(file, 'windows-1252');
  });
}

// ---------------------------------------------------------------------------
// Worker start & message handling
// ---------------------------------------------------------------------------

function startWorker(text, dom) {
  dom.progressText.textContent = 'Parsing…';
  _worker = new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("src_editor_dxf_parser_worker_js"), __webpack_require__.b));
  _workerTimer = setTimeout(function () {
    terminateWorker();
    setStatus(dom, 'error', 'Failed to parse the DXF file. The file may be too complex or in an unsupported format.');
  }, WORKER_TIMEOUT_MS);
  _worker.postMessage({
    type: 'parse',
    text: text
  });
  _worker.onmessage = function (e) {
    var msg = e.data;
    if (msg.type === 'progress') {
      dom.progressFill.style.width = "".concat(msg.percent, "%");
      dom.progressText.textContent = "Parsing\u2026 ".concat(msg.percent, "%");
      return;
    }
    if (msg.type === 'error') {
      terminateWorker();
      setStatus(dom, 'error', msg.message || 'Parse error.');
      return;
    }
    if (msg.type === 'result') {
      clearTimeout(_workerTimer);
      _worker = null;
      handleParseResult(msg.parsed, dom);
    }
  };
  _worker.onerror = function (err) {
    terminateWorker();
    setStatus(dom, 'error', 'Failed to parse the DXF file. The file may be too complex or in an unsupported format.');
    console.error('[fp360-dxf] Worker error:', err);
  };
}

// ---------------------------------------------------------------------------
// Post-parse processing
// ---------------------------------------------------------------------------

function handleParseResult(parsed, dom) {
  _parsed = parsed;

  // Validate
  var ents = parsed.entities;
  var totalEntities = ents.polylines.length + ents.lines.length + ents.arcs.length + ents.circles.length + ents.inserts.length;
  if (totalEntities === 0) {
    setStatus(dom, 'error', "This file doesn't appear to be a valid DXF floorplan. Please check the file and try again.");
    return;
  }
  dom.progressText.textContent = 'Processing…';

  // Resolve INSERTs
  var resolved = (0,_transformer_js__WEBPACK_IMPORTED_MODULE_0__.resolveInserts)(parsed.entities, parsed.blocks);

  // Check for wall geometry
  var hasWalls = resolved.polylines.some(function (p) {
    return p.layer === 'walls';
  }) || resolved.lines.some(function (l) {
    return l.layer === 'walls';
  });
  if (!hasWalls) {
    console.warn('[fp360-dxf] No wall geometry found on "walls" layer.');
  }

  // Compute bbox and transform to SVG space
  var bbox = (0,_transformer_js__WEBPACK_IMPORTED_MODULE_0__.calculateBBox)(resolved);
  _transformed = (0,_transformer_js__WEBPACK_IMPORTED_MODULE_0__.toSvgSpace)(resolved, bbox);

  // Build layer names set from parsed data
  var layerNames = new Set(Object.keys(parsed.layers));
  // Also gather from entities in case layers table was incomplete
  var _iterator3 = _createForOfIteratorHelper(_transformed.geometry),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var g = _step3.value;
      layerNames.add(g.layer);
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var _iterator4 = _createForOfIteratorHelper(_transformed.texts),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var t = _step4.value;
      layerNames.add(t.layer);
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  layerNames["delete"]('0');

  // Default visible layers: those in DEFAULT_ON that actually exist
  _visibleLayers = new Set();
  var _iterator5 = _createForOfIteratorHelper(DEFAULT_ON),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var name = _step5.value;
      if (layerNames.has(name)) _visibleLayers.add(name);
    }

    // Initialise layerState
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  var _iterator6 = _createForOfIteratorHelper(layerNames),
    _step6;
  try {
    for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
      var _name = _step6.value;
      _layerState[_name] = _visibleLayers.has(_name);
    }

    // Build UI
  } catch (err) {
    _iterator6.e(err);
  } finally {
    _iterator6.f();
  }
  var counts = (0,_renderer_js__WEBPACK_IMPORTED_MODULE_1__.layerCounts)(_transformed);
  buildLayerToggles(dom.layerList, layerNames, counts, function () {
    return rerenderPreview(dom.previewEl);
  });
  buildRoomList(dom.roomList, _transformed.texts);
  rerenderPreview(dom.previewEl);
  setStatus(dom, 'ok', 'Parsed OK');
  dom.applyBtn.disabled = false;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function setStatus(dom, type, msg) {
  dom.progressText.textContent = msg;
  dom.progressText.style.color = type === 'error' ? '#cc1818' : '#468847';
  if (type === 'error') {
    dom.progressFill.style.width = '0%';
    dom.progressFill.style.background = '#cc1818';
  } else {
    dom.progressFill.style.width = '100%';
    dom.progressFill.style.background = '#0073aa';
  }
}

/***/ },

/***/ "./src/editor/dxf/utils.js"
/*!*********************************!*\
  !*** ./src/editor/dxf/utils.js ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   arcToSvgPath: () => (/* binding */ arcToSvgPath),
/* harmony export */   bulgeToSvgArc: () => (/* binding */ bulgeToSvgArc),
/* harmony export */   circleAttrs: () => (/* binding */ circleAttrs),
/* harmony export */   decodeUnicode: () => (/* binding */ decodeUnicode),
/* harmony export */   escapeXml: () => (/* binding */ escapeXml),
/* harmony export */   r2: () => (/* binding */ r2),
/* harmony export */   stripMtext: () => (/* binding */ stripMtext)
/* harmony export */ });
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
function decodeUnicode(text) {
  return text.replace(/\\U\+([0-9A-Fa-f]{4})/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Strip MTEXT formatting codes and return plain text.
 * Codes handled: \P (paragraph), \A...; (alignment), \f...; (font),
 * \H...; (height), \W...; (width factor), \S...^...; (stacking),
 * \~ (non-breaking space → space), {{ }} grouping braces.
 * @param {string} text
 * @returns {string}
 */
function stripMtext(text) {
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
  .replace(/[{}]/g, '').trim();
}

/**
 * Escape XML/SVG special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Round a number to 2 decimal places for compact SVG output.
 * @param {number} n
 * @returns {number}
 */
function r2(n) {
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
function bulgeToSvgArc(p1, p2, bulge) {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-9) return {
    radius: 0,
    largeArc: 0,
    sweep: 0
  };
  var absBulge = Math.abs(bulge);
  // sagitta = (chord / 2) * |bulge|
  var sagitta = dist / 2 * absBulge;
  // radius from chord and sagitta: r = (half_chord² + sagitta²) / (2 * sagitta)
  var halfChord = dist / 2;
  var radius = (halfChord * halfChord + sagitta * sagitta) / (2 * sagitta);

  // |bulge| > 1 → included angle > 180° → large arc
  var largeArc = absBulge > 1 ? 1 : 0;

  // Positive DXF bulge = CCW = after Y-flip becomes CW in SVG = sweep-flag 1
  var sweep = bulge > 0 ? 1 : 0;
  return {
    radius: radius,
    largeArc: largeArc,
    sweep: sweep
  };
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
function arcToSvgPath(cx, cy, r, startDeg, endDeg) {
  // DXF angles are CCW from positive X, but SVG Y is flipped so we negate.
  var startRad = -startDeg * Math.PI / 180;
  var endRad = -endDeg * Math.PI / 180;
  var x1 = cx + r * Math.cos(startRad);
  var y1 = cy + r * Math.sin(startRad);
  var x2 = cx + r * Math.cos(endRad);
  var y2 = cy + r * Math.sin(endRad);

  // Angular span going CCW in DXF space (before flip)
  var span = endDeg - startDeg;
  if (span <= 0) span += 360;
  var largeArc = span > 180 ? 1 : 0;
  // CCW in DXF (pre-flip) → CW in SVG → sweep=0 (SVG sweep-flag: 1=CW)
  // After Y-flip CCW becomes CW, but SVG sweep=1 is the clockwise direction.
  // End result: DXF CCW arcs use sweep=0 in Y-flipped SVG.
  var sweep = 0;
  return "M ".concat(r2(x1), " ").concat(r2(y1), " A ").concat(r2(r), " ").concat(r2(r), " 0 ").concat(largeArc, " ").concat(sweep, " ").concat(r2(x2), " ").concat(r2(y2));
}

/**
 * Return the SVG <circle> attributes for a DXF CIRCLE entity.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {string}  e.g. `cx="10.5" cy="20.3" r="5.0"`
 */
function circleAttrs(cx, cy, r) {
  return "cx=\"".concat(r2(cx), "\" cy=\"").concat(r2(cy), "\" r=\"").concat(r2(r), "\"");
}

/***/ }

}]);
//# sourceMappingURL=src_editor_dxf_index_js.editor.js.map