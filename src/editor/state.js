/**
 * state.js
 * Shared state object and constants.
 * Imports nothing — every other module imports from here.
 */

export const COLORS = [
    '#4fa8e8', '#e8734f', '#4fe87a', '#e84f9a',
    '#a84fe8', '#e8d94f', '#4fe8d9', '#e84f4f',
    '#8ae84f', '#4f6ae8', '#e8a84f', '#4fe8c0',
];

export const SNAP_DISTANCE = 0.025;

export const state = {
    hotspots:      [],
    drawing:       false,
    currentPoints: [],
    selectedIds:   new Set(),
    mousePos:      { x: 0, y: 0 },
    needsRedraw:   false,
    // Vertex dragging
    dragging:      false,
    dragHotspotId: null,
    dragPointIdx:  null,
    // Seed fill
    seedMode:      false,
    seeds:         [],
    // Rectangle tool
    rectMode:      false,
    rectStart:     null,
    rectCurrent:   null,
    // Polygon tool (explicit mode — canvas clicks only draw when active)
    polyMode:      false,
};