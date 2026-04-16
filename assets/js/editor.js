/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/editor/detection/auto.js"
/*!**************************************!*\
  !*** ./src/editor/detection/auto.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   detectRooms: () => (/* binding */ detectRooms),
/* harmony export */   traceRegions: () => (/* binding */ traceRegions)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../render.js */ "./src/editor/render.js");
/* harmony import */ var _ui_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../ui.js */ "./src/editor/ui.js");
/* harmony import */ var _image_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./image.js */ "./src/editor/detection/image.js");
/**
 * detection/auto.js
 * Fully automatic room detection — no human input required.
 * Less reliable than seed fill but zero interaction needed.
 */







/* global fp360Admin */

function detectRooms(tolerancePx) {
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth || _helpers_js__WEBPACK_IMPORTED_MODULE_1__.emptyState && _helpers_js__WEBPACK_IMPORTED_MODULE_1__.emptyState.style.display !== 'none') {
    (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('no-image');
    return;
  }
  (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('processing');
  setTimeout(function () {
    try {
      var polygons = runDetection(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl, tolerancePx);
      if (polygons.length === 0) {
        (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('none-found');
        return;
      }
      polygons.forEach(function (points) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
          id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
          points: points,
          label: fp360Admin.i18n.newRoom || 'New Room',
          image360: '',
          color: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)()
        });
      });
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('done', polygons.length);
    } catch (err) {
      console.error('FP360 Detection error:', err);
      (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('error');
    }
  }, 50);
}
function runDetection(img, tolerancePx) {
  var _preprocessImage = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.preprocessImage)(img, tolerancePx),
    W = _preprocessImage.W,
    H = _preprocessImage.H,
    scale = _preprocessImage.scale,
    opened = _preprocessImage.opened,
    sealed = _preprocessImage.sealed,
    gapK = _preprocessImage.gapK;
  var exterior = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.buildExteriorMask)(sealed, W, H);

  // Connected components on sealed interior
  var labels = new Int32Array(W * H).fill(-1);
  var regionSizes = [];
  var numLabels = 0;
  for (var i = 0; i < W * H; i++) {
    if (sealed[i] !== 255 || exterior[i] || labels[i] !== -1) continue;
    var label = numLabels++;
    var rQueue = [i];
    labels[i] = label;
    var size = 0,
      rqi = 0;
    while (rqi < rQueue.length) {
      var idx = rQueue[rqi++];
      size++;
      var x = idx % W,
        y = Math.floor(idx / W);
      if (y > 0 && sealed[idx - W] === 255 && !exterior[idx - W] && labels[idx - W] === -1) {
        labels[idx - W] = label;
        rQueue.push(idx - W);
      }
      if (y < H - 1 && sealed[idx + W] === 255 && !exterior[idx + W] && labels[idx + W] === -1) {
        labels[idx + W] = label;
        rQueue.push(idx + W);
      }
      if (x > 0 && sealed[idx - 1] === 255 && !exterior[idx - 1] && labels[idx - 1] === -1) {
        labels[idx - 1] = label;
        rQueue.push(idx - 1);
      }
      if (x < W - 1 && sealed[idx + 1] === 255 && !exterior[idx + 1] && labels[idx + 1] === -1) {
        labels[idx + 1] = label;
        rQueue.push(idx + 1);
      }
    }
    regionSizes.push(size);
  }
  var totalArea = W * H;
  var validLabels = new Set();
  regionSizes.forEach(function (size, label) {
    if (size >= totalArea * 0.002 && size <= totalArea * 0.75) validLabels.add(label);
  });
  if (validLabels.size === 0) return [];

  // Watershed expansion
  var expanded = new Int32Array(W * H).fill(-1);
  for (var _i = 0; _i < W * H; _i++) if (labels[_i] >= 0) expanded[_i] = labels[_i];
  for (var round = 0; round < gapK; round++) {
    var next = expanded.slice();
    for (var _i2 = 0; _i2 < W * H; _i2++) {
      if (expanded[_i2] >= 0 || opened[_i2] !== 255) continue;
      var _x = _i2 % W,
        _y = Math.floor(_i2 / W);
      if (_y > 0 && expanded[_i2 - W] >= 0) {
        next[_i2] = expanded[_i2 - W];
        continue;
      }
      if (_y < H - 1 && expanded[_i2 + W] >= 0) {
        next[_i2] = expanded[_i2 + W];
        continue;
      }
      if (_x > 0 && expanded[_i2 - 1] >= 0) {
        next[_i2] = expanded[_i2 - 1];
        continue;
      }
      if (_x < W - 1 && expanded[_i2 + 1] >= 0) {
        next[_i2] = expanded[_i2 + 1];
      }
    }
    expanded.set(next);
  }
  return traceRegions(validLabels, expanded, opened, W, H, scale, img);
}
function traceRegions(validLabels, expanded, opened, W, H, scale, img) {
  var polygons = [];
  var rdpTol = Math.max(3, Math.round(W / 80));
  validLabels.forEach(function (label) {
    var TARGET = 0;
    var rLbls = new Int32Array(W * H).fill(-1);
    var traceStart = -1;
    for (var i = 0; i < W * H; i++) {
      if (expanded[i] !== label) continue;
      rLbls[i] = TARGET;
      if (traceStart === -1) traceStart = i;
    }
    if (traceStart === -1) return;
    var boundary = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.mooreTrace)(rLbls, W, H, TARGET, traceStart);
    if (boundary.length < 6) return;
    var step = Math.max(1, Math.floor(boundary.length / 600));
    var sampled = boundary.filter(function (_, i) {
      return i % step === 0;
    });
    var simplified = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.rdpSimplify)(sampled, rdpTol);
    if (simplified.length < 3) return;
    var snapped = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.manhattanSnap)(simplified);
    var points = snapped.map(function (p) {
      return {
        x: Math.max(0, Math.min(1, p.x / scale / img.naturalWidth)),
        y: Math.max(0, Math.min(1, p.y / scale / img.naturalHeight))
      };
    });
    polygons.push(points);
  });
  return polygons;
}

/***/ },

/***/ "./src/editor/detection/image.js"
/*!***************************************!*\
  !*** ./src/editor/detection/image.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildExteriorMask: () => (/* binding */ buildExteriorMask),
/* harmony export */   manhattanSnap: () => (/* binding */ manhattanSnap),
/* harmony export */   mooreTrace: () => (/* binding */ mooreTrace),
/* harmony export */   morphDilate: () => (/* binding */ morphDilate),
/* harmony export */   morphErode: () => (/* binding */ morphErode),
/* harmony export */   otsuThreshold: () => (/* binding */ otsuThreshold),
/* harmony export */   preprocessImage: () => (/* binding */ preprocessImage),
/* harmony export */   rdpSimplify: () => (/* binding */ rdpSimplify)
/* harmony export */ });
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * detection/image.js
 * Shared pixel-level image processing primitives.
 * Used by both auto-detect and seed-fill pipelines.
 */

/** Erode light pixels — dark regions grow by radius px (separable box kernel). */
function morphErode(binary, W, H, radius) {
  var tmp = new Uint8Array(W * H);
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (binary[y * W + x] === 0) {
        tmp[y * W + x] = 0;
        continue;
      }
      var ok = true;
      for (var kx = -radius; kx <= radius && ok; kx++) {
        var nx = x + kx;
        if (nx >= 0 && nx < W && binary[y * W + nx] === 0) ok = false;
      }
      tmp[y * W + x] = ok ? 255 : 0;
    }
  }
  var out = new Uint8Array(W * H);
  for (var _y = 0; _y < H; _y++) {
    for (var _x = 0; _x < W; _x++) {
      if (tmp[_y * W + _x] === 0) {
        out[_y * W + _x] = 0;
        continue;
      }
      var _ok = true;
      for (var ky = -radius; ky <= radius && _ok; ky++) {
        var ny = _y + ky;
        if (ny >= 0 && ny < H && tmp[ny * W + _x] === 0) _ok = false;
      }
      out[_y * W + _x] = _ok ? 255 : 0;
    }
  }
  return out;
}

/** Dilate light pixels — dark regions shrink by radius px (separable box kernel). */
function morphDilate(binary, W, H, radius) {
  var tmp = new Uint8Array(W * H);
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (binary[y * W + x] === 255) {
        tmp[y * W + x] = 255;
        continue;
      }
      var found = false;
      for (var kx = -radius; kx <= radius && !found; kx++) {
        var nx = x + kx;
        if (nx >= 0 && nx < W && binary[y * W + nx] === 255) found = true;
      }
      tmp[y * W + x] = found ? 255 : 0;
    }
  }
  var out = new Uint8Array(W * H);
  for (var _y2 = 0; _y2 < H; _y2++) {
    for (var _x2 = 0; _x2 < W; _x2++) {
      if (tmp[_y2 * W + _x2] === 255) {
        out[_y2 * W + _x2] = 255;
        continue;
      }
      var _found = false;
      for (var ky = -radius; ky <= radius && !_found; ky++) {
        var ny = _y2 + ky;
        if (ny >= 0 && ny < H && tmp[ny * W + _x2] === 255) _found = true;
      }
      out[_y2 * W + _x2] = _found ? 255 : 0;
    }
  }
  return out;
}

/**
 * Otsu threshold — maximises inter-class variance.
 * Adapts automatically to each image's brightness distribution.
 */
function otsuThreshold(pixels, n) {
  var hist = new Array(256).fill(0);
  for (var i = 0; i < n; i++) hist[pixels[i]]++;
  var sum = 0;
  for (var _i = 0; _i < 256; _i++) sum += _i * hist[_i];
  var sumB = 0,
    wB = 0,
    maxVar = 0,
    threshold = 128;
  for (var t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    var wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    var mB = sumB / wB;
    var mF = (sum - sumB) / wF;
    var variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) {
      maxVar = variance;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Moore neighbourhood contour tracing.
 * Produces an ordered boundary pixel sequence for any connected region.
 */
function mooreTrace(labels, W, H, label, startIdx) {
  var dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  var dy = [0, -1, -1, -1, 0, 1, 1, 1];
  var startX = startIdx % W;
  var startY = Math.floor(startIdx / W);
  var result = [];
  var maxSteps = W * H;
  var cx = startX,
    cy = startY,
    entryDir = 0,
    steps = 0;
  do {
    result.push({
      x: cx,
      y: cy
    });
    var found = false;
    for (var k = 0; k < 8; k++) {
      var dir = (entryDir + k) % 8;
      var nx = cx + dx[dir];
      var ny = cy + dy[dir];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      if (labels[ny * W + nx] !== label) continue;
      entryDir = ((dir + 4) % 8 + 1) % 8;
      cx = nx;
      cy = ny;
      found = true;
      break;
    }
    if (!found) break;
    steps++;
  } while ((cx !== startX || cy !== startY) && steps < maxSteps);
  return result;
}

/** Ramer-Douglas-Peucker polygon simplification. */
function rdpSimplify(points, tolerance) {
  if (points.length <= 2) return points;
  var maxDist = 0,
    maxIdx = 0;
  var start = points[0],
    end = points[points.length - 1];
  for (var i = 1; i < points.length - 1; i++) {
    var dist = rdpDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    var left = rdpSimplify(points.slice(0, maxIdx + 1), tolerance);
    var right = rdpSimplify(points.slice(maxIdx), tolerance);
    return [].concat(_toConsumableArray(left.slice(0, -1)), _toConsumableArray(right));
  }
  return [start, end];
}
function rdpDistance(pt, a, b) {
  var dx = b.x - a.x,
    dy = b.y - a.y;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
  var t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  return Math.hypot(pt.x - a.x - t * dx, pt.y - a.y - t * dy);
}

/** Shared pre-processing: draw image to canvas, greyscale, blur, threshold, open, seal. */
function preprocessImage(img, tolerancePx) {
  var MAX_DIM = 1200;
  var scale = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1);
  var W = Math.round(img.naturalWidth * scale);
  var H = Math.round(img.naturalHeight * scale);
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  var pixelData;
  try {
    pixelData = ctx.getImageData(0, 0, W, H).data;
  } catch (e) {
    throw new Error('FP360: Cross-origin image — upload to WordPress media library.');
  }

  // Greyscale
  var grey = new Uint8Array(W * H);
  for (var i = 0; i < W * H; i++) {
    grey[i] = Math.round(0.299 * pixelData[i * 4] + 0.587 * pixelData[i * 4 + 1] + 0.114 * pixelData[i * 4 + 2]);
  }

  // Gaussian blur (3x3)
  var blurred = new Uint8Array(W * H);
  var gK = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var s = 0,
        w = 0;
      for (var ky = -1; ky <= 1; ky++) {
        for (var kx = -1; kx <= 1; kx++) {
          var nx = Math.max(0, Math.min(W - 1, x + kx));
          var ny = Math.max(0, Math.min(H - 1, y + ky));
          var _k = gK[(ky + 1) * 3 + (kx + 1)];
          s += grey[ny * W + nx] * _k;
          w += _k;
        }
      }
      blurred[y * W + x] = Math.round(s / w);
    }
  }
  var thresh = otsuThreshold(blurred, W * H);
  var binary = new Uint8Array(W * H);
  for (var _i2 = 0; _i2 < W * H; _i2++) binary[_i2] = blurred[_i2] >= thresh ? 255 : 0;
  var k = Math.max(2, tolerancePx);
  var gapK = Math.max(k + 2, Math.round(W / 60));
  var eroded = morphErode(binary, W, H, k);
  var opened = morphDilate(eroded, W, H, k);
  var sealed = morphErode(opened, W, H, gapK);
  return {
    W: W,
    H: H,
    scale: scale,
    binary: binary,
    opened: opened,
    sealed: sealed,
    k: k,
    gapK: gapK
  };
}

/** Manhattan snapping: force edges within 15 degrees of H/V to be exactly so. */
function manhattanSnap(points) {
  var SNAP_RAD = 15 * Math.PI / 180;
  var snapped = points.map(function (p) {
    return {
      x: p.x,
      y: p.y
    };
  });
  for (var i = 0; i < snapped.length; i++) {
    var a = snapped[i];
    var b = snapped[(i + 1) % snapped.length];
    var ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x));
    if (ang < SNAP_RAD || ang > Math.PI - SNAP_RAD) b.y = a.y;else if (Math.abs(ang - Math.PI / 2) < SNAP_RAD) b.x = a.x;
  }
  return snapped;
}

/** Build exterior mask by flood-filling from image border on `sealed`. */
function buildExteriorMask(sealed, W, H) {
  var exterior = new Uint8Array(W * H);
  var q = [];
  function seed(idx) {
    if (sealed[idx] === 255 && !exterior[idx]) {
      exterior[idx] = 1;
      q.push(idx);
    }
  }
  for (var x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (var y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  var qi = 0;
  while (qi < q.length) {
    var i = q[qi++];
    var _x3 = i % W,
      _y3 = Math.floor(i / W);
    if (_y3 > 0 && sealed[i - W] === 255 && !exterior[i - W]) {
      exterior[i - W] = 1;
      q.push(i - W);
    }
    if (_y3 < H - 1 && sealed[i + W] === 255 && !exterior[i + W]) {
      exterior[i + W] = 1;
      q.push(i + W);
    }
    if (_x3 > 0 && sealed[i - 1] === 255 && !exterior[i - 1]) {
      exterior[i - 1] = 1;
      q.push(i - 1);
    }
    if (_x3 < W - 1 && sealed[i + 1] === 255 && !exterior[i + 1]) {
      exterior[i + 1] = 1;
      q.push(i + 1);
    }
  }
  return exterior;
}

/***/ },

/***/ "./src/editor/detection/seed.js"
/*!**************************************!*\
  !*** ./src/editor/detection/seed.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   runSeedFill: () => (/* binding */ runSeedFill)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../render.js */ "./src/editor/render.js");
/* harmony import */ var _ui_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../ui.js */ "./src/editor/ui.js");
/* harmony import */ var _image_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./image.js */ "./src/editor/detection/image.js");
/* harmony import */ var _auto_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./auto.js */ "./src/editor/detection/auto.js");
/**
 * detection/seed.js
 * Click-to-seed room fill with watershed expansion.
 */








/* global fp360Admin */

function runSeedFill(seeds, tolerancePx) {
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth) {
    (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('no-image');
    return;
  }
  if (!seeds || seeds.length === 0) return;
  (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('processing');
  setTimeout(function () {
    try {
      var polygons = runSeedFillCore(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl, seeds, tolerancePx);
      if (polygons.length === 0) {
        (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('none-found');
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds = [];
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
        return;
      }
      polygons.forEach(function (points) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
          id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
          points: points,
          label: fp360Admin.i18n.newRoom || 'New Room',
          image360: '',
          color: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)()
        });
      });
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds = [];
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('done', polygons.length);
    } catch (err) {
      console.error('FP360 Seed fill error:', err);
      (0,_ui_js__WEBPACK_IMPORTED_MODULE_3__.setDetectionStatus)('error');
    }
  }, 50);
}
function runSeedFillCore(img, seeds, tolerancePx) {
  var _preprocessImage = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.preprocessImage)(img, tolerancePx),
    W = _preprocessImage.W,
    H = _preprocessImage.H,
    scale = _preprocessImage.scale,
    opened = _preprocessImage.opened,
    sealed = _preprocessImage.sealed;
  var exterior = (0,_image_js__WEBPACK_IMPORTED_MODULE_4__.buildExteriorMask)(sealed, W, H);

  // Place seed labels — search in `opened` (text removed, rooms intact)
  var labels = new Int32Array(W * H).fill(-1);
  var validSeedCount = 0;
  seeds.forEach(function (s, idx) {
    var px = Math.round(s.x * W);
    var py = Math.round(s.y * H);
    var found = false;
    outer: for (var r = 0; r <= 50; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          var nx = Math.max(0, Math.min(W - 1, px + dx));
          var ny = Math.max(0, Math.min(H - 1, py + dy));
          var ni = ny * W + nx;
          if (opened[ni] === 255 && !exterior[ni] && labels[ni] === -1) {
            labels[ni] = idx;
            validSeedCount++;
            found = true;
            break outer;
          }
        }
      }
    }
    if (!found) console.warn('FP360: seed', idx + 1, 'could not find a room pixel');
  });
  if (validSeedCount === 0) return [];

  // BFS watershed on `opened`, respecting exterior mask.
  // A retry counter per pixel prevents an infinite loop when isolated interior
  // pixels have no labelled neighbours yet — they get re-queued, but only up
  // to MAX_RETRIES times before being silently dropped.
  var MAX_RETRIES = 4;
  var expanded = labels.slice();
  var retries = new Uint8Array(W * H); // retry count per pixel, zero-initialised
  var wQueue = [];
  for (var i = 0; i < W * H; i++) {
    if (expanded[i] < 0) continue;
    var x = i % W,
      y = Math.floor(i / W);
    if (y > 0 && opened[i - W] === 255 && !exterior[i - W] && expanded[i - W] === -1) wQueue.push(i - W);
    if (y < H - 1 && opened[i + W] === 255 && !exterior[i + W] && expanded[i + W] === -1) wQueue.push(i + W);
    if (x > 0 && opened[i - 1] === 255 && !exterior[i - 1] && expanded[i - 1] === -1) wQueue.push(i - 1);
    if (x < W - 1 && opened[i + 1] === 255 && !exterior[i + 1] && expanded[i + 1] === -1) wQueue.push(i + 1);
  }
  var wqi = 0;
  while (wqi < wQueue.length) {
    var _i = wQueue[wqi++];
    if (expanded[_i] >= 0 || opened[_i] !== 255 || exterior[_i]) continue;
    var _x = _i % W,
      _y = Math.floor(_i / W);
    var lbl = -1;
    if (_y > 0 && expanded[_i - W] >= 0) lbl = expanded[_i - W];else if (_y < H - 1 && expanded[_i + W] >= 0) lbl = expanded[_i + W];else if (_x > 0 && expanded[_i - 1] >= 0) lbl = expanded[_i - 1];else if (_x < W - 1 && expanded[_i + 1] >= 0) lbl = expanded[_i + 1];
    if (lbl < 0) {
      // No labelled neighbour yet — retry later, but only up to MAX_RETRIES.
      if (retries[_i] < MAX_RETRIES) {
        retries[_i]++;
        wQueue.push(_i);
      }
      continue;
    }
    expanded[_i] = lbl;
    if (_y > 0 && opened[_i - W] === 255 && !exterior[_i - W] && expanded[_i - W] === -1) wQueue.push(_i - W);
    if (_y < H - 1 && opened[_i + W] === 255 && !exterior[_i + W] && expanded[_i + W] === -1) wQueue.push(_i + W);
    if (_x > 0 && opened[_i - 1] === 255 && !exterior[_i - 1] && expanded[_i - 1] === -1) wQueue.push(_i - 1);
    if (_x < W - 1 && opened[_i + 1] === 255 && !exterior[_i + 1] && expanded[_i + 1] === -1) wQueue.push(_i + 1);
  }
  var validLabels = new Set(seeds.map(function (_, i) {
    return i;
  }));
  return (0,_auto_js__WEBPACK_IMPORTED_MODULE_5__.traceRegions)(validLabels, expanded, opened, W, H, scale, img);
}

/***/ },

/***/ "./src/editor/helpers.js"
/*!*******************************!*\
  !*** ./src/editor/helpers.js ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   dataField: () => (/* binding */ dataField),
/* harmony export */   el: () => (/* binding */ el),
/* harmony export */   emptyState: () => (/* binding */ emptyState),
/* harmony export */   generateId: () => (/* binding */ generateId),
/* harmony export */   getCentroid: () => (/* binding */ getCentroid),
/* harmony export */   getNormalizedPos: () => (/* binding */ getNormalizedPos),
/* harmony export */   imageUrlInput: () => (/* binding */ imageUrlInput),
/* harmony export */   imgEl: () => (/* binding */ imgEl),
/* harmony export */   initDomRefs: () => (/* binding */ initDomRefs),
/* harmony export */   nextColor: () => (/* binding */ nextColor),
/* harmony export */   registerRenderFn: () => (/* binding */ registerRenderFn),
/* harmony export */   requestRedraw: () => (/* binding */ requestRedraw),
/* harmony export */   saveHotspots: () => (/* binding */ saveHotspots),
/* harmony export */   svg: () => (/* binding */ svg)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./state.js */ "./src/editor/state.js");
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * helpers.js
 * Pure utility functions shared across all modules.
 */



// DOM references — set by initDomRefs() inside DOMContentLoaded
var dataField, imageUrlInput, emptyState, svg, imgEl;
function initDomRefs() {
  dataField = document.getElementById('fp360_hotspots_data');
  imageUrlInput = document.getElementById('fp360_image_url');
  svg = document.getElementById('fp360-svg-overlay');
  imgEl = document.getElementById('fp360-floorplan-img');
  emptyState = document.getElementById('fp360-empty-state');
}

// render.js registers its renderSVG here to avoid circular imports.
var _renderSVG = function _renderSVG() {};
function registerRenderFn(fn) {
  _renderSVG = fn;
}
function saveHotspots() {
  if (dataField) dataField.value = JSON.stringify(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots);
}
function generateId() {
  if (typeof self.crypto !== 'undefined' && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}
function nextColor() {
  return _state_js__WEBPACK_IMPORTED_MODULE_0__.COLORS[_state_js__WEBPACK_IMPORTED_MODULE_0__.state.colorIndex++ % _state_js__WEBPACK_IMPORTED_MODULE_0__.COLORS.length];
}
function requestRedraw() {
  if (!_state_js__WEBPACK_IMPORTED_MODULE_0__.state.needsRedraw) {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.needsRedraw = true;
    requestAnimationFrame(_renderSVG);
  }
}
function getNormalizedPos(e) {
  if (!svg) return {
    x: 0,
    y: 0
  };
  var rect = svg.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  };
}
function getCentroid(points) {
  var x = points.reduce(function (sum, p) {
    return sum + p.x;
  }, 0) / points.length;
  var y = points.reduce(function (sum, p) {
    return sum + p.y;
  }, 0) / points.length;
  return {
    x: x,
    y: y
  };
}

/**
 * Minimal DOM element factory.
 * el('div', { className: 'foo', style: 'color:red', 'data-id': '1' }, 'text')
 * Handles: className, style (cssText), all other attrs via setAttribute.
 * For CSS custom properties use el(...) then el.style.setProperty().
 */
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

/***/ },

/***/ "./src/editor/helpers/floorplan-background.js"
/*!****************************************************!*\
  !*** ./src/editor/helpers/floorplan-background.js ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setFloorplanBackground: () => (/* binding */ setFloorplanBackground)
/* harmony export */ });
/* harmony import */ var dompurify__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! dompurify */ "./node_modules/dompurify/dist/purify.es.mjs");
/**
 * helpers/floorplan-background.js
 * Sets the floorplan background in the editor canvas container:
 * either an inline SVG (vector mode) or a raster <img> (legacy mode).
 *
 * The polygon overlay SVG (#fp360-svg-overlay) is never touched here.
 * It stays visible regardless of background mode.
 */



/**
 * Switch the editor canvas between vector (SVG) and raster (img) background.
 *
 * @param {HTMLElement} container  The #fp360-canvas-container element.
 * @param {{ svgMarkup?: string, imageUrl?: string }} options
 *   Pass svgMarkup to activate vector mode.
 *   Pass imageUrl to activate raster mode.
 */
function setFloorplanBackground(container) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
    svgMarkup = _ref.svgMarkup,
    imageUrl = _ref.imageUrl;
  if (!container) return;
  var imgEl = container.querySelector('#fp360-floorplan-img');
  var overlayEl = container.querySelector('#fp360-svg-overlay');
  var emptyStateEl = container.querySelector('#fp360-empty-state');
  var bgEl = container.querySelector('#fp360-svg-background');
  if (svgMarkup) {
    // --- Vector mode ---
    if (imgEl) imgEl.style.display = 'none';
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (overlayEl) overlayEl.style.display = 'block';
    if (!bgEl) {
      bgEl = document.createElement('div');
      bgEl.id = 'fp360-svg-background';
      bgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
      // Insert before the overlay so it sits behind the polygon layer
      if (overlayEl) {
        container.insertBefore(bgEl, overlayEl);
      } else {
        container.appendChild(bgEl);
      }
    }
    bgEl.innerHTML = dompurify__WEBPACK_IMPORTED_MODULE_0__["default"].sanitize(svgMarkup, {
      USE_PROFILES: {
        svg: true,
        svgFilters: false
      },
      ADD_TAGS: ['use'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
    });
    bgEl.style.display = 'block';
  } else if (imageUrl) {
    // --- Raster mode ---
    if (bgEl) bgEl.style.display = 'none';
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (overlayEl) overlayEl.style.display = 'block';
    if (imgEl) {
      imgEl.src = imageUrl;
      imgEl.style.display = 'block';
    }
  }
}

/***/ },

/***/ "./src/editor/render.js"
/*!******************************!*\
  !*** ./src/editor/render.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   renderHotspotList: () => (/* binding */ renderHotspotList),
/* harmony export */   renderSVG: () => (/* binding */ renderSVG)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helpers.js */ "./src/editor/helpers.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * render.js
 * SVG canvas rendering and room list rendering.
 */



function renderSVG() {
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.needsRedraw = false;
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) return;
  while (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.firstChild) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.removeChild(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.firstChild);
  _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.setAttribute('viewBox', '0 0 100 100');
  _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.setAttribute('preserveAspectRatio', 'none');
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.forEach(function (hs) {
    if (!hs.points || hs.points.length < 3) return;
    var color = hs.color || _state_js__WEBPACK_IMPORTED_MODULE_0__.COLORS[0];
    var isSelected = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.has(hs.id);
    var pts = hs.points.map(function (p) {
      return "".concat(p.x * 100, ",").concat(p.y * 100);
    }).join(' ');
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', isSelected ? color + 'cc' : color + '40');
    poly.setAttribute('stroke', color);
    poly.setAttribute('stroke-width', isSelected ? '0.6' : '0.3');
    poly.setAttribute('class', isSelected ? 'fp360-hs-poly active' : 'fp360-hs-poly');
    poly.style.setProperty('vector-effect', 'non-scaling-stroke');
    poly.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.shiftKey) {
        // Shift-click: toggle in/out of selection for merge.
        // No scroll — the editor is building a multi-selection,
        // not looking for the room in the list.
        if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.has(hs.id)) _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds["delete"](hs.id);else _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.add(hs.id);
      } else {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.clear();
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.add(hs.id);
        // Only scroll when selecting a single room normally —
        // makes it easy to find the room in the list to assign a 360° image.
        requestAnimationFrame(function () {
          var _document$querySelect;
          (_document$querySelect = document.querySelector('.fp360-hs-item.is-active')) === null || _document$querySelect === void 0 || _document$querySelect.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        });
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      renderHotspotList();
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(poly);

    // Drag handles — single selection only
    if (isSelected && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.size === 1) {
      hs.points.forEach(function (p, idx) {
        var handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', p.x * 100);
        handle.setAttribute('cy', p.y * 100);
        handle.setAttribute('r', '1.6');
        handle.setAttribute('class', 'fp360-hs-handle');
        handle.setAttribute('fill', '#fff');
        handle.setAttribute('stroke', color);
        handle.setAttribute('stroke-width', '0.5');
        handle.style.setProperty('vector-effect', 'non-scaling-stroke');
        handle.style.cursor = 'move';
        handle.addEventListener('mousedown', function (e) {
          e.stopPropagation();
          _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging = true;
          _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragHotspotId = hs.id;
          _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragPointIdx = idx;
        });
        _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(handle);
      });
    }
    if (hs.label) {
      var center = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.getCentroid)(hs.points);
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', center.x * 100);
      text.setAttribute('y', center.y * 100);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '3');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('stroke', '#000000');
      text.setAttribute('stroke-width', '0.5');
      text.setAttribute('paint-order', 'stroke');
      text.setAttribute('pointer-events', 'none');
      text.textContent = hs.label;
      _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(text);
    }
  });

  // Polygon drawing in progress
  if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length > 0) {
    var pointsWithMouse = _toConsumableArray(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints);
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing) pointsWithMouse.push(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.mousePos);
    var pts = pointsWithMouse.map(function (p) {
      return "".concat(p.x * 100, ",").concat(p.y * 100);
    }).join(' ');
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pts);
    line.setAttribute('class', 'fp360-drawing-line');
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(line);
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.forEach(function (p, i) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x * 100);
      c.setAttribute('cy', p.y * 100);
      c.setAttribute('r', i === 0 ? 1.5 : 0.8);
      c.setAttribute('class', i === 0 ? 'fp360-node fp360-node--first' : 'fp360-node');
      _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(c);
    });
  }

  // Rectangle drag preview
  if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent) {
    var x1 = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart.x * 100;
    var y1 = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart.y * 100;
    var x2 = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent.x * 100;
    var y2 = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent.y * 100;
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', Math.min(x1, x2));
    rect.setAttribute('y', Math.min(y1, y2));
    rect.setAttribute('width', Math.abs(x2 - x1));
    rect.setAttribute('height', Math.abs(y2 - y1));
    rect.setAttribute('fill', 'rgba(34,113,177,0.15)');
    rect.setAttribute('stroke', '#2271b1');
    rect.setAttribute('stroke-width', '0.5');
    rect.setAttribute('stroke-dasharray', '1.5 1');
    rect.setAttribute('pointer-events', 'none');
    rect.style.setProperty('vector-effect', 'non-scaling-stroke');
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(rect);
  }

  // Seed markers
  if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode || _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.length > 0) {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.forEach(function (s, i) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', s.x * 100);
      circle.setAttribute('cy', s.y * 100);
      circle.setAttribute('r', '2.2');
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('stroke', '#333');
      circle.setAttribute('stroke-width', '0.5');
      circle.style.setProperty('vector-effect', 'non-scaling-stroke');
      var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', s.x * 100);
      label.setAttribute('y', s.y * 100);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('font-size', '2.5');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('fill', '#333');
      label.setAttribute('pointer-events', 'none');
      label.textContent = String(i + 1);
      g.appendChild(circle);
      g.appendChild(label);
      _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.appendChild(g);
    });
  }
}
function renderHotspotList() {
  /* global fp360Admin */
  var ul = document.getElementById('fp360-hotspot-items');
  if (!ul) return;
  ul.innerHTML = '';
  var mergeBtn = document.getElementById('fp360-merge-rooms');
  if (mergeBtn) mergeBtn.style.display = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.size === 2 ? '' : 'none';
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.forEach(function (hs) {
    var isSelected = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.has(hs.id);
    var color = hs.color || _state_js__WEBPACK_IMPORTED_MODULE_0__.COLORS[0];
    var li = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('li', {
      className: 'fp360-hs-item' + (isSelected ? ' is-active' : '')
    });
    li.style.setProperty('--hs-color', color);
    var swatch = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('span', {
      className: 'fp360-hs-swatch',
      style: "background-color:".concat(color)
    });
    var labelInput = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('input', {
      type: 'text',
      className: 'fp360-hs-label',
      'data-id': hs.id,
      placeholder: fp360Admin.i18n.roomLabel || 'Room Label',
      value: hs.label
    });
    var header = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('div', {
      className: 'fp360-hs-header'
    });
    header.append(swatch, labelInput);
    var urlInput = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('input', {
      type: 'text',
      className: 'fp360-hs-img360',
      'data-id': hs.id,
      placeholder: '360 Image URL',
      value: hs.image360
    });
    var pickBtn = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('button', {
      type: 'button',
      className: 'button fp360-hs-pick360',
      'data-id': hs.id
    }, fp360Admin.i18n.pick360);
    var row = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('div', {
      className: 'fp360-hs-input-row'
    });
    row.append(urlInput, pickBtn);
    var deleteBtn = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('button', {
      type: 'button',
      className: 'button button-link-delete fp360-hs-delete',
      'data-id': hs.id
    }, fp360Admin.i18n.deleteRoom);
    li.append(header, row, deleteBtn);
    ul.appendChild(li);
  });
}

// Register renderSVG with helpers so requestRedraw can call it
// without creating a circular import.
(0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.registerRenderFn)(renderSVG);

/***/ },

/***/ "./src/editor/state.js"
/*!*****************************!*\
  !*** ./src/editor/state.js ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COLORS: () => (/* binding */ COLORS),
/* harmony export */   SNAP_DISTANCE: () => (/* binding */ SNAP_DISTANCE),
/* harmony export */   state: () => (/* binding */ state)
/* harmony export */ });
/**
 * state.js
 * Shared state object and constants.
 * Imports nothing — every other module imports from here.
 */

var COLORS = ['#4fa8e8', '#e8734f', '#4fe87a', '#e84f9a', '#a84fe8', '#e8d94f', '#4fe8d9', '#e84f4f', '#8ae84f', '#4f6ae8', '#e8a84f', '#4fe8c0'];
var SNAP_DISTANCE = 0.025;
var state = {
  hotspots: [],
  colorIndex: 0,
  // monotonically incremented by nextColor() — avoids collisions after deletions
  drawing: false,
  currentPoints: [],
  selectedIds: new Set(),
  mousePos: {
    x: 0,
    y: 0
  },
  needsRedraw: false,
  // Vertex dragging
  dragging: false,
  dragHotspotId: null,
  dragPointIdx: null,
  // Seed fill
  seedMode: false,
  seeds: [],
  // Rectangle tool
  rectMode: false,
  rectStart: null,
  rectCurrent: null,
  // Polygon tool (explicit mode — canvas clicks only draw when active)
  polyMode: false
};

/***/ },

/***/ "./src/editor/tools/merge.js"
/*!***********************************!*\
  !*** ./src/editor/tools/merge.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mergePolygons: () => (/* binding */ mergePolygons)
/* harmony export */ });
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * tools/merge.js
 * Polygon merge algorithm for combining two rectangles into an L-shape.
 */

/**
 * Merges two axis-aligned rectangular hotspots into one polygon.
 * Returns null if they don't overlap or touch.
 */
function mergePolygons(a, b) {
  function bbox(hs) {
    var xs = hs.points.map(function (p) {
      return p.x;
    });
    var ys = hs.points.map(function (p) {
      return p.y;
    });
    return {
      x1: Math.min.apply(Math, _toConsumableArray(xs)),
      y1: Math.min.apply(Math, _toConsumableArray(ys)),
      x2: Math.max.apply(Math, _toConsumableArray(xs)),
      y2: Math.max.apply(Math, _toConsumableArray(ys))
    };
  }
  var A = bbox(a);
  var B = bbox(b);
  var overlapX = A.x1 <= B.x2 + 0.005 && B.x1 <= A.x2 + 0.005;
  var overlapY = A.y1 <= B.y2 + 0.005 && B.y1 <= A.y2 + 0.005;
  if (!overlapX || !overlapY) return null;
  var xs = _toConsumableArray(new Set([A.x1, A.x2, B.x1, B.x2])).sort(function (a, b) {
    return a - b;
  });
  var ys = _toConsumableArray(new Set([A.y1, A.y2, B.y1, B.y2])).sort(function (a, b) {
    return a - b;
  });
  function inUnion(cx, cy) {
    var EPS = 0.001;
    var inA = cx >= A.x1 - EPS && cx <= A.x2 + EPS && cy >= A.y1 - EPS && cy <= A.y2 + EPS;
    var inB = cx >= B.x1 - EPS && cx <= B.x2 + EPS && cy >= B.y1 - EPS && cy <= B.y2 + EPS;
    return inA || inB;
  }
  var edges = [];
  for (var i = 0; i < xs.length - 1; i++) {
    for (var j = 0; j < ys.length - 1; j++) {
      var cx = (xs[i] + xs[i + 1]) / 2;
      var cy = (ys[j] + ys[j + 1]) / 2;
      if (!inUnion(cx, cy)) continue;
      if (j === 0 || !inUnion(cx, (ys[j - 1] + ys[j]) / 2)) edges.push({
        x1: xs[i],
        y1: ys[j],
        x2: xs[i + 1],
        y2: ys[j]
      });
      if (j === ys.length - 2 || !inUnion(cx, (ys[j + 1] + ys[j + 2]) / 2)) edges.push({
        x1: xs[i + 1],
        y1: ys[j + 1],
        x2: xs[i],
        y2: ys[j + 1]
      });
      if (i === 0 || !inUnion((xs[i - 1] + xs[i]) / 2, cy)) edges.push({
        x1: xs[i],
        y1: ys[j + 1],
        x2: xs[i],
        y2: ys[j]
      });
      if (i === xs.length - 2 || !inUnion((xs[i + 1] + xs[i + 2]) / 2, cy)) edges.push({
        x1: xs[i + 1],
        y1: ys[j],
        x2: xs[i + 1],
        y2: ys[j + 1]
      });
    }
  }
  if (edges.length === 0) return null;
  var poly = [{
    x: edges[0].x1,
    y: edges[0].y1
  }, {
    x: edges[0].x2,
    y: edges[0].y2
  }];
  var used = new Set([0]);
  for (var step = 0; step < edges.length - 1; step++) {
    var last = poly[poly.length - 1];
    var found = false;
    for (var k = 0; k < edges.length; k++) {
      if (used.has(k)) continue;
      var e = edges[k];
      if (Math.abs(e.x1 - last.x) < 0.0001 && Math.abs(e.y1 - last.y) < 0.0001) {
        poly.push({
          x: e.x2,
          y: e.y2
        });
        used.add(k);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  if (poly.length > 1) {
    var first = poly[0],
      _last = poly[poly.length - 1];
    if (Math.abs(first.x - _last.x) < 0.0001 && Math.abs(first.y - _last.y) < 0.0001) {
      poly.pop();
    }
  }
  var simplified = poly.filter(function (pt, i) {
    var prev = poly[(i + poly.length - 1) % poly.length];
    var next = poly[(i + 1) % poly.length];
    var dx1 = pt.x - prev.x,
      dy1 = pt.y - prev.y;
    var dx2 = next.x - pt.x,
      dy2 = next.y - pt.y;
    return Math.abs(dx1 * dy2 - dy1 * dx2) > 0.000001;
  });
  return simplified.length >= 3 ? simplified : null;
}

/***/ },

/***/ "./src/editor/tools/polygon.js"
/*!*************************************!*\
  !*** ./src/editor/tools/polygon.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   closeShape: () => (/* binding */ closeShape)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../render.js */ "./src/editor/render.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * tools/polygon.js
 * Click-by-click polygon drawing tool.
 */




function closeShape() {
  if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length < 3) return;
  /* global fp360Admin */
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
    id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
    points: _toConsumableArray(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints),
    label: fp360Admin.i18n.newRoom || 'New Room',
    image360: '',
    color: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)()
  });
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
  var svg = document.getElementById('fp360-svg-overlay');
  if (svg) svg.classList.remove('fp360-snap-active');
  (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
  (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
  (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
}

/***/ },

/***/ "./src/editor/tools/rectangle.js"
/*!***************************************!*\
  !*** ./src/editor/tools/rectangle.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   finishRect: () => (/* binding */ finishRect)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../render.js */ "./src/editor/render.js");
/* harmony import */ var _detection_image_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../detection/image.js */ "./src/editor/detection/image.js");
/**
 * tools/rectangle.js
 * Click-and-drag rectangle tool with wall snapping.
 */






/* global fp360Admin */

/**
 * Called when the editor finishes a rectangle drag.
 * Snaps each edge outward to the nearest dark wall pixel in `opened`.
 */
function finishRect(s, c) {
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth) {
    commitRect(s, c);
    return;
  }
  var MAX_DIM = 1200;
  var scale = Math.min(MAX_DIM / _helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth, MAX_DIM / _helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalHeight, 1);
  var W = Math.round(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth * scale);
  var H = Math.round(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalHeight * scale);
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl, 0, 0, W, H);
  var pixelData;
  try {
    pixelData = ctx.getImageData(0, 0, W, H).data;
  } catch (e) {
    commitRect(s, c);
    return;
  }
  var grey = new Uint8Array(W * H);
  for (var i = 0; i < W * H; i++) {
    grey[i] = Math.round(0.299 * pixelData[i * 4] + 0.587 * pixelData[i * 4 + 1] + 0.114 * pixelData[i * 4 + 2]);
  }
  var thresh = (0,_detection_image_js__WEBPACK_IMPORTED_MODULE_3__.otsuThreshold)(grey, W * H);
  var binary = new Uint8Array(W * H);
  for (var _i = 0; _i < W * H; _i++) binary[_i] = grey[_i] >= thresh ? 255 : 0;
  var k = 3;
  var opened = (0,_detection_image_js__WEBPACK_IMPORTED_MODULE_3__.morphDilate)((0,_detection_image_js__WEBPACK_IMPORTED_MODULE_3__.morphErode)(binary, W, H, k), W, H, k);
  var SNAP_RANGE = Math.round(W * 0.04);
  var top = Math.round(Math.min(s.y, c.y) * H);
  var bottom = Math.round(Math.max(s.y, c.y) * H);
  var left = Math.round(Math.min(s.x, c.x) * W);
  var right = Math.round(Math.max(s.x, c.x) * W);
  top = snapEdge(opened, W, H, top, left, right, 'top', SNAP_RANGE);
  bottom = snapEdge(opened, W, H, bottom, left, right, 'bottom', SNAP_RANGE);
  left = snapEdge(opened, W, H, left, top, bottom, 'left', SNAP_RANGE);
  right = snapEdge(opened, W, H, right, top, bottom, 'right', SNAP_RANGE);
  commitRect({
    x: left / W,
    y: top / H
  }, {
    x: right / W,
    y: bottom / H
  });
}

/**
 * Snaps one edge outward to the nearest dark wall line.
 * Searches only away from the room interior so text cannot interfere.
 */
function snapEdge(opened, W, H, edge, rangeA, rangeB, direction, maxSearch) {
  var DARK_THRESHOLD = 0.3;
  for (var offset = 0; offset <= maxSearch; offset++) {
    var darkCount = 0,
      sampleCount = 0;
    if (direction === 'top') {
      var row = Math.max(0, edge - offset);
      for (var x = rangeA; x <= rangeB; x += 3) {
        if (x < 0 || x >= W) continue;
        sampleCount++;
        if (opened[row * W + x] === 0) darkCount++;
      }
    } else if (direction === 'bottom') {
      var _row = Math.min(H - 1, edge + offset);
      for (var _x = rangeA; _x <= rangeB; _x += 3) {
        if (_x < 0 || _x >= W) continue;
        sampleCount++;
        if (opened[_row * W + _x] === 0) darkCount++;
      }
    } else if (direction === 'left') {
      var col = Math.max(0, edge - offset);
      for (var y = rangeA; y <= rangeB; y += 3) {
        if (y < 0 || y >= H) continue;
        sampleCount++;
        if (opened[y * W + col] === 0) darkCount++;
      }
    } else if (direction === 'right') {
      var _col = Math.min(W - 1, edge + offset);
      for (var _y = rangeA; _y <= rangeB; _y += 3) {
        if (_y < 0 || _y >= H) continue;
        sampleCount++;
        if (opened[_y * W + _col] === 0) darkCount++;
      }
    }
    if (sampleCount > 0 && darkCount / sampleCount >= DARK_THRESHOLD) {
      return direction === 'top' ? Math.max(0, edge - offset) : direction === 'bottom' ? Math.min(H - 1, edge + offset) : direction === 'left' ? Math.max(0, edge - offset) : Math.min(W - 1, edge + offset);
    }
  }
  return edge;
}

/** Creates a hotspot from normalised rectangle corners. */
function commitRect(s, c) {
  var x1 = Math.max(0, Math.min(1, Math.min(s.x, c.x)));
  var y1 = Math.max(0, Math.min(1, Math.min(s.y, c.y)));
  var x2 = Math.max(0, Math.min(1, Math.max(s.x, c.x)));
  var y2 = Math.max(0, Math.min(1, Math.max(s.y, c.y)));
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
    id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
    points: [{
      x: x1,
      y: y1
    }, {
      x: x2,
      y: y1
    }, {
      x: x2,
      y: y2
    }, {
      x: x1,
      y: y2
    }],
    label: fp360Admin.i18n.newRoom || 'New Room',
    image360: '',
    color: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)()
  });
  (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
  (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
  (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
}

/***/ },

/***/ "./src/editor/ui.js"
/*!**************************!*\
  !*** ./src/editor/ui.js ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initUI: () => (/* binding */ initUI),
/* harmony export */   setDetectionStatus: () => (/* binding */ setDetectionStatus)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./state.js */ "./src/editor/state.js");
/* harmony import */ var _helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./render.js */ "./src/editor/render.js");
/* harmony import */ var _tools_polygon_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./tools/polygon.js */ "./src/editor/tools/polygon.js");
/* harmony import */ var _tools_rectangle_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./tools/rectangle.js */ "./src/editor/tools/rectangle.js");
/* harmony import */ var _tools_merge_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./tools/merge.js */ "./src/editor/tools/merge.js");
/* harmony import */ var _detection_auto_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./detection/auto.js */ "./src/editor/detection/auto.js");
/* harmony import */ var _detection_seed_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./detection/seed.js */ "./src/editor/detection/seed.js");
/* harmony import */ var _helpers_floorplan_background_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./helpers/floorplan-background.js */ "./src/editor/helpers/floorplan-background.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/**
 * ui.js
 * All button bindings, SVG event listeners, and toolbar state management.
 * Exports setDetectionStatus for use by detection modules.
 */











/* global fp360Admin, wp */

/**
 * Shows a non-blocking confirmation dialog styled to match the WP admin UI.
 * Calls onConfirm() when the user clicks OK; does nothing on Cancel.
 *
 * @param {string}   message    The confirmation message to display.
 * @param {Function} onConfirm  Callback executed when the user confirms.
 */
function fp360Confirm(message, onConfirm) {
  var i18n = fp360Admin.i18n;
  var overlay = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('div', {
    style: 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;'
  });
  var dialog = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('div', {
    style: 'background:#fff;border-radius:4px;padding:24px;max-width:420px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
  });
  var msg = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('p', {
    style: 'margin:0 0 20px;font-size:14px;line-height:1.5;color:#1d2327;'
  }, message);
  var btnRow = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('div', {
    style: 'display:flex;gap:8px;justify-content:flex-end;'
  });
  var cancelBtn = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('button', {
    className: 'button'
  }, i18n.cancel || 'Cancel');
  var okBtn = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.el)('button', {
    className: 'button button-primary'
  }, i18n.ok || 'OK');
  var close = function close() {
    return document.body.removeChild(overlay);
  };
  cancelBtn.addEventListener('click', close);
  okBtn.addEventListener('click', function () {
    close();
    onConfirm();
  });
  // Allow Escape to cancel
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
  btnRow.append(cancelBtn, okBtn);
  dialog.append(msg, btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  okBtn.focus();
}

/**
 * Shows a brief error message in the existing detect-status bar.
 * Replaces alert() so the browser UI thread is never blocked.
 *
 * @param {string} message  The message to display.
 */
function fp360Alert(message) {
  var statusEl = document.getElementById('fp360-detect-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('fp360-status--info', 'fp360-status--success', 'fp360-status--warn');
  statusEl.classList.add('fp360-status--error');
  statusEl.style.display = '';
}

/**
 * Clear _fp360_svg_markup (and related DXF meta) on the current post via REST.
 * Called when the user picks a raster image to replace the vector floorplan.
 */
function clearSvgMeta() {
  return _clearSvgMeta.apply(this, arguments);
}
/**
 * Upload a DXF File object to the WordPress media library.
 * Returns the new attachment ID (integer).
 *
 * @param {File}   file
 * @param {number} postId  Attach the media to this post.
 * @returns {Promise<number>}
 */
function _clearSvgMeta() {
  _clearSvgMeta = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var postId;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          postId = fp360Admin.postId;
          if (postId) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          return _context3.a(2, wp.apiFetch({
            path: "/wp/v2/floorplan/".concat(postId),
            method: 'POST',
            data: {
              meta: {
                _fp360_svg_markup: '',
                _fp360_dxf_attachment_id: 0,
                _fp360_dxf_layers: ''
              }
            }
          }));
      }
    }, _callee3);
  }));
  return _clearSvgMeta.apply(this, arguments);
}
function uploadDxfToMedia(_x, _x2) {
  return _uploadDxfToMedia.apply(this, arguments);
}
/**
 * Build a tiny placeholder rectangle around a normalised centre point.
 * Used when pre-populating rooms from DXF text labels.
 *
 * @param {number} cx  0-1 normalised X
 * @param {number} cy  0-1 normalised Y
 * @returns {Array<{x:number, y:number}>}
 */
function _uploadDxfToMedia() {
  _uploadDxfToMedia = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(file, postId) {
    var formData, response, attachmentId;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          formData = new FormData();
          formData.append('file', file);
          if (postId) formData.append('post', String(postId));
          _context4.n = 1;
          return wp.apiFetch({
            path: '/wp/v2/media',
            method: 'POST',
            body: formData
          });
        case 1:
          response = _context4.v;
          attachmentId = response && response.id ? response.id : 0;
          if (!(attachmentId && postId)) {
            _context4.n = 2;
            break;
          }
          _context4.n = 2;
          return wp.apiFetch({
            path: "/wp/v2/floorplan/".concat(postId),
            method: 'POST',
            data: {
              meta: {
                _fp360_dxf_attachment_id: attachmentId
              }
            }
          });
        case 2:
          return _context4.a(2, attachmentId);
      }
    }, _callee4);
  }));
  return _uploadDxfToMedia.apply(this, arguments);
}
function centreToRect(cx, cy) {
  var hw = 0.06,
    hh = 0.04;
  return [{
    x: cx - hw,
    y: cy - hh
  }, {
    x: cx + hw,
    y: cy - hh
  }, {
    x: cx + hw,
    y: cy + hh
  }, {
    x: cx - hw,
    y: cy + hh
  }];
}
function initUI() {
  // Cache all toolbar element references once.
  var btnPickImage = document.getElementById('fp360_pick_image');
  var btnImportDxf = document.getElementById('fp360-import-dxf');
  var btnUndo = document.getElementById('fp360-undo-point');
  var btnPoly = document.getElementById('fp360-poly-tool');
  var btnRect = document.getElementById('fp360-rect-tool');
  var btnMerge = document.getElementById('fp360-merge-rooms');
  var btnSeed = document.getElementById('fp360-seed-mode');
  var btnRunFill = document.getElementById('fp360-run-fill');
  var btnClearSeeds = document.getElementById('fp360-clear-seeds');
  var btnDetect = document.getElementById('fp360-detect-rooms');
  var btnClearRooms = document.getElementById('fp360-clear-rooms');
  var btnExpToggle = document.getElementById('fp360-experimental-toggle');
  var elExpPanel = document.getElementById('fp360-experimental-panel');
  var elDetectStatus = document.getElementById('fp360-detect-status');
  var elTolerance = document.getElementById('fp360-detect-tolerance');
  var elToleranceVal = document.getElementById('fp360-detect-tolerance-val');

  // --- Media frames ---
  // wp.media() frames are expensive — each call creates a new Backbone view
  // that accumulates in memory. We create each frame once and reuse it.
  // The per-room 360° picker reuses a single frame by swapping the select
  // callback each time so the correct room ID is always captured.

  var floorplanFrame = null;
  if (btnPickImage) {
    btnPickImage.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof wp === 'undefined' || !wp.media) return;
      if (!floorplanFrame) {
        floorplanFrame = wp.media({
          title: fp360Admin.i18n.selectFloorplan || 'Select Floorplan',
          multiple: false
        });
        floorplanFrame.on('select', function () {
          var attachment = floorplanFrame.state().get('selection').first().toJSON();
          if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imageUrlInput) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.imageUrlInput.value = attachment.url;

          // Raster replaces vector: clear SVG meta via REST then update the canvas
          clearSvgMeta()["finally"](function () {
            var container = document.getElementById('fp360-canvas-container');
            (0,_helpers_floorplan_background_js__WEBPACK_IMPORTED_MODULE_8__.setFloorplanBackground)(container, {
              imageUrl: attachment.url
            });
            (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
          });
        });
      }
      floorplanFrame.open();
    });
  }

  // --- Import DXF button ---
  if (btnImportDxf) {
    btnImportDxf.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var _yield$import, mountDxfImporter, container;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return __webpack_require__.e(/*! import() */ "src_editor_dxf_index_js").then(__webpack_require__.bind(__webpack_require__, /*! ./dxf/index.js */ "./src/editor/dxf/index.js"));
          case 1:
            _yield$import = _context2.v;
            mountDxfImporter = _yield$import.mountDxfImporter;
            container = document.getElementById('fp360-canvas-container');
            mountDxfImporter(document.body, {
              onCancel: function onCancel() {/* modal already removed itself */},
              onApply: function onApply(svgMarkup, rooms, dxfFile, layersJson) {
                return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
                  var i18n, postId, _t;
                  return _regenerator().w(function (_context) {
                    while (1) switch (_context.p = _context.n) {
                      case 0:
                        i18n = fp360Admin.i18n;
                        postId = fp360Admin.postId;
                        setDetectionStatus('processing');
                        if (elDetectStatus) {
                          elDetectStatus.textContent = i18n.dxfSaving || 'Saving…';
                          elDetectStatus.style.display = '';
                        }
                        _context.p = 1;
                        _context.n = 2;
                        return wp.apiFetch({
                          path: "/wp/v2/floorplan/".concat(postId),
                          method: 'POST',
                          data: {
                            meta: {
                              _fp360_svg_markup: svgMarkup,
                              _fp360_dxf_layers: layersJson,
                              _fp360_image: ''
                            }
                          }
                        });
                      case 2:
                        // 2. Upload DXF to media library for archival (non-blocking)
                        if (dxfFile) {
                          uploadDxfToMedia(dxfFile, postId)["catch"](function (err) {
                            console.warn('[fp360-dxf] DXF media upload failed (archival only):', err);
                          });
                        }

                        // 3. Update the editor canvas
                        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imageUrlInput) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.imageUrlInput.value = '';
                        (0,_helpers_floorplan_background_js__WEBPACK_IMPORTED_MODULE_8__.setFloorplanBackground)(container, {
                          svgMarkup: svgMarkup
                        });
                        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();

                        // 4. Pre-populate rooms if list is empty
                        if (rooms.length > 0 && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.length === 0) {
                          rooms.forEach(function (room) {
                            _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
                              id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
                              label: room.label,
                              image360: '',
                              color: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)(),
                              points: centreToRect(room.normX, room.normY)
                            });
                          });
                          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
                          (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
                          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
                        }
                        setDetectionStatus('idle');
                        if (elDetectStatus) {
                          elDetectStatus.textContent = i18n.dxfSaved || 'DXF floorplan saved.';
                          elDetectStatus.classList.remove('fp360-status--error', 'fp360-status--info');
                          elDetectStatus.classList.add('fp360-status--success');
                          elDetectStatus.style.display = '';
                        }
                        _context.n = 4;
                        break;
                      case 3:
                        _context.p = 3;
                        _t = _context.v;
                        console.error('[fp360-dxf] Save error:', _t);
                        setDetectionStatus('idle');
                        if (elDetectStatus) {
                          elDetectStatus.textContent = i18n.dxfSaveError || 'Failed to save the DXF floorplan. Please try again.';
                          elDetectStatus.classList.remove('fp360-status--success', 'fp360-status--info');
                          elDetectStatus.classList.add('fp360-status--error');
                          elDetectStatus.style.display = '';
                        }
                      case 4:
                        return _context.a(2);
                    }
                  }, _callee, null, [[1, 3]]);
                }))();
              }
            });
          case 2:
            return _context2.a(2);
        }
      }, _callee2);
    })));
  }

  // --- SVG mouse events ---
  if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) {
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('mousemove', function (e) {
      var pos = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.getNormalizedPos)(e);
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragHotspotId !== null) {
        var hs = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
          return h.id === _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragHotspotId;
        });
        if (hs && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragPointIdx !== null) {
          hs.points[_state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragPointIdx] = {
            x: Math.max(0, Math.min(1, pos.x)),
            y: Math.max(0, Math.min(1, pos.y))
          };
          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
        }
        return;
      }
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = pos;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
        return;
      }
      if (!_state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing) return;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.mousePos = pos;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length >= 3) {
        var first = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints[0];
        _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.toggle('fp360-snap-active', Math.hypot(pos.x - first.x, pos.y - first.y) < _state_js__WEBPACK_IMPORTED_MODULE_0__.SNAP_DISTANCE);
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('mousedown', function (e) {
      if (!_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode || _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging) return;
      e.preventDefault();
      var pos = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.getNormalizedPos)(e);
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = pos;
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('mouseup', function () {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent) {
        var s = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart,
          c = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent;
        if (Math.abs(c.x - s.x) > 0.02 && Math.abs(c.y - s.y) > 0.02) {
          (0,_tools_rectangle_js__WEBPACK_IMPORTED_MODULE_4__.finishRect)(s, c);
        }
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = null;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
        return;
      }
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragHotspotId = null;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragPointIdx = null;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      }
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('mouseleave', function () {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragHotspotId = null;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragPointIdx = null;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      }
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = null;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      }
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('click', function (e) {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.dragging || _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode) return;
      if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.src || _helpers_js__WEBPACK_IMPORTED_MODULE_1__.emptyState && _helpers_js__WEBPACK_IMPORTED_MODULE_1__.emptyState.style.display !== 'none') return;
      var pos = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.getNormalizedPos)(e);

      // Seed mode click
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.push({
          x: pos.x,
          y: pos.y
        });
        if (btnRunFill) btnRunFill.disabled = false;
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
        return;
      }

      // Polygon drawing — only active when polyMode is on.
      // Without this guard any accidental canvas click starts drawing.
      if (!_state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode) return;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length >= 3) {
        var first = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints[0];
        if (Math.hypot(pos.x - first.x, pos.y - first.y) < _state_js__WEBPACK_IMPORTED_MODULE_0__.SNAP_DISTANCE) {
          (0,_tools_polygon_js__WEBPACK_IMPORTED_MODULE_3__.closeShape)();
          return;
        }
      }
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = true;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.push(pos);
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
    _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing && _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length >= 3) (0,_tools_polygon_js__WEBPACK_IMPORTED_MODULE_3__.closeShape)();
    });
  }

  // --- Toolbar buttons ---

  if (btnUndo) {
    btnUndo.addEventListener('click', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.pop();
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length === 0) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }

  // Polygon tool toggle
  if (btnPoly) {
    btnPoly.addEventListener('click', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode) {
        // Exit other active modes
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart = null;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = null;
        if (btnRect) {
          btnRect.classList.remove('is-active');
          btnRect.textContent = fp360Admin.i18n.rectTool || 'Rectangle';
        }
        if (btnSeed) {
          btnSeed.classList.remove('is-active');
          btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms';
        }
        btnPoly.classList.add('is-active');
        btnPoly.textContent = fp360Admin.i18n.polyModeActive || '✕ Cancel Polygon';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
      } else {
        // Cancelling — discard any in-progress drawing
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
        btnPoly.classList.remove('is-active');
        btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }

  // Rectangle tool toggle
  if (btnRect) {
    btnRect.addEventListener('click', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = false;
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
        if (btnSeed) {
          btnSeed.classList.remove('is-active');
          btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms';
        }
        if (btnPoly) {
          btnPoly.classList.remove('is-active');
          btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon';
        }
        btnRect.classList.add('is-active');
        btnRect.textContent = fp360Admin.i18n.rectModeActive || 'Cancel Rectangle';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
      } else {
        btnRect.classList.remove('is-active');
        btnRect.textContent = fp360Admin.i18n.rectTool || 'Rectangle';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }

  // Experimental panel toggle
  if (btnExpToggle && elExpPanel) {
    btnExpToggle.addEventListener('click', function () {
      var open = elExpPanel.style.display !== 'none';
      elExpPanel.style.display = open ? 'none' : '';
      btnExpToggle.classList.toggle('is-active', !open);
      var arrow = btnExpToggle.querySelector('.fp360-exp-arrow');
      if (arrow) arrow.textContent = open ? '▾' : '▴';
    });
  }
  if (btnMerge) {
    btnMerge.addEventListener('click', function () {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.size !== 2) return;
      var ids = _toConsumableArray(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds);
      var a = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
        return h.id === ids[0];
      });
      var b = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
        return h.id === ids[1];
      });
      if (!a || !b) return;
      var merged = (0,_tools_merge_js__WEBPACK_IMPORTED_MODULE_5__.mergePolygons)(a, b);
      if (!merged) {
        fp360Alert(fp360Admin.i18n.mergeError || 'Rooms must overlap or share an edge.');
        return;
      }
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.filter(function (h) {
        return !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.has(h.id);
      });
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.push({
        id: (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.generateId)(),
        points: merged,
        label: a.label || fp360Admin.i18n.newRoom || 'New Room',
        image360: a.image360 || '',
        color: a.color || (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.nextColor)()
      });
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.clear();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }
  if (btnSeed) {
    btnSeed.addEventListener('click', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = false;
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
        if (btnPoly) {
          btnPoly.classList.remove('is-active');
          btnPoly.textContent = fp360Admin.i18n.polyTool || 'Polygon';
        }
        btnSeed.classList.add('is-active');
        btnSeed.textContent = fp360Admin.i18n.seedModeActive || 'Cancel Seed Mode';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
        if (btnRunFill) btnRunFill.disabled = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.length === 0;
        setDetectionStatus('seed-mode');
      } else {
        btnSeed.classList.remove('is-active');
        btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms';
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
        if (btnRunFill) btnRunFill.disabled = true;
        setDetectionStatus('idle');
      }
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }
  if (btnRunFill) {
    btnRunFill.addEventListener('click', function () {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.length === 0) return;
      var tolerance = parseInt(elTolerance ? elTolerance.value : '3', 10) || 3;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
      if (btnSeed) {
        btnSeed.classList.remove('is-active');
        btnSeed.textContent = fp360Admin.i18n.seedMode || 'Seed Rooms';
      }
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
      btnRunFill.disabled = true;
      (0,_detection_seed_js__WEBPACK_IMPORTED_MODULE_7__.runSeedFill)(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds, tolerance);
    });
  }
  if (btnClearSeeds) {
    btnClearSeeds.addEventListener('click', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds = [];
      if (btnRunFill) btnRunFill.disabled = true;
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  }
  if (btnDetect) {
    btnDetect.addEventListener('click', function () {
      var tolerance = parseInt(elTolerance ? elTolerance.value : '3', 10) || 3;
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.length > 0) {
        fp360Confirm(fp360Admin.i18n.detectConfirmClear || 'Clear existing rooms and re-detect?', function () {
          _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = [];
          _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.clear();
          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
          (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
          (0,_detection_auto_js__WEBPACK_IMPORTED_MODULE_6__.detectRooms)(tolerance);
        });
        return;
      }
      (0,_detection_auto_js__WEBPACK_IMPORTED_MODULE_6__.detectRooms)(tolerance);
    });
  }
  if (btnClearRooms) {
    btnClearRooms.addEventListener('click', function () {
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.length === 0) return;
      fp360Confirm(fp360Admin.i18n.clearAllConfirm || 'Delete all rooms?', function () {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = [];
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.clear();
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
        (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      });
    });
  }
  if (elTolerance && elToleranceVal) {
    elTolerance.addEventListener('input', function () {
      elToleranceVal.textContent = elTolerance.value;
    });
  }

  // --- Delegated handlers ---
  // Buttons inside the hotspot list are created dynamically by renderHotspotList,
  // so we delegate to document rather than binding to each element directly.

  var pick360Frame = null;
  var pick360Handler = null;
  document.addEventListener('click', function (e) {
    // Pick 360° image
    var pickBtn = e.target.closest('.fp360-hs-pick360');
    if (pickBtn) {
      e.preventDefault();
      var id = pickBtn.dataset.id;
      if (!pick360Frame) {
        pick360Frame = wp.media({
          title: fp360Admin.i18n.pick360 || 'Select 360 Image',
          multiple: false
        });
      }

      // Remove the previous select handler and attach one for this room.
      if (pick360Handler) pick360Frame.off('select', pick360Handler);
      pick360Handler = function pick360Handler() {
        var attachment = pick360Frame.state().get('selection').first().toJSON();
        var hs = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
          return h.id === id;
        });
        if (hs) {
          hs.image360 = attachment.url;
          (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
          (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
        }
      };
      pick360Frame.on('select', pick360Handler);
      pick360Frame.open();
      return;
    }

    // Delete room
    var deleteBtn = e.target.closest('.fp360-hs-delete');
    if (deleteBtn) {
      var _id = deleteBtn.dataset.id;
      fp360Confirm(fp360Admin.i18n.deleteRoomConfirm || 'Delete this room?', function () {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.filter(function (h) {
          return h.id !== _id;
        });
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds["delete"](_id);
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
        (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      });
    }
  });
  document.addEventListener('input', function (e) {
    var target = e.target.closest('.fp360-hs-label, .fp360-hs-img360');
    if (!target) return;
    var id = target.dataset.id;
    var hs = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
      return h.id === id;
    });
    if (hs) {
      var _document$querySelect, _document$querySelect2, _document$querySelect3, _document$querySelect4;
      hs.label = (_document$querySelect = (_document$querySelect2 = document.querySelector(".fp360-hs-label[data-id=\"".concat(id, "\"]"))) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.value) !== null && _document$querySelect !== void 0 ? _document$querySelect : '';
      hs.image360 = (_document$querySelect3 = (_document$querySelect4 = document.querySelector(".fp360-hs-img360[data-id=\"".concat(id, "\"]"))) === null || _document$querySelect4 === void 0 ? void 0 : _document$querySelect4.value) !== null && _document$querySelect3 !== void 0 ? _document$querySelect3 : '';
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    }
  });
  window.addEventListener('resize', _helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw);
}

/** Updates the status bar. Called by detection modules and toolbar toggles. */
function setDetectionStatus(status, count) {
  /* global fp360Admin */
  var btnDetect = document.getElementById('fp360-detect-rooms');
  var elStatus = document.getElementById('fp360-detect-status');
  var i18n = fp360Admin.i18n;
  var cfgMap = {
    processing: {
      btn: i18n.detecting || 'Detecting...',
      disabled: true,
      cls: 'fp360-status--info'
    },
    done: {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: 'fp360-status--success'
    },
    'none-found': {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: 'fp360-status--warn'
    },
    'no-image': {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: 'fp360-status--warn'
    },
    error: {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: 'fp360-status--error'
    },
    'seed-mode': {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: 'fp360-status--info'
    },
    idle: {
      btn: i18n.detectRooms || 'Auto-Detect',
      disabled: false,
      cls: ''
    }
  };
  var msgMap = {
    processing: i18n.detecting || 'Detecting rooms...',
    done: (i18n.detectedRooms || 'Detected {n} room(s).').replace('{n}', count),
    'none-found': i18n.noRoomsFound || 'No rooms detected.',
    'no-image': i18n.noImageForDetect || 'Please upload a floorplan image first.',
    error: i18n.detectionError || 'Detection failed. Draw rooms manually.',
    'seed-mode': i18n.seedModeHint || 'Click inside each room, then click Run Fill.',
    idle: ''
  };
  var cfg = cfgMap[status] || cfgMap.error;
  if (btnDetect) {
    btnDetect.disabled = cfg.disabled;
    btnDetect.textContent = cfg.btn;
  }
  if (elStatus) {
    elStatus.textContent = msgMap[status] || '';
    ['fp360-status--info', 'fp360-status--success', 'fp360-status--warn', 'fp360-status--error'].forEach(function (c) {
      return elStatus.classList.remove(c);
    });
    if (cfg.cls) elStatus.classList.add(cfg.cls);
    elStatus.style.display = '';
  }
}

/***/ },

/***/ "./node_modules/dompurify/dist/purify.es.mjs"
/*!***************************************************!*\
  !*** ./node_modules/dompurify/dist/purify.es.mjs ***!
  \***************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ purify)
/* harmony export */ });
/*! @license DOMPurify 3.4.0 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.0/LICENSE */

const {
  entries,
  setPrototypeOf,
  isFrozen,
  getPrototypeOf,
  getOwnPropertyDescriptor
} = Object;
let {
  freeze,
  seal,
  create
} = Object; // eslint-disable-line import/no-mutable-exports
let {
  apply,
  construct
} = typeof Reflect !== 'undefined' && Reflect;
if (!freeze) {
  freeze = function freeze(x) {
    return x;
  };
}
if (!seal) {
  seal = function seal(x) {
    return x;
  };
}
if (!apply) {
  apply = function apply(func, thisArg) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    return func.apply(thisArg, args);
  };
}
if (!construct) {
  construct = function construct(Func) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    return new Func(...args);
  };
}
const arrayForEach = unapply(Array.prototype.forEach);
const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
const arrayPop = unapply(Array.prototype.pop);
const arrayPush = unapply(Array.prototype.push);
const arraySplice = unapply(Array.prototype.splice);
const stringToLowerCase = unapply(String.prototype.toLowerCase);
const stringToString = unapply(String.prototype.toString);
const stringMatch = unapply(String.prototype.match);
const stringReplace = unapply(String.prototype.replace);
const stringIndexOf = unapply(String.prototype.indexOf);
const stringTrim = unapply(String.prototype.trim);
const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const regExpTest = unapply(RegExp.prototype.test);
const typeErrorCreate = unconstruct(TypeError);
/**
 * Creates a new function that calls the given function with a specified thisArg and arguments.
 *
 * @param func - The function to be wrapped and called.
 * @returns A new function that calls the given function with a specified thisArg and arguments.
 */
function unapply(func) {
  return function (thisArg) {
    if (thisArg instanceof RegExp) {
      thisArg.lastIndex = 0;
    }
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      args[_key3 - 1] = arguments[_key3];
    }
    return apply(func, thisArg, args);
  };
}
/**
 * Creates a new function that constructs an instance of the given constructor function with the provided arguments.
 *
 * @param func - The constructor function to be wrapped and called.
 * @returns A new function that constructs an instance of the given constructor function with the provided arguments.
 */
function unconstruct(Func) {
  return function () {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }
    return construct(Func, args);
  };
}
/**
 * Add properties to a lookup table
 *
 * @param set - The set to which elements will be added.
 * @param array - The array containing elements to be added to the set.
 * @param transformCaseFunc - An optional function to transform the case of each element before adding to the set.
 * @returns The modified set with added elements.
 */
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) {
    // Make 'in' and truthy checks like Boolean(set.constructor)
    // independent of any properties defined on Object.prototype.
    // Prevent prototype setters from intercepting set as a this value.
    setPrototypeOf(set, null);
  }
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === 'string') {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        // Config presets (e.g. tags.js, attrs.js) are immutable.
        if (!isFrozen(array)) {
          array[l] = lcElement;
        }
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
/**
 * Clean up an array to harden against CSPP
 *
 * @param array - The array to be cleaned.
 * @returns The cleaned version of the array
 */
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) {
    const isPropertyExist = objectHasOwnProperty(array, index);
    if (!isPropertyExist) {
      array[index] = null;
    }
  }
  return array;
}
/**
 * Shallow clone an object
 *
 * @param object - The object to be cloned.
 * @returns A new object that copies the original.
 */
function clone(object) {
  const newObject = create(null);
  for (const [property, value] of entries(object)) {
    const isPropertyExist = objectHasOwnProperty(object, property);
    if (isPropertyExist) {
      if (Array.isArray(value)) {
        newObject[property] = cleanArray(value);
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        newObject[property] = clone(value);
      } else {
        newObject[property] = value;
      }
    }
  }
  return newObject;
}
/**
 * This method automatically checks if the prop is function or getter and behaves accordingly.
 *
 * @param object - The object to look up the getter function in its prototype chain.
 * @param prop - The property name for which to find the getter function.
 * @returns The getter function found in the prototype chain or a fallback function.
 */
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) {
        return unapply(desc.get);
      }
      if (typeof desc.value === 'function') {
        return unapply(desc.value);
      }
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}

const html$1 = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'select', 'shadow', 'slot', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);
const svg$1 = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'enterkeyhint', 'exportparts', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'inputmode', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'part', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);
const svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);
// List of SVG elements that are disallowed by default.
// We still need to know them so that we can do namespace
// checks properly in case one wants to add them to
// allow-list.
const svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);
const mathMl$1 = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'mprescripts']);
// Similarly to SVG, we want to know all MathML elements,
// even those that we disallow by default.
const mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);
const text = freeze(['#text']);

const html = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'exportparts', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inert', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'part', 'pattern', 'placeholder', 'playsinline', 'popover', 'popovertarget', 'popovertargetaction', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'wrap', 'xmlns', 'slot']);
const svg = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'exponent', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'intercept', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'mask-type', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'slope', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'tablevalues', 'targetx', 'targety', 'transform', 'transform-origin', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);
const mathMl = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnalign', 'columnlines', 'columnspacing', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lquote', 'lspace', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);
const xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

// eslint-disable-next-line unicorn/better-regex
const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
const TMPLIT_EXPR = seal(/\$\{[\w\W]*/gm); // eslint-disable-line unicorn/better-regex
const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/); // eslint-disable-line no-useless-escape
const ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
);
const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
);
const DOCTYPE_NAME = seal(/^html$/i);
const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);

var EXPRESSIONS = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ARIA_ATTR: ARIA_ATTR,
  ATTR_WHITESPACE: ATTR_WHITESPACE,
  CUSTOM_ELEMENT: CUSTOM_ELEMENT,
  DATA_ATTR: DATA_ATTR,
  DOCTYPE_NAME: DOCTYPE_NAME,
  ERB_EXPR: ERB_EXPR,
  IS_ALLOWED_URI: IS_ALLOWED_URI,
  IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA,
  MUSTACHE_EXPR: MUSTACHE_EXPR,
  TMPLIT_EXPR: TMPLIT_EXPR
});

/* eslint-disable @typescript-eslint/indent */
// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
const NODE_TYPE = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9};
const getGlobal = function getGlobal() {
  return typeof window === 'undefined' ? null : window;
};
/**
 * Creates a no-op policy for internal use only.
 * Don't export this function outside this module!
 * @param trustedTypes The policy factory.
 * @param purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
 * @return The policy created (or null, if Trusted Types
 * are not supported or creating the policy failed).
 */
const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
    return null;
  }
  // Allow the callers to control the unique policy name
  // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
  // Policy creation with duplicate names throws in Trusted Types.
  let suffix = null;
  const ATTR_NAME = 'data-tt-policy-suffix';
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
    suffix = purifyHostElement.getAttribute(ATTR_NAME);
  }
  const policyName = 'dompurify' + (suffix ? '#' + suffix : '');
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html) {
        return html;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_) {
    // Policy creation failed (most likely another DOMPurify script has
    // already run). Skip creating the policy, as this will only cause errors
    // if TT are enforced.
    console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
    return null;
  }
};
const _createHooksMap = function _createHooksMap() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function createDOMPurify() {
  let window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
  const DOMPurify = root => createDOMPurify(root);
  DOMPurify.version = '3.4.0';
  DOMPurify.removed = [];
  if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
    // Not running in a browser, provide a factory function
    // so that you can pass your own Window
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let {
    document
  } = window;
  const originalDocument = document;
  const currentScript = originalDocument.currentScript;
  const {
    DocumentFragment,
    HTMLTemplateElement,
    Node,
    Element,
    NodeFilter,
    NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap,
    HTMLFormElement,
    DOMParser,
    trustedTypes
  } = window;
  const ElementPrototype = Element.prototype;
  const cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
  const remove = lookupGetter(ElementPrototype, 'remove');
  const getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
  const getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
  const getParentNode = lookupGetter(ElementPrototype, 'parentNode');
  // As per issue #47, the web-components registry is inherited by a
  // new document created via createHTMLDocument. As per the spec
  // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
  // a new empty registry is used when creating a template contents owner
  // document, so we use that as our parent document to ensure nothing
  // is inherited.
  if (typeof HTMLTemplateElement === 'function') {
    const template = document.createElement('template');
    if (template.content && template.content.ownerDocument) {
      document = template.content.ownerDocument;
    }
  }
  let trustedTypesPolicy;
  let emptyHTML = '';
  const {
    implementation,
    createNodeIterator,
    createDocumentFragment,
    getElementsByTagName
  } = document;
  const {
    importNode
  } = originalDocument;
  let hooks = _createHooksMap();
  /**
   * Expose whether this browser supports running the full DOMPurify.
   */
  DOMPurify.isSupported = typeof entries === 'function' && typeof getParentNode === 'function' && implementation && implementation.createHTMLDocument !== undefined;
  const {
    MUSTACHE_EXPR,
    ERB_EXPR,
    TMPLIT_EXPR,
    DATA_ATTR,
    ARIA_ATTR,
    IS_SCRIPT_OR_DATA,
    ATTR_WHITESPACE,
    CUSTOM_ELEMENT
  } = EXPRESSIONS;
  let {
    IS_ALLOWED_URI: IS_ALLOWED_URI$1
  } = EXPRESSIONS;
  /**
   * We consider the elements and attributes below to be safe. Ideally
   * don't add any new ones but feel free to remove unwanted ones.
   */
  /* allowed element names */
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
  /* Allowed attribute names */
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
  /*
   * Configure how DOMPurify should handle custom elements and their attributes as well as customized built-in elements.
   * @property {RegExp|Function|null} tagNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any custom elements)
   * @property {RegExp|Function|null} attributeNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any attributes not on the allow list)
   * @property {boolean} allowCustomizedBuiltInElements allow custom elements derived from built-ins if they pass CUSTOM_ELEMENT_HANDLING.tagNameCheck. Default: `false`.
   */
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
  let FORBID_TAGS = null;
  /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
  let FORBID_ATTR = null;
  /* Config object to store ADD_TAGS/ADD_ATTR functions (when used as functions) */
  const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  /* Decide if ARIA attributes are okay */
  let ALLOW_ARIA_ATTR = true;
  /* Decide if custom data attributes are okay */
  let ALLOW_DATA_ATTR = true;
  /* Decide if unknown protocols are okay */
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  /* Decide if self-closing tags in attributes are allowed.
   * Usually removed due to a mXSS issue in jQuery 3.0 */
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  /* Output should be safe for common template engines.
   * This means, DOMPurify removes data attributes, mustaches and ERB
   */
  let SAFE_FOR_TEMPLATES = false;
  /* Output should be safe even for XML used within HTML and alike.
   * This means, DOMPurify removes comments when containing risky content.
   */
  let SAFE_FOR_XML = true;
  /* Decide if document with <html>... should be returned */
  let WHOLE_DOCUMENT = false;
  /* Track whether config is already set on this instance of DOMPurify. */
  let SET_CONFIG = false;
  /* Decide if all elements (e.g. style, script) must be children of
   * document.body. By default, browsers might move them to document.head */
  let FORCE_BODY = false;
  /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
   * string (or a TrustedHTML object if Trusted Types are supported).
   * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
   */
  let RETURN_DOM = false;
  /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
   * string  (or a TrustedHTML object if Trusted Types are supported) */
  let RETURN_DOM_FRAGMENT = false;
  /* Try to return a Trusted Type object instead of a string, return a string in
   * case Trusted Types are not supported  */
  let RETURN_TRUSTED_TYPE = false;
  /* Output should be free from DOM clobbering attacks?
   * This sanitizes markups named with colliding, clobberable built-in DOM APIs.
   */
  let SANITIZE_DOM = true;
  /* Achieve full DOM Clobbering protection by isolating the namespace of named
   * properties and JS variables, mitigating attacks that abuse the HTML/DOM spec rules.
   *
   * HTML/DOM spec rules that enable DOM Clobbering:
   *   - Named Access on Window (§7.3.3)
   *   - DOM Tree Accessors (§3.1.5)
   *   - Form Element Parent-Child Relations (§4.10.3)
   *   - Iframe srcdoc / Nested WindowProxies (§4.8.5)
   *   - HTMLCollection (§4.2.10.2)
   *
   * Namespace isolation is implemented by prefixing `id` and `name` attributes
   * with a constant string, i.e., `user-content-`
   */
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = 'user-content-';
  /* Keep element content when removing element? */
  let KEEP_CONTENT = true;
  /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
   * of importing it into a new Document and returning a sanitized copy */
  let IN_PLACE = false;
  /* Allow usage of profiles like html, svg and mathMl */
  let USE_PROFILES = {};
  /* Tags to ignore content of when KEEP_CONTENT is true */
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);
  /* Tags that are safe for data: URIs */
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);
  /* Attributes safe for values like "javascript:" */
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);
  const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  /* Document namespace */
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  /* Allowed XHTML+XML namespaces */
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);
  let HTML_INTEGRATION_POINTS = addToSet({}, ['annotation-xml']);
  // Certain elements are allowed in both SVG and HTML
  // namespace. We need to specify them explicitly
  // so that they don't get erroneously deleted from
  // HTML namespace.
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ['title', 'style', 'font', 'a', 'script']);
  /* Parsing of strict XHTML documents */
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
  const DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
  let transformCaseFunc = null;
  /* Keep a reference to config to pass to hooks */
  let CONFIG = null;
  /* Ideally, do not touch anything below this line */
  /* ______________________________________________ */
  const formElement = document.createElement('form');
  const isRegexOrFunction = function isRegexOrFunction(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  /**
   * _parseConfig
   *
   * @param cfg optional config literal
   */
  // eslint-disable-next-line complexity
  const _parseConfig = function _parseConfig() {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) {
      return;
    }
    /* Shield configuration object from tampering */
    if (!cfg || typeof cfg !== 'object') {
      cfg = {};
    }
    /* Shield configuration object from prototype pollution */
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE =
    // eslint-disable-next-line unicorn/prefer-includes
    SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    // HTML tags and attributes are not case-sensitive, converting to lowercase. Keeping XHTML as is.
    transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? stringToString : stringToLowerCase;
    /* Set configuration parameters */
    ALLOWED_TAGS = objectHasOwnProperty(cfg, 'ALLOWED_TAGS') ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
    ALLOWED_ATTR = objectHasOwnProperty(cfg, 'ALLOWED_ATTR') ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
    ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, 'ALLOWED_NAMESPACES') ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
    URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, 'ADD_URI_SAFE_ATTR') ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR, transformCaseFunc) : DEFAULT_URI_SAFE_ATTRIBUTES;
    DATA_URI_TAGS = objectHasOwnProperty(cfg, 'ADD_DATA_URI_TAGS') ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS, transformCaseFunc) : DEFAULT_DATA_URI_TAGS;
    FORBID_CONTENTS = objectHasOwnProperty(cfg, 'FORBID_CONTENTS') ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
    FORBID_TAGS = objectHasOwnProperty(cfg, 'FORBID_TAGS') ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : clone({});
    FORBID_ATTR = objectHasOwnProperty(cfg, 'FORBID_ATTR') ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : clone({});
    USE_PROFILES = objectHasOwnProperty(cfg, 'USE_PROFILES') ? cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false; // Default true
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false; // Default true
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
    RETURN_DOM = cfg.RETURN_DOM || false; // Default false
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
    FORCE_BODY = cfg.FORCE_BODY || false; // Default false
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false; // Default false
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
    IN_PLACE = cfg.IN_PLACE || false; // Default false
    IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
    NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = cfg.MATHML_TEXT_INTEGRATION_POINTS || MATHML_TEXT_INTEGRATION_POINTS;
    HTML_INTEGRATION_POINTS = cfg.HTML_INTEGRATION_POINTS || HTML_INTEGRATION_POINTS;
    CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || create(null);
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
      CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
    }
    if (SAFE_FOR_TEMPLATES) {
      ALLOW_DATA_ATTR = false;
    }
    if (RETURN_DOM_FRAGMENT) {
      RETURN_DOM = true;
    }
    /* Parse profile info */
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = create(null);
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    /* Always reset function-based ADD_TAGS / ADD_ATTR checks to prevent
     * leaking across calls when switching from function to array config */
    EXTRA_ELEMENT_HANDLING.tagCheck = null;
    EXTRA_ELEMENT_HANDLING.attributeCheck = null;
    /* Merge configuration parameters */
    if (cfg.ADD_TAGS) {
      if (typeof cfg.ADD_TAGS === 'function') {
        EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
      } else {
        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
          ALLOWED_TAGS = clone(ALLOWED_TAGS);
        }
        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
      }
    }
    if (cfg.ADD_ATTR) {
      if (typeof cfg.ADD_ATTR === 'function') {
        EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
      } else {
        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
          ALLOWED_ATTR = clone(ALLOWED_ATTR);
        }
        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
      }
    }
    if (cfg.ADD_URI_SAFE_ATTR) {
      addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
    }
    if (cfg.FORBID_CONTENTS) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
        FORBID_CONTENTS = clone(FORBID_CONTENTS);
      }
      addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
    }
    if (cfg.ADD_FORBID_CONTENTS) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
        FORBID_CONTENTS = clone(FORBID_CONTENTS);
      }
      addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
    }
    /* Add #text in case KEEP_CONTENT is set to true */
    if (KEEP_CONTENT) {
      ALLOWED_TAGS['#text'] = true;
    }
    /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
    if (WHOLE_DOCUMENT) {
      addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
    }
    /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ['tbody']);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== 'function') {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      }
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== 'function') {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      }
      // Overwrite existing TrustedTypes policy.
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      // Sign local variables required by `sanitize`.
      emptyHTML = trustedTypesPolicy.createHTML('');
    } else {
      // Uninitialized policy, attempt to initialize the internal dompurify policy.
      if (trustedTypesPolicy === undefined) {
        trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      }
      // If creating the internal policy succeeded sign internal variables.
      if (trustedTypesPolicy !== null && typeof emptyHTML === 'string') {
        emptyHTML = trustedTypesPolicy.createHTML('');
      }
    }
    // Prevent further manipulation of configuration.
    // Not available in IE8, Safari 5, etc.
    if (freeze) {
      freeze(cfg);
    }
    CONFIG = cfg;
  };
  /* Keep track of all possible SVG and MathML tags
   * so that we can perform the namespace checks
   * correctly. */
  const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  /**
   * @param element a DOM element whose namespace is being checked
   * @returns Return false if the element has a
   *  namespace that a spec-compliant parser would never
   *  return. Return true otherwise.
   */
  const _checkValidNamespace = function _checkValidNamespace(element) {
    let parent = getParentNode(element);
    // In JSDOM, if we're inside shadow DOM, then parentNode
    // can be null. We just simulate parent in this case.
    if (!parent || !parent.tagName) {
      parent = {
        namespaceURI: NAMESPACE,
        tagName: 'template'
      };
    }
    const tagName = stringToLowerCase(element.tagName);
    const parentTagName = stringToLowerCase(parent.tagName);
    if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
      return false;
    }
    if (element.namespaceURI === SVG_NAMESPACE) {
      // The only way to switch from HTML namespace to SVG
      // is via <svg>. If it happens via any other tag, then
      // it should be killed.
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === 'svg';
      }
      // The only way to switch from MathML to SVG is via`
      // svg if parent is either <annotation-xml> or MathML
      // text integration points.
      if (parent.namespaceURI === MATHML_NAMESPACE) {
        return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      }
      // We only allow elements that are defined in SVG
      // spec. All others are disallowed in SVG namespace.
      return Boolean(ALL_SVG_TAGS[tagName]);
    }
    if (element.namespaceURI === MATHML_NAMESPACE) {
      // The only way to switch from HTML namespace to MathML
      // is via <math>. If it happens via any other tag, then
      // it should be killed.
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === 'math';
      }
      // The only way to switch from SVG to MathML is via
      // <math> and HTML integration points
      if (parent.namespaceURI === SVG_NAMESPACE) {
        return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
      }
      // We only allow elements that are defined in MathML
      // spec. All others are disallowed in MathML namespace.
      return Boolean(ALL_MATHML_TAGS[tagName]);
    }
    if (element.namespaceURI === HTML_NAMESPACE) {
      // The only way to switch from SVG to HTML is via
      // HTML integration points, and from MathML to HTML
      // is via MathML text integration points
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      // We disallow tags that are specific for MathML
      // or SVG and should never appear in HTML namespace
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    }
    // For XHTML and XML documents that support custom namespaces
    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && ALLOWED_NAMESPACES[element.namespaceURI]) {
      return true;
    }
    // The code should never reach this place (this means
    // that the element somehow got namespace that is not
    // HTML, SVG, MathML or allowed via ALLOWED_NAMESPACES).
    // Return false just in case.
    return false;
  };
  /**
   * _forceRemove
   *
   * @param node a DOM node
   */
  const _forceRemove = function _forceRemove(node) {
    arrayPush(DOMPurify.removed, {
      element: node
    });
    try {
      // eslint-disable-next-line unicorn/prefer-dom-node-remove
      getParentNode(node).removeChild(node);
    } catch (_) {
      remove(node);
    }
  };
  /**
   * _removeAttribute
   *
   * @param name an Attribute name
   * @param element a DOM node
   */
  const _removeAttribute = function _removeAttribute(name, element) {
    try {
      arrayPush(DOMPurify.removed, {
        attribute: element.getAttributeNode(name),
        from: element
      });
    } catch (_) {
      arrayPush(DOMPurify.removed, {
        attribute: null,
        from: element
      });
    }
    element.removeAttribute(name);
    // We void attribute values for unremovable "is" attributes
    if (name === 'is') {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
        try {
          _forceRemove(element);
        } catch (_) {}
      } else {
        try {
          element.setAttribute(name, '');
        } catch (_) {}
      }
    }
  };
  /**
   * _initDocument
   *
   * @param dirty - a string of dirty markup
   * @return a DOM, filled with the dirty markup
   */
  const _initDocument = function _initDocument(dirty) {
    /* Create a HTML document */
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) {
      dirty = '<remove></remove>' + dirty;
    } else {
      /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && NAMESPACE === HTML_NAMESPACE) {
      // Root of XHTML doc must contain xmlns declaration (see https://www.w3.org/TR/xhtml1/normative.html#strict)
      dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
    }
    const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
    /*
     * Use the DOMParser API by default, fallback later if needs be
     * DOMParser not work for svg when has multiple root element.
     */
    if (NAMESPACE === HTML_NAMESPACE) {
      try {
        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
      } catch (_) {}
    }
    /* Use createHTMLDocument in case DOMParser is not available */
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, 'template', null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_) {
        // Syntax error if dirtyPayload is invalid xml
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) {
      body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    }
    /* Work on whole document or just its body */
    if (NAMESPACE === HTML_NAMESPACE) {
      return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
    }
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  /**
   * Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
   *
   * @param root The root element or node to start traversing on.
   * @return The created NodeIterator
   */
  const _createNodeIterator = function _createNodeIterator(root) {
    return createNodeIterator.call(root.ownerDocument || root, root,
    // eslint-disable-next-line no-bitwise
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
  };
  /**
   * _isClobbered
   *
   * @param element element to check for clobbering attacks
   * @return true if clobbered, false if safe
   */
  const _isClobbered = function _isClobbered(element) {
    return element instanceof HTMLFormElement && (typeof element.nodeName !== 'string' || typeof element.textContent !== 'string' || typeof element.removeChild !== 'function' || !(element.attributes instanceof NamedNodeMap) || typeof element.removeAttribute !== 'function' || typeof element.setAttribute !== 'function' || typeof element.namespaceURI !== 'string' || typeof element.insertBefore !== 'function' || typeof element.hasChildNodes !== 'function');
  };
  /**
   * Checks whether the given object is a DOM node.
   *
   * @param value object to check whether it's a DOM node
   * @return true is object is a DOM node
   */
  const _isNode = function _isNode(value) {
    return typeof Node === 'function' && value instanceof Node;
  };
  function _executeHooks(hooks, currentNode, data) {
    arrayForEach(hooks, hook => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  /**
   * _sanitizeElements
   *
   * @protect nodeName
   * @protect textContent
   * @protect removeChild
   * @param currentNode to check for permission to exist
   * @return true if node was killed, false if left alive
   */
  const _sanitizeElements = function _sanitizeElements(currentNode) {
    let content = null;
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    /* Check if element is clobbered or can clobber */
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Now let's check the element's type and name */
    const tagName = transformCaseFunc(currentNode.nodeName);
    /* Execute a hook if present */
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    /* Detect mXSS attempts abusing namespace confusion */
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w!]/g, currentNode.innerHTML) && regExpTest(/<[/\w!]/g, currentNode.textContent)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove risky CSS construction leading to mXSS */
    if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && tagName === 'style' && _isNode(currentNode.firstElementChild)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove any occurrence of processing instructions */
    if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove any kind of possibly harmful comments */
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove element if anything forbids its presence */
    if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
      /* Check if we have a custom element to handle */
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
          return false;
        }
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
          return false;
        }
      }
      /* Keep content except for bad-listed elements */
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode) || currentNode.parentNode;
        const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i = childCount - 1; i >= 0; --i) {
            const childClone = cloneNode(childNodes[i], true);
            childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
            parentNode.insertBefore(childClone, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    }
    /* Check whether element has a valid namespace */
    if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Make sure that older browsers don't get fallback-tag mXSS */
    if ((tagName === 'noscript' || tagName === 'noembed' || tagName === 'noframes') && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Sanitize element content to be template-safe */
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      /* Get the element's text content */
      content = currentNode.textContent;
      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
        content = stringReplace(content, expr, ' ');
      });
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, {
          element: currentNode.cloneNode()
        });
        currentNode.textContent = content;
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return false;
  };
  /**
   * _isValidAttribute
   *
   * @param lcTag Lowercase tag name of containing element.
   * @param lcName Lowercase attribute name.
   * @param value Attribute value.
   * @return Returns true if `value` is valid, otherwise false.
   */
  // eslint-disable-next-line complexity
  const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
    /* FORBID_ATTR must always win, even if ADD_ATTR predicate would allow it */
    if (FORBID_ATTR[lcName]) {
      return false;
    }
    /* Make sure attribute cannot clobber */
    if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
      return false;
    }
    /* Allow valid data-* attributes: At least one character after "-"
        (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
        XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
        We don't need to check the value; it's always URI safe. */
    if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName)) ; else if (EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
      if (
      // First condition does a very basic check if a) it's basically a valid custom element tagname AND
      // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
      // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
      _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName, lcTag)) ||
      // Alternative, second condition checks if it's an `is`-attribute, AND
      // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
      lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ; else {
        return false;
      }
      /* Check value is safe. First, is attr inert? If so, is safe */
    } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if (value) {
      return false;
    } else ;
    return true;
  };
  /**
   * _isBasicCustomElement
   * checks if at least one dash is included in tagName, and it's not the first char
   * for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
   *
   * @param tagName name of the tag of the node to sanitize
   * @returns Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
   */
  const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
    return tagName !== 'annotation-xml' && stringMatch(tagName, CUSTOM_ELEMENT);
  };
  /**
   * _sanitizeAttributes
   *
   * @protect attributes
   * @protect nodeName
   * @protect removeAttribute
   * @protect setAttribute
   *
   * @param currentNode to sanitize
   */
  const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    const {
      attributes
    } = currentNode;
    /* Check if we have attributes; if not we might have a text node */
    if (!attributes || _isClobbered(currentNode)) {
      return;
    }
    const hookEvent = {
      attrName: '',
      attrValue: '',
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: undefined
    };
    let l = attributes.length;
    /* Go backwards over all attributes; safely remove bad ones */
    while (l--) {
      const attr = attributes[l];
      const {
        name,
        namespaceURI,
        value: attrValue
      } = attr;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === 'value' ? initValue : stringTrim(initValue);
      /* Execute a hook if present */
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      /* Full DOM Clobbering protection via namespace isolation,
       * Prefix id and name attributes with `user-content-`
       */
      if (SANITIZE_NAMED_PROPS && (lcName === 'id' || lcName === 'name')) {
        // Remove the attribute with this value
        _removeAttribute(name, currentNode);
        // Prefix the value and later re-create the attribute with the sanitized value
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
      }
      /* Work around a security issue with comments inside attributes */
      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Make sure we cannot easily use animated hrefs, even if animations are allowed */
      if (lcName === 'attributename' && stringMatch(value, 'href')) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Did the hooks approve of the attribute? */
      if (hookEvent.forceKeepAttr) {
        continue;
      }
      /* Did the hooks approve of the attribute? */
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Work around a security issue in jQuery 3.0 */
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Sanitize attribute content to be template-safe */
      if (SAFE_FOR_TEMPLATES) {
        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
          value = stringReplace(value, expr, ' ');
        });
      }
      /* Is `value` valid for this attribute? */
      const lcTag = transformCaseFunc(currentNode.nodeName);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Handle attributes that require Trusted Types */
      if (trustedTypesPolicy && typeof trustedTypes === 'object' && typeof trustedTypes.getAttributeType === 'function') {
        if (namespaceURI) ; else {
          switch (trustedTypes.getAttributeType(lcTag, lcName)) {
            case 'TrustedHTML':
              {
                value = trustedTypesPolicy.createHTML(value);
                break;
              }
            case 'TrustedScriptURL':
              {
                value = trustedTypesPolicy.createScriptURL(value);
                break;
              }
          }
        }
      }
      /* Handle invalid data-* attribute set by try-catching it */
      if (value !== initValue) {
        try {
          if (namespaceURI) {
            currentNode.setAttributeNS(namespaceURI, name, value);
          } else {
            /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
            currentNode.setAttribute(name, value);
          }
          if (_isClobbered(currentNode)) {
            _forceRemove(currentNode);
          } else {
            arrayPop(DOMPurify.removed);
          }
        } catch (_) {
          _removeAttribute(name, currentNode);
        }
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
  };
  /**
   * _sanitizeShadowDOM
   *
   * @param fragment to iterate over recursively
   */
  const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      /* Execute a hook if present */
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      /* Sanitize tags and elements */
      _sanitizeElements(shadowNode);
      /* Check attributes next */
      _sanitizeAttributes(shadowNode);
      /* Deep shadow DOM detected */
      if (shadowNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM2(shadowNode.content);
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
  };
  // eslint-disable-next-line complexity
  DOMPurify.sanitize = function (dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    /* Make sure we have a string to sanitize.
      DO NOT return early, as this will return the wrong type if
      the user has requested a DOM object rather than a string */
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) {
      dirty = '<!-->';
    }
    /* Stringify, in case dirty is an object */
    if (typeof dirty !== 'string' && !_isNode(dirty)) {
      if (typeof dirty.toString === 'function') {
        dirty = dirty.toString();
        if (typeof dirty !== 'string') {
          throw typeErrorCreate('dirty is not a string, aborting');
        }
      } else {
        throw typeErrorCreate('toString is not a function');
      }
    }
    /* Return dirty HTML if DOMPurify cannot run */
    if (!DOMPurify.isSupported) {
      return dirty;
    }
    /* Assign config vars */
    if (!SET_CONFIG) {
      _parseConfig(cfg);
    }
    /* Clean up removed elements */
    DOMPurify.removed = [];
    /* Check if dirty is correctly typed for IN_PLACE */
    if (typeof dirty === 'string') {
      IN_PLACE = false;
    }
    if (IN_PLACE) {
      /* Do some early pre-sanitization to avoid unsafe root nodes */
      if (dirty.nodeName) {
        const tagName = transformCaseFunc(dirty.nodeName);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          throw typeErrorCreate('root node is forbidden and cannot be sanitized in-place');
        }
      }
    } else if (dirty instanceof Node) {
      /* If dirty is a DOM element, append to an empty document to avoid
         elements being stripped by the parser */
      body = _initDocument('<!---->');
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === 'BODY') {
        /* Node is already a body, use as is */
        body = importedNode;
      } else if (importedNode.nodeName === 'HTML') {
        body = importedNode;
      } else {
        // eslint-disable-next-line unicorn/prefer-dom-node-append
        body.appendChild(importedNode);
      }
    } else {
      /* Exit directly if we have nothing to do */
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
      // eslint-disable-next-line unicorn/prefer-includes
      dirty.indexOf('<') === -1) {
        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
      }
      /* Initialize the document to work on */
      body = _initDocument(dirty);
      /* Check we have a DOM node from the data */
      if (!body) {
        return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : '';
      }
    }
    /* Remove first element node (ours) if FORCE_BODY is set */
    if (body && FORCE_BODY) {
      _forceRemove(body.firstChild);
    }
    /* Get node iterator */
    const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
    /* Now start iterating over the created document */
    while (currentNode = nodeIterator.nextNode()) {
      /* Sanitize tags and elements */
      _sanitizeElements(currentNode);
      /* Check attributes next */
      _sanitizeAttributes(currentNode);
      /* Shadow DOM detected, sanitize it */
      if (currentNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM2(currentNode.content);
      }
    }
    /* If we sanitized `dirty` in-place, return it. */
    if (IN_PLACE) {
      return dirty;
    }
    /* Return sanitized string or DOM */
    if (RETURN_DOM) {
      if (SAFE_FOR_TEMPLATES) {
        body.normalize();
        let html = body.innerHTML;
        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
          html = stringReplace(html, expr, ' ');
        });
        body.innerHTML = html;
      }
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) {
          // eslint-disable-next-line unicorn/prefer-dom-node-append
          returnNode.appendChild(body.firstChild);
        }
      } else {
        returnNode = body;
      }
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
        /*
          AdoptNode() is not used because internal state is not reset
          (e.g. the past names map of a HTMLFormElement), this is safe
          in theory but we would rather not risk another attack vector.
          The state that is cloned by importNode() is explicitly defined
          by the specs.
        */
        returnNode = importNode.call(originalDocument, returnNode, true);
      }
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    /* Serialize doctype if allowed */
    if (WHOLE_DOCUMENT && ALLOWED_TAGS['!doctype'] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
      serializedHTML = '<!DOCTYPE ' + body.ownerDocument.doctype.name + '>\n' + serializedHTML;
    }
    /* Sanitize final string template-safe */
    if (SAFE_FOR_TEMPLATES) {
      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
        serializedHTML = stringReplace(serializedHTML, expr, ' ');
      });
    }
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function () {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
  };
  DOMPurify.clearConfig = function () {
    CONFIG = null;
    SET_CONFIG = false;
  };
  DOMPurify.isValidAttribute = function (tag, attr, value) {
    /* Initialize shared config vars if necessary. */
    if (!CONFIG) {
      _parseConfig({});
    }
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr);
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function (entryPoint, hookFunction) {
    if (typeof hookFunction !== 'function') {
      return;
    }
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function (entryPoint, hookFunction) {
    if (hookFunction !== undefined) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? undefined : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function (entryPoint) {
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function () {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify = createDOMPurify();


//# sourceMappingURL=purify.es.mjs.map


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".editor.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "wp-floorplan-360:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = (typeof document !== 'undefined' && document.baseURI) || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkwp_floorplan_360"] = self["webpackChunkwp_floorplan_360"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!***********************!*\
  !*** ./src/editor.js ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _editor_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./editor/state.js */ "./src/editor/state.js");
/* harmony import */ var _editor_helpers_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./editor/helpers.js */ "./src/editor/helpers.js");
/* harmony import */ var _editor_render_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./editor/render.js */ "./src/editor/render.js");
/* harmony import */ var _editor_ui_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./editor/ui.js */ "./src/editor/ui.js");
/* harmony import */ var _editor_helpers_floorplan_background_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./editor/helpers/floorplan-background.js */ "./src/editor/helpers/floorplan-background.js");
/**
 * src/editor.js
 * Entry point for the floorplan editor.
 * Webpack bundles this to assets/js/editor.js.
 *
 * Module map:
 *   state.js              — shared state & constants (imports nothing)
 *   helpers.js            — DOM refs, utilities, requestRedraw
 *   render.js             — renderSVG, renderHotspotList
 *   tools/polygon.js      — click-by-click polygon drawing
 *   tools/rectangle.js    — drag rectangle with wall snapping
 *   tools/merge.js        — merge two rectangles into L-shape
 *   detection/image.js    — shared pixel ops (morph, Otsu, Moore, RDP)
 *   detection/auto.js     — fully automatic room detection
 *   detection/seed.js     — click-to-seed watershed fill
 *   ui.js                 — all button handlers & SVG events
 */






document.addEventListener('DOMContentLoaded', function () {
  // 1. Wire up DOM references
  (0,_editor_helpers_js__WEBPACK_IMPORTED_MODULE_1__.initDomRefs)();

  // 2. Load initial hotspot data from hidden field
  var dataField = document.getElementById('fp360_hotspots_data');
  try {
    var raw = dataField ? dataField.value : '';
    _editor_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('FP360: Error parsing hotspot data', e);
    _editor_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = [];
  }

  // 3. Bind all UI events and button handlers
  (0,_editor_ui_js__WEBPACK_IMPORTED_MODULE_3__.initUI)();

  // 4. Restore SVG background if a vector floorplan was previously saved.
  //    The server already injected #fp360-svg-background into the DOM if
  //    _fp360_svg_markup exists, so we only need to ensure the overlay
  //    SVG and empty-state visibility are correct.
  var svgBgEl = document.getElementById('fp360-svg-background');
  if (svgBgEl) {
    var overlayEl = document.getElementById('fp360-svg-overlay');
    var emptyStateEl = document.getElementById('fp360-empty-state');
    if (overlayEl) overlayEl.style.display = 'block';
    if (emptyStateEl) emptyStateEl.style.display = 'none';
  }

  // 5. Initial render
  (0,_editor_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
  (0,_editor_render_js__WEBPACK_IMPORTED_MODULE_2__.renderSVG)();
});
})();

/******/ })()
;
//# sourceMappingURL=editor.js.map