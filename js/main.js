// Entry point: sets up the canvas, tracks the mouse and redraws every frame.
import { gridToScreen, tileCorners, pointInPolygon } from './iso.js';
import { createRoom, tilesInDrawOrder, AREA_NAMES } from './room.js';
import { drawBackdrop } from './scenery.js';
import { drawScene } from './renderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

const room = createRoom();
const state = {
  origin: { x: 0, y: 0 }, // where grid (0,0) lands on screen
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
  const top = gridToScreen(-1.3, -1.3, zero, room.wallTop + 46).y;
  const bottom = gridToScreen(room.width, room.depth, zero).y;
  const left = gridToScreen(0, room.depth, zero).x;
  const right = gridToScreen(room.width, 0, zero).x;
  // (The grass margin around the map may run off screen; that's fine.)
  state.origin = {
    x: (w - (right - left)) / 2 - left,
    y: (h - (bottom - top)) / 2 - top,
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

canvas.addEventListener('mousemove', (e) => {
  state.mouse = { x: e.offsetX, y: e.offsetY };
});
canvas.addEventListener('mouseleave', () => {
  state.mouse = null;
});

function frame(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
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
