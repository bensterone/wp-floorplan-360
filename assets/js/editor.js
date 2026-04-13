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
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth || _helpers_js__WEBPACK_IMPORTED_MODULE_1__.$emptyState.is(':visible')) {
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
/* harmony export */   $dataField: () => (/* binding */ $dataField),
/* harmony export */   $emptyState: () => (/* binding */ $emptyState),
/* harmony export */   $imageUrlInput: () => (/* binding */ $imageUrlInput),
/* harmony export */   generateId: () => (/* binding */ generateId),
/* harmony export */   getCentroid: () => (/* binding */ getCentroid),
/* harmony export */   getNormalizedPos: () => (/* binding */ getNormalizedPos),
/* harmony export */   imgEl: () => (/* binding */ imgEl),
/* harmony export */   initDomRefs: () => (/* binding */ initDomRefs),
/* harmony export */   nextColor: () => (/* binding */ nextColor),
/* harmony export */   registerRenderFn: () => (/* binding */ registerRenderFn),
/* harmony export */   requestRedraw: () => (/* binding */ requestRedraw),
/* harmony export */   saveHotspots: () => (/* binding */ saveHotspots),
/* harmony export */   svg: () => (/* binding */ svg)
/* harmony export */ });
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./state.js */ "./src/editor/state.js");
/**
 * helpers.js
 * Pure utility functions shared across all modules.
 */



// DOM references — set by initDomRefs() inside document.ready
var $dataField, $imageUrlInput, svg, imgEl, $emptyState;
function initDomRefs() {
  var $ = window.jQuery;
  $dataField = $('#fp360_hotspots_data');
  $imageUrlInput = $('#fp360_image_url');
  svg = document.getElementById('fp360-svg-overlay');
  imgEl = document.getElementById('fp360-floorplan-img');
  $emptyState = $('#fp360-empty-state');
}

// render.js registers its renderSVG here to avoid circular imports.
var _renderSVG = function _renderSVG() {};
function registerRenderFn(fn) {
  _renderSVG = fn;
}
function saveHotspots() {
  $dataField.val(JSON.stringify(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots));
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
  var $ = window.jQuery;
  /* global fp360Admin */
  var $ul = $('#fp360-hotspot-items').empty();
  $('#fp360-merge-rooms').toggle(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.size === 2);
  _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.forEach(function (hs) {
    var isSelected = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.has(hs.id);
    var color = hs.color || _state_js__WEBPACK_IMPORTED_MODULE_0__.COLORS[0];
    var $li = $('<li>').addClass('fp360-hs-item').toggleClass('is-active', isSelected);
    $li[0].style.setProperty('--hs-color', color);
    var $swatch = $('<span>').addClass('fp360-hs-swatch').css('background-color', color);
    var $label = $('<input>', {
      type: 'text',
      "class": 'fp360-hs-label',
      'data-id': hs.id,
      placeholder: fp360Admin.i18n.roomLabel || 'Room Label'
    }).val(hs.label);
    var $row = $('<div>').addClass('fp360-hs-input-row');
    var $urlInput = $('<input>', {
      type: 'text',
      "class": 'fp360-hs-img360',
      'data-id': hs.id,
      placeholder: '360 Image URL'
    }).val(hs.image360);
    var $pickBtn = $('<button>', {
      type: 'button',
      "class": 'button fp360-hs-pick360',
      'data-id': hs.id,
      text: fp360Admin.i18n.pick360
    });
    var $deleteBtn = $('<button>', {
      type: 'button',
      "class": 'button button-link-delete fp360-hs-delete',
      'data-id': hs.id,
      text: fp360Admin.i18n.deleteRoom
    });
    var $header = $('<div>').addClass('fp360-hs-header').append($swatch, $label);
    $row.append($urlInput, $pickBtn);
    $li.append($header, $row, $deleteBtn);
    $ul.append($li);
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
  if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.naturalWidth) return;
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
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
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
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  var dialog = document.createElement('div');
  dialog.style.cssText = 'background:#fff;border-radius:4px;padding:24px;max-width:420px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  var msg = document.createElement('p');
  msg.style.cssText = 'margin:0 0 20px;font-size:14px;line-height:1.5;color:#1d2327;';
  msg.textContent = message;
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'button';
  cancelBtn.textContent = i18n.cancel || 'Cancel';
  var okBtn = document.createElement('button');
  okBtn.className = 'button button-primary';
  okBtn.textContent = i18n.ok || 'OK';
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
  var $ = window.jQuery;
  $('#fp360-detect-status').text(message).removeClass('fp360-status--info fp360-status--success fp360-status--warn').addClass('fp360-status--error').show();
}
function initUI() {
  var $ = window.jQuery;

  // --- Media frames ---
  // wp.media() frames are expensive — each call creates a new Backbone view
  // that accumulates in memory. We create each frame once and reuse it.
  // The per-room 360° picker reuses a single frame by swapping the select
  // callback each time so the correct room ID is always captured.

  var floorplanFrame = null;
  $('#fp360_pick_image').on('click', function (e) {
    e.preventDefault();
    if (typeof wp === 'undefined' || !wp.media) return;
    if (!floorplanFrame) {
      floorplanFrame = wp.media({
        title: fp360Admin.i18n.selectFloorplan || 'Select Floorplan',
        multiple: false
      });
      floorplanFrame.on('select', function () {
        var attachment = floorplanFrame.state().get('selection').first().toJSON();
        _helpers_js__WEBPACK_IMPORTED_MODULE_1__.$imageUrlInput.val(attachment.url);
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl) {
          _helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.src = attachment.url;
          $(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl).show();
        }
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) $(_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg).show();
        if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.$emptyState) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.$emptyState.hide();
        (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
      });
    }
    floorplanFrame.open();
  });

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
      if (!_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl || !_helpers_js__WEBPACK_IMPORTED_MODULE_1__.imgEl.src || _helpers_js__WEBPACK_IMPORTED_MODULE_1__.$emptyState && _helpers_js__WEBPACK_IMPORTED_MODULE_1__.$emptyState.is(':visible')) return;
      var pos = (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.getNormalizedPos)(e);

      // Seed mode click
      if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.push({
          x: pos.x,
          y: pos.y
        });
        $('#fp360-run-fill').prop('disabled', false);
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

  $('#fp360-undo-point').on('click', function () {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.pop();
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints.length === 0) {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
    }
    (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
  });

  // Polygon tool toggle
  $('#fp360-poly-tool').on('click', function () {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode;
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode) {
      // Exit other active modes
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectStart = null;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectCurrent = null;
      $('#fp360-rect-tool').removeClass('is-active').text(fp360Admin.i18n.rectTool || 'Rectangle');
      $('#fp360-seed-mode').removeClass('is-active').text(fp360Admin.i18n.seedMode || 'Seed Rooms');
      $(this).addClass('is-active').text(fp360Admin.i18n.polyModeActive || '✕ Cancel Polygon');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
    } else {
      // Cancelling — discard any in-progress drawing
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
      $(this).removeClass('is-active').text(fp360Admin.i18n.polyTool || 'Polygon');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
    }
    (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
  });
  $('#fp360-rect-tool').on('click', function () {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode;
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.rectMode) {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = false;
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
      $('#fp360-seed-mode').removeClass('is-active').text(fp360Admin.i18n.seedMode || 'Seed Rooms');
      $('#fp360-poly-tool').removeClass('is-active').text(fp360Admin.i18n.polyTool || 'Polygon');
      $(this).addClass('is-active').text(fp360Admin.i18n.rectModeActive || 'Cancel Rectangle');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
    } else {
      $(this).removeClass('is-active').text(fp360Admin.i18n.rectTool || 'Rectangle');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
    }
    (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
  });

  // Experimental panel toggle
  $('#fp360-experimental-toggle').on('click', function () {
    var $panel = $('#fp360-experimental-panel');
    var open = $panel.is(':visible');
    $panel.toggle(!open);
    $(this).toggleClass('is-active', !open).find('.fp360-exp-arrow').text(open ? '▾' : '▴');
  });
  $('#fp360-merge-rooms').on('click', function () {
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
  $('#fp360-seed-mode').on('click', function () {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = !_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode;
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode) {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.drawing = false;
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.currentPoints = [];
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.polyMode = false;
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.classList.remove('fp360-snap-active');
      $('#fp360-poly-tool').removeClass('is-active').text(fp360Admin.i18n.polyTool || 'Polygon');
      $(this).addClass('is-active').text(fp360Admin.i18n.seedModeActive || 'Cancel Seed Mode');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = 'crosshair';
      $('#fp360-run-fill').prop('disabled', _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.length === 0);
      setDetectionStatus('seed-mode');
    } else {
      $(this).removeClass('is-active').text(fp360Admin.i18n.seedMode || 'Seed Rooms');
      if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
      $('#fp360-run-fill').prop('disabled', true);
      setDetectionStatus('idle');
    }
    (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
  });
  $('#fp360-run-fill').on('click', function () {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds.length === 0) return;
    var tolerance = parseInt($('#fp360-detect-tolerance').val(), 10) || 3;
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seedMode = false;
    $('#fp360-seed-mode').removeClass('is-active').text(fp360Admin.i18n.seedMode || 'Seed Rooms');
    if (_helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg) _helpers_js__WEBPACK_IMPORTED_MODULE_1__.svg.style.cursor = '';
    $('#fp360-run-fill').prop('disabled', true);
    (0,_detection_seed_js__WEBPACK_IMPORTED_MODULE_7__.runSeedFill)(_state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds, tolerance);
  });
  $('#fp360-clear-seeds').on('click', function () {
    _state_js__WEBPACK_IMPORTED_MODULE_0__.state.seeds = [];
    $('#fp360-run-fill').prop('disabled', true);
    (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
  });
  $('#fp360-detect-rooms').on('click', function () {
    var tolerance = parseInt($('#fp360-detect-tolerance').val(), 10) || 3;
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
  $('#fp360-clear-rooms').on('click', function () {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.length === 0) return;
    fp360Confirm(fp360Admin.i18n.clearAllConfirm || 'Delete all rooms?', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = [];
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds.clear();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  });
  $('#fp360-detect-tolerance').on('input', function () {
    $('#fp360-detect-tolerance-val').text($(this).val());
  });

  // --- Delegated handlers ---

  var pick360Frame = null;
  var pick360Handler = null;
  $(document).on('click', '.fp360-hs-pick360', function (e) {
    e.preventDefault();
    var id = $(this).data('id');
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
  });
  $(document).on('click', '.fp360-hs-delete', function () {
    var id = $(this).data('id');
    fp360Confirm(fp360Admin.i18n.deleteRoomConfirm || 'Delete this room?', function () {
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.filter(function (h) {
        return h.id !== id;
      });
      _state_js__WEBPACK_IMPORTED_MODULE_0__.state.selectedIds["delete"](id);
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    });
  });
  $(document).on('input', '.fp360-hs-label, .fp360-hs-img360', function () {
    var id = $(this).data('id');
    var hs = _state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots.find(function (h) {
      return h.id === id;
    });
    if (hs) {
      hs.label = $(".fp360-hs-label[data-id=\"".concat(id, "\"]")).val();
      hs.image360 = $(".fp360-hs-img360[data-id=\"".concat(id, "\"]")).val();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.saveHotspots)();
      (0,_helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw)();
    }
  });
  window.addEventListener('resize', _helpers_js__WEBPACK_IMPORTED_MODULE_1__.requestRedraw);
}

/** Updates the status bar. Called by detection modules and toolbar toggles. */
function setDetectionStatus(status, count) {
  var $ = window.jQuery;
  /* global fp360Admin */
  var $btn = $('#fp360-detect-rooms');
  var $status = $('#fp360-detect-status');
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
  $btn.prop('disabled', cfg.disabled).text(cfg.btn);
  $status.text(msgMap[status] || '').removeClass('fp360-status--info fp360-status--success fp360-status--warn fp360-status--error').addClass(cfg.cls).show();
}

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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
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





(function ($) {
  $(document).ready(function () {
    // 1. Wire up DOM references
    (0,_editor_helpers_js__WEBPACK_IMPORTED_MODULE_1__.initDomRefs)();

    // 2. Load initial hotspot data from hidden field
    var $dataField = $('#fp360_hotspots_data');
    try {
      var raw = $dataField.val();
      _editor_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('FP360: Error parsing hotspot data', e);
      _editor_state_js__WEBPACK_IMPORTED_MODULE_0__.state.hotspots = [];
    }

    // 3. Bind all UI events and button handlers
    (0,_editor_ui_js__WEBPACK_IMPORTED_MODULE_3__.initUI)();

    // 4. Initial render
    (0,_editor_render_js__WEBPACK_IMPORTED_MODULE_2__.renderHotspotList)();
    (0,_editor_render_js__WEBPACK_IMPORTED_MODULE_2__.renderSVG)();
  });
})(jQuery);
})();

/******/ })()
;
//# sourceMappingURL=editor.js.map