// Entry point: sets up the canvas, tracks the mouse and redraws every frame.
import { gridToScreen, tileCorners, pointInPolygon } from './iso.js';
import { createRoom, tilesInDrawOrder, AREA_NAMES } from './room.js';
import { drawBackdrop } from './scenery.js';
import { drawScene } from './renderer.js';
import { createCamera, attachCamera } from './camera.js';
import { ROOF_DEPTH, ROOF_RISE } from './wallRenderer.js';
import { MARGIN, SOIL } from './ground.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

const room = createRoom();
const camera = createCamera();
const state = {
  centred: { x: 0, y: 0 }, // where grid (0,0) lands when the building is centred
  origin: { x: 0, y: 0 }, // the same, after scrolling (centred + camera)
  world: { w: 0, h: 0 }, // size of the building and its plot on screen
  mouse: null, // last mouse position in CSS pixels, or null
  hovered: null, // the tile under the mouse, or null
};

// Size the canvas to the window. On high-DPI screens we render more real
// pixels than CSS pixels so lines stay crisp, then scale the context so the
// rest of the code can keep thinking in CSS pixels.
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Centre the building: its top is the roof ridge behind grid (0,0) and
  // its bottom is the front corner of the map.
  const zero = { x: 0, y: 0 };
  const at = (gx, gy, hgt = 0) => gridToScreen(gx, gy, zero, hgt);
  const top = at(-ROOF_DEPTH, -ROOF_DEPTH, room.wallTop + ROOF_RISE).y;
  const bottom = at(room.width, room.depth).y;
  const left = at(0, room.depth).x;
  const right = at(room.width, 0).x;
  state.centred = {
    x: (w - (right - left)) / 2 - left,
    y: (h - (bottom - top)) / 2 - top,
  };

  // The whole world, including the grass plot around the map, so that
  // scrolling can reach all of it.
  const plotLeft = at(-MARGIN, room.depth + MARGIN).x;
  const plotRight = at(room.width + MARGIN, -MARGIN).x;
  const plotBottom = at(room.width + MARGIN, room.depth + MARGIN).y + SOIL;
  state.world = { w: plotRight - plotLeft, h: plotBottom - top };
}

/**
 * How far the camera may scroll from the centre. If the world is bigger
 * than the window you can scroll to see all of it; either way you can
 * scroll a little, but never so far that the house leaves the screen.
 */
function cameraLimits() {
  return {
    x: Math.max(0, (state.world.w - window.innerWidth) / 2) + window.innerWidth * 0.2,
    y: Math.max(0, (state.world.h - window.innerHeight) / 2) + window.innerHeight * 0.2,
  };
}

/**
 * Which tile is under screen point p? Floors sit at different heights, so
 * we can't just invert the projection. Instead we test each tile's shape,
 * nearest tile first, and take the first hit: a near, high floor covers
 * whatever is behind it, exactly like when drawing.
 */
function pickTile(p) {
  const tiles = tilesInDrawOrder(room).reverse();
  return tiles.find((t) => pointInPolygon(p, tileShape(t))) || null;
}

/**
 * The outline of a tile as seen on screen: its lifted diamond plus the side
 * faces below it, so pointing at the side of a raised floor counts too.
 */
function tileShape(t) {
  const [top, right, bottom, left] = tileCorners(t.gx, t.gy, state.origin, t.height);
  const down = (q) => ({ x: q.x, y: q.y + t.height });
  return [top, right, down(right), down(bottom), down(left), left];
}

canvas.addEventListener('pointermove', (e) => {
  state.mouse = { x: e.offsetX, y: e.offsetY };
});
canvas.addEventListener('pointerleave', () => {
  state.mouse = null;
});
attachCamera(canvas, camera, cameraLimits);

function frame(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.origin = { x: state.centred.x + camera.x, y: state.centred.y + camera.y };
  // Picking every frame (not only on mousemove) keeps the highlight right
  // when the view scrolls under a still mouse.
  state.hovered = state.mouse ? pickTile(state.mouse) : null;

  drawBackdrop(ctx, w, h);
  drawScene(ctx, room, state.origin, { hovered: state.hovered, time });

  const t = state.hovered;
  hud.textContent = t ? `${AREA_NAMES[t.area]} · tile (${t.gx}, ${t.gy})${t.walkable ? '' : ' · blocked'}` : 'hover a tile';
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
