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
        const parsed = parseDxf(e.data.text);
        self.postMessage({ type: 'result', parsed });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};

// ---------------------------------------------------------------------------
// Unicode / text helpers (duplicated here — worker has no ES module imports)
// ---------------------------------------------------------------------------

function decodeUnicode(text) {
    return text.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );
}

function stripMtext(text) {
    return text
        .replace(/\\S([^;^]+)\^([^;]*);?/g, '$1/$2')
        .replace(/\\[fFhHwWaAcCpPqQ][^;]*;/g, '')
        .replace(/\\P/g, ' ')
        .replace(/\\~/g, ' ')
        .replace(/\\[^\\]/g, '')
        .replace(/[{}]/g, '')
        .trim();
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
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
        const code = parseInt(lines[i].trim(), 10);
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
    const pairs = parsePairs(text);
    const total  = pairs.length;

    const result = {
        header:   { units: 0, codepage: 'ANSI_1252' },
        layers:   {},
        blocks:   {},
        entities: {
            polylines: [],
            lines:     [],
            arcs:      [],
            circles:   [],
            texts:     [],
            inserts:   [],
        },
    };

    let i = 0;

    // Progress helper: post every ~5 % advance
    let lastPercent = 0;
    function maybeProgress() {
        const pct = Math.floor((i / total) * 100);
        if (pct >= lastPercent + 5) {
            lastPercent = pct;
            self.postMessage({ type: 'progress', percent: pct });
        }
    }

    // Advance past the current group-code=0 record (section/entity header)
    // to the next group-code=0 record, returning the index of it.
    function findNextZero(from) {
        let j = from + 1;
        while (j < pairs.length && pairs[j][0] !== 0) j++;
        return j;
    }

    while (i < pairs.length) {
        maybeProgress();

        if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION') {
            i++;
            if (i < pairs.length && pairs[i][0] === 2) {
                const sectionName = pairs[i][1];
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
                    while (i < pairs.length &&
                           !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) {
                        i++;
                    }
                }
            }
        } else {
            i++;
        }
    }

    self.postMessage({ type: 'progress', percent: 100 });
    return result;
}

// ---------------------------------------------------------------------------
// HEADER section
// ---------------------------------------------------------------------------

function parseHeader(pairs, i, header) {
    while (i < pairs.length) {
        if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') { i++; break; }
        if (pairs[i][0] === 9) {
            const varName = pairs[i][1];
            i++;
            if (varName === '$INSUNITS'   && i < pairs.length) header.units    = parseInt(pairs[i][1], 10) || 0;
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
        if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') { i++; break; }

        if (pairs[i][0] === 0 && pairs[i][1] === 'LAYER') {
            i++;
            let name  = '';
            let color = 7;
            while (i < pairs.length && pairs[i][0] !== 0) {
                if (pairs[i][0] === 2)  name  = pairs[i][1];
                if (pairs[i][0] === 62) color = parseInt(pairs[i][1], 10);
                i++;
            }
            if (name) layers[name] = { color };
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
        if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') { i++; break; }

        if (pairs[i][0] === 0 && pairs[i][1] === 'BLOCK') {
            i++;
            let name = '';
            let bpx  = 0, bpy = 0;
            // Read BLOCK header group codes (before first entity)
            while (i < pairs.length && pairs[i][0] !== 0) {
                if (pairs[i][0] === 2)  name = pairs[i][1];
                if (pairs[i][0] === 10) bpx  = parseFloat(pairs[i][1]);
                if (pairs[i][0] === 20) bpy  = parseFloat(pairs[i][1]);
                i++;
            }

            // Skip *Model_Space and *Paper_Space block definitions
            const skip = name.startsWith('*');
            const blockEntities = { polylines: [], lines: [], arcs: [], circles: [], texts: [], inserts: [] };

            // Read entities until ENDBLK
            while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDBLK')) {
                if (pairs[i][0] === 0) {
                    const entityType = pairs[i][1];
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
                blocks[name] = { basePoint: { x: bpx, y: bpy }, entities: blockEntities };
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
        if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') { i++; break; }

        if (pairs[i][0] === 0) {
            const entityType = pairs[i][1];
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
        case 'LWPOLYLINE': return readLwpolyline(pairs, i, bucket);
        case 'LINE':       return readLine(pairs, i, bucket);
        case 'ARC':        return readArc(pairs, i, bucket);
        case 'CIRCLE':     return readCircle(pairs, i, bucket);
        case 'TEXT':       return readText(pairs, i, bucket, false);
        case 'MTEXT':      return readText(pairs, i, bucket, true);
        case 'INSERT':     return readInsert(pairs, i, bucket);
        default:
            // Skip unsupported entity — advance to next group-0
            while (i < pairs.length && pairs[i][0] !== 0) i++;
            return i;
    }
}

// --- LWPOLYLINE ---

function readLwpolyline(pairs, i, bucket) {
    let layer    = '0';
    let closed   = false;
    const verts  = [];
    let curVert  = null;

    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer  = val;
        if (code === 70) closed = (parseInt(val, 10) & 1) === 1;
        if (code === 10) {
            curVert = { x: parseFloat(val), y: 0, bulge: 0 };
            verts.push(curVert);
        }
        if (code === 20 && curVert) curVert.y     = parseFloat(val);
        if (code === 42 && curVert) curVert.bulge = parseFloat(val);
        i++;
    }

    if (verts.length >= 2) {
        bucket.polylines.push({ layer, vertices: verts, closed });
    }
    return i;
}

// --- LINE ---

function readLine(pairs, i, bucket) {
    let layer = '0', x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer = val;
        if (code === 10) x1    = parseFloat(val);
        if (code === 20) y1    = parseFloat(val);
        if (code === 11) x2    = parseFloat(val);
        if (code === 21) y2    = parseFloat(val);
        i++;
    }
    bucket.lines.push({ layer, x1, y1, x2, y2 });
    return i;
}

// --- ARC ---

function readArc(pairs, i, bucket) {
    let layer = '0', cx = 0, cy = 0, radius = 1, startAngle = 0, endAngle = 360;
    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer      = val;
        if (code === 10) cx         = parseFloat(val);
        if (code === 20) cy         = parseFloat(val);
        if (code === 40) radius     = parseFloat(val);
        if (code === 50) startAngle = parseFloat(val);
        if (code === 51) endAngle   = parseFloat(val);
        i++;
    }
    bucket.arcs.push({ layer, cx, cy, radius, startAngle, endAngle });
    return i;
}

// --- CIRCLE ---

function readCircle(pairs, i, bucket) {
    let layer = '0', cx = 0, cy = 0, radius = 1;
    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer  = val;
        if (code === 10) cx     = parseFloat(val);
        if (code === 20) cy     = parseFloat(val);
        if (code === 40) radius = parseFloat(val);
        i++;
    }
    bucket.circles.push({ layer, cx, cy, radius });
    return i;
}

// --- TEXT / MTEXT ---

function readText(pairs, i, bucket, isMtext) {
    let layer = '0', x = 0, y = 0, height = 0.15, rotation = 0, content = '';
    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer    = val;
        if (code === 10) x        = parseFloat(val);
        if (code === 20) y        = parseFloat(val);
        if (code === 40) height   = parseFloat(val);
        if (code === 50) rotation = parseFloat(val);
        if (code === 1)  content  = val;
        i++;
    }

    let text = decodeUnicode(content);
    if (isMtext) text = stripMtext(text);
    text = text.trim();

    if (text) {
        bucket.texts.push({ layer, x, y, height, rotation, text });
    }
    return i;
}

// --- INSERT ---

function readInsert(pairs, i, bucket) {
    let layer = '0', blockName = '', x = 0, y = 0;
    let scaleX = 1, scaleY = 1, rotation = 0;
    // Track whether scale values were explicitly set (default = 1 if absent)
    while (i < pairs.length && pairs[i][0] !== 0) {
        const [code, val] = pairs[i];
        if (code === 8)  layer     = val;
        if (code === 2)  blockName = val;
        if (code === 10) x         = parseFloat(val);
        if (code === 20) y         = parseFloat(val);
        if (code === 41) scaleX    = parseFloat(val);
        if (code === 42) scaleY    = parseFloat(val);
        if (code === 50) rotation  = parseFloat(val);
        i++;
    }

    if (blockName) {
        bucket.inserts.push({ layer, blockName, x, y, scaleX, scaleY, rotation });
    }
    return i;
}
