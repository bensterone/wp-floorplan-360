/******/ (() => { // webpackBootstrap
/*!*****************************************!*\
  !*** ./src/editor/dxf/parser.worker.js ***!
  \*****************************************/
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * parser.worker.js
 * Web Worker: parses a DXF text string into structured JSON data.
 *
 * Messages received:
 *   { type: 'parse', text: string }
 *
 * Messages posted:
 *   { type: 'progress', percent: number }
 *   { type: 'result',   parsed: ParsedDxf }
 *   { type: 'error',    message: string }
 */

/* eslint-disable no-restricted-globals */

self.onmessage = function (e) {
  if (e.data.type !== 'parse') return;
  try {
    var parsed = parseDxf(e.data.text);
    self.postMessage({
      type: 'result',
      parsed: parsed
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err.message
    });
  }
};

// ---------------------------------------------------------------------------
// Unicode / text helpers (duplicated here — worker has no ES module imports)
// ---------------------------------------------------------------------------

function decodeUnicode(text) {
  return text.replace(/\\U\+([0-9A-Fa-f]{4})/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}
function stripMtext(text) {
  return text.replace(/\\S([^;^]+)\^([^;]*);?/g, '$1/$2').replace(/\\[fFhHwWaAcCpPqQ][^;]*;/g, '').replace(/\\P/g, ' ').replace(/\\~/g, ' ').replace(/\\[^\\]/g, '').replace(/[{}]/g, '').trim();
}

// ---------------------------------------------------------------------------
// Pair parsing
// ---------------------------------------------------------------------------

/**
 * Split DXF text into [groupCode, value] pairs.
 * @param {string} text
 * @returns {Array<[number, string]>}
 */
function parsePairs(text) {
  var lines = text.split(/\r?\n/);
  var pairs = [];
  for (var i = 0; i + 1 < lines.length; i += 2) {
    var code = parseInt(lines[i].trim(), 10);
    if (!isNaN(code)) {
      pairs.push([code, lines[i + 1].trim()]);
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

function parseDxf(text) {
  var pairs = parsePairs(text);
  var total = pairs.length;
  var result = {
    header: {
      units: 0,
      codepage: 'ANSI_1252'
    },
    layers: {},
    blocks: {},
    entities: {
      polylines: [],
      lines: [],
      arcs: [],
      circles: [],
      texts: [],
      inserts: []
    }
  };
  var i = 0;

  // Progress helper: post every ~5 % advance
  var lastPercent = 0;
  function maybeProgress() {
    var pct = Math.floor(i / total * 100);
    if (pct >= lastPercent + 5) {
      lastPercent = pct;
      self.postMessage({
        type: 'progress',
        percent: pct
      });
    }
  }

  // Advance past the current group-code=0 record (section/entity header)
  // to the next group-code=0 record, returning the index of it.
  function findNextZero(from) {
    var j = from + 1;
    while (j < pairs.length && pairs[j][0] !== 0) j++;
    return j;
  }
  while (i < pairs.length) {
    maybeProgress();
    if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION') {
      i++;
      if (i < pairs.length && pairs[i][0] === 2) {
        var sectionName = pairs[i][1];
        i++;
        if (sectionName === 'HEADER') {
          i = parseHeader(pairs, i, result.header);
        } else if (sectionName === 'TABLES') {
          i = parseTables(pairs, i, result.layers);
        } else if (sectionName === 'BLOCKS') {
          i = parseBlocks(pairs, i, result.blocks);
        } else if (sectionName === 'ENTITIES') {
          i = parseEntities(pairs, i, result.entities);
        } else {
          // Skip unknown section
          while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) {
            i++;
          }
        }
      }
    } else {
      i++;
    }
  }
  self.postMessage({
    type: 'progress',
    percent: 100
  });
  return result;
}

// ---------------------------------------------------------------------------
// HEADER section
// ---------------------------------------------------------------------------

function parseHeader(pairs, i, header) {
  while (i < pairs.length) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') {
      i++;
      break;
    }
    if (pairs[i][0] === 9) {
      var varName = pairs[i][1];
      i++;
      if (varName === '$INSUNITS' && i < pairs.length) header.units = parseInt(pairs[i][1], 10) || 0;
      if (varName === '$DWGCODEPAGE' && i < pairs.length) header.codepage = pairs[i][1];
    } else {
      i++;
    }
  }
  return i;
}

// ---------------------------------------------------------------------------
// TABLES section — extract layer names and colours
// ---------------------------------------------------------------------------

function parseTables(pairs, i, layers) {
  while (i < pairs.length) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') {
      i++;
      break;
    }
    if (pairs[i][0] === 0 && pairs[i][1] === 'LAYER') {
      i++;
      var name = '';
      var color = 7;
      while (i < pairs.length && pairs[i][0] !== 0) {
        if (pairs[i][0] === 2) name = pairs[i][1];
        if (pairs[i][0] === 62) color = parseInt(pairs[i][1], 10);
        i++;
      }
      if (name) layers[name] = {
        color: color
      };
    } else {
      i++;
    }
  }
  return i;
}

// ---------------------------------------------------------------------------
// BLOCKS section — collect named block definitions
// ---------------------------------------------------------------------------

function parseBlocks(pairs, i, blocks) {
  while (i < pairs.length) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') {
      i++;
      break;
    }
    if (pairs[i][0] === 0 && pairs[i][1] === 'BLOCK') {
      i++;
      var name = '';
      var bpx = 0,
        bpy = 0;
      // Read BLOCK header group codes (before first entity)
      while (i < pairs.length && pairs[i][0] !== 0) {
        if (pairs[i][0] === 2) name = pairs[i][1];
        if (pairs[i][0] === 10) bpx = parseFloat(pairs[i][1]);
        if (pairs[i][0] === 20) bpy = parseFloat(pairs[i][1]);
        i++;
      }

      // Skip *Model_Space and *Paper_Space block definitions
      var skip = name.startsWith('*');
      var blockEntities = {
        polylines: [],
        lines: [],
        arcs: [],
        circles: [],
        texts: [],
        inserts: []
      };

      // Read entities until ENDBLK
      while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDBLK')) {
        if (pairs[i][0] === 0) {
          var entityType = pairs[i][1];
          i++;
          if (!skip) {
            i = readEntity(pairs, i, entityType, blockEntities);
          } else {
            // skip to next group-0
            while (i < pairs.length && pairs[i][0] !== 0) i++;
          }
        } else {
          i++;
        }
      }
      if (i < pairs.length) i++; // consume ENDBLK

      if (!skip && name) {
        blocks[name] = {
          basePoint: {
            x: bpx,
            y: bpy
          },
          entities: blockEntities
        };
      }
    } else {
      i++;
    }
  }
  return i;
}

// ---------------------------------------------------------------------------
// ENTITIES section
// ---------------------------------------------------------------------------

function parseEntities(pairs, i, entities) {
  while (i < pairs.length) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') {
      i++;
      break;
    }
    if (pairs[i][0] === 0) {
      var entityType = pairs[i][1];
      i++;
      i = readEntity(pairs, i, entityType, entities);
    } else {
      i++;
    }
  }
  return i;
}

// ---------------------------------------------------------------------------
// Entity reader — shared by BLOCKS and ENTITIES sections
// ---------------------------------------------------------------------------

/**
 * Read one entity's group codes starting at index i (i points to first code
 * AFTER the "0 ENTITY_TYPE" pair). Returns the index of the next "0" pair.
 */
function readEntity(pairs, i, type, bucket) {
  switch (type) {
    case 'LWPOLYLINE':
      return readLwpolyline(pairs, i, bucket);
    case 'LINE':
      return readLine(pairs, i, bucket);
    case 'ARC':
      return readArc(pairs, i, bucket);
    case 'CIRCLE':
      return readCircle(pairs, i, bucket);
    case 'TEXT':
      return readText(pairs, i, bucket, false);
    case 'MTEXT':
      return readText(pairs, i, bucket, true);
    case 'INSERT':
      return readInsert(pairs, i, bucket);
    default:
      // Skip unsupported entity — advance to next group-0
      while (i < pairs.length && pairs[i][0] !== 0) i++;
      return i;
  }
}

// --- LWPOLYLINE ---

function readLwpolyline(pairs, i, bucket) {
  var layer = '0';
  var closed = false;
  var verts = [];
  var curVert = null;
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i = _slicedToArray(pairs[i], 2),
      code = _pairs$i[0],
      val = _pairs$i[1];
    if (code === 8) layer = val;
    if (code === 70) closed = (parseInt(val, 10) & 1) === 1;
    if (code === 10) {
      curVert = {
        x: parseFloat(val),
        y: 0,
        bulge: 0
      };
      verts.push(curVert);
    }
    if (code === 20 && curVert) curVert.y = parseFloat(val);
    if (code === 42 && curVert) curVert.bulge = parseFloat(val);
    i++;
  }
  if (verts.length >= 2) {
    bucket.polylines.push({
      layer: layer,
      vertices: verts,
      closed: closed
    });
  }
  return i;
}

// --- LINE ---

function readLine(pairs, i, bucket) {
  var layer = '0',
    x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0;
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i2 = _slicedToArray(pairs[i], 2),
      code = _pairs$i2[0],
      val = _pairs$i2[1];
    if (code === 8) layer = val;
    if (code === 10) x1 = parseFloat(val);
    if (code === 20) y1 = parseFloat(val);
    if (code === 11) x2 = parseFloat(val);
    if (code === 21) y2 = parseFloat(val);
    i++;
  }
  bucket.lines.push({
    layer: layer,
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2
  });
  return i;
}

// --- ARC ---

function readArc(pairs, i, bucket) {
  var layer = '0',
    cx = 0,
    cy = 0,
    radius = 1,
    startAngle = 0,
    endAngle = 360;
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i3 = _slicedToArray(pairs[i], 2),
      code = _pairs$i3[0],
      val = _pairs$i3[1];
    if (code === 8) layer = val;
    if (code === 10) cx = parseFloat(val);
    if (code === 20) cy = parseFloat(val);
    if (code === 40) radius = parseFloat(val);
    if (code === 50) startAngle = parseFloat(val);
    if (code === 51) endAngle = parseFloat(val);
    i++;
  }
  bucket.arcs.push({
    layer: layer,
    cx: cx,
    cy: cy,
    radius: radius,
    startAngle: startAngle,
    endAngle: endAngle
  });
  return i;
}

// --- CIRCLE ---

function readCircle(pairs, i, bucket) {
  var layer = '0',
    cx = 0,
    cy = 0,
    radius = 1;
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i4 = _slicedToArray(pairs[i], 2),
      code = _pairs$i4[0],
      val = _pairs$i4[1];
    if (code === 8) layer = val;
    if (code === 10) cx = parseFloat(val);
    if (code === 20) cy = parseFloat(val);
    if (code === 40) radius = parseFloat(val);
    i++;
  }
  bucket.circles.push({
    layer: layer,
    cx: cx,
    cy: cy,
    radius: radius
  });
  return i;
}

// --- TEXT / MTEXT ---

function readText(pairs, i, bucket, isMtext) {
  var layer = '0',
    x = 0,
    y = 0,
    height = 0.15,
    rotation = 0,
    content = '';
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i5 = _slicedToArray(pairs[i], 2),
      code = _pairs$i5[0],
      val = _pairs$i5[1];
    if (code === 8) layer = val;
    if (code === 10) x = parseFloat(val);
    if (code === 20) y = parseFloat(val);
    if (code === 40) height = parseFloat(val);
    if (code === 50) rotation = parseFloat(val);
    if (code === 1) content = val;
    i++;
  }
  var text = decodeUnicode(content);
  if (isMtext) text = stripMtext(text);
  text = text.trim();
  if (text) {
    bucket.texts.push({
      layer: layer,
      x: x,
      y: y,
      height: height,
      rotation: rotation,
      text: text
    });
  }
  return i;
}

// --- INSERT ---

function readInsert(pairs, i, bucket) {
  var layer = '0',
    blockName = '',
    x = 0,
    y = 0;
  var scaleX = 1,
    scaleY = 1,
    rotation = 0;
  // Track whether scale values were explicitly set (default = 1 if absent)
  while (i < pairs.length && pairs[i][0] !== 0) {
    var _pairs$i6 = _slicedToArray(pairs[i], 2),
      code = _pairs$i6[0],
      val = _pairs$i6[1];
    if (code === 8) layer = val;
    if (code === 2) blockName = val;
    if (code === 10) x = parseFloat(val);
    if (code === 20) y = parseFloat(val);
    if (code === 41) scaleX = parseFloat(val);
    if (code === 42) scaleY = parseFloat(val);
    if (code === 50) rotation = parseFloat(val);
    i++;
  }
  if (blockName) {
    bucket.inserts.push({
      layer: layer,
      blockName: blockName,
      x: x,
      y: y,
      scaleX: scaleX,
      scaleY: scaleY,
      rotation: rotation
    });
  }
  return i;
}
/******/ })()
;
//# sourceMappingURL=src_editor_dxf_parser_worker_js.editor.js.map