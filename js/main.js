// Entry point: sets up the canvas, tracks the mouse and redraws every frame.
import { TILE_H, screenToGrid } from './iso.js';
import { createRoom, isInside } from './room.js';
import { drawBackdrop } from './scenery.js';
import { drawRoom } from './roomRenderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

const room = createRoom(10, 10);
const state = {
  origin: { x: 0, y: 0 }, // where grid (0,0) lands on screen
  hovered: null, // { gx, gy } or null
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

  // Centre the room. Its top is the wall tops above grid (0,0); its bottom
  // is the front corner at grid (width, depth), which sits
  // (width + depth) * TILE_H / 2 pixels below (0,0).
  const roomTop = -room.wallHeight;
  const roomBottom = ((room.width + room.depth) * TILE_H) / 2;
  state.origin = {
    x: w / 2,
    y: (h - (roomBottom - roomTop)) / 2 - roomTop,
  };
}

canvas.addEventListener('mousemove', (e) => {
  // Turn the mouse position into a grid position and floor it to get the
  // tile index, e.g. (3.7, 1.2) -> tile (3, 1).
  const g = screenToGrid(e.offsetX, e.offsetY, state.origin);
  const gx = Math.floor(g.x);
  const gy = Math.floor(g.y);
  state.hovered = isInside(room, gx, gy) ? { gx, gy } : null;
});
canvas.addEventListener('mouseleave', () => {
  state.hovered = null;
});

function frame() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  drawBackdrop(ctx, w, h);
  drawRoom(ctx, room, state.origin, state.hovered);
  hud.textContent = state.hovered
    ? `tile (${state.hovered.gx}, ${state.hovered.gy})`
    : 'hover a tile';
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
