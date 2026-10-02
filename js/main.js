// Entry point: sets up the canvas, tracks the mouse and redraws every frame.
import { gridToScreen, tileCorners, pointInPolygon } from './iso.js';
import { createRoom, tilesInDrawOrder, tileAt, AREA_NAMES } from './room.js';
import { drawBackdrop } from './scenery.js';
import { drawScene } from './renderer.js';
import { createCamera, attachCamera, followPoint } from './camera.js';
import { ROOF_DEPTH, ROOF_RISE } from './wallRenderer.js';
import { MARGIN, SOIL } from './ground.js';
import { lightPosition } from './decorRenderer.js';
import { drawLighting } from './lighting.js';
import { drawGrain } from './ambience.js';
import { DETAIL } from './detail.js';
import { createAvatar, walkTo, updateAvatar } from './avatar.js';
import { createFurnitureEditor } from './furnitureUI.js';
import { loadLayout } from './furniture.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const timeButton = document.getElementById('time-toggle');

const room = createRoom();
const START = { gx: 9, gy: 1 }; // the avatar starts in the genkan, by the door
loadLayout(room, [START]); // furniture as the player left it last time
const camera = createCamera();
const avatar = createAvatar(room, START.gx, START.gy);
const editor = createFurnitureEditor(room, avatar);
const state = {
  centred: { x: 0, y: 0 }, // where grid (0,0) lands when the building is centred
  origin: { x: 0, y: 0 }, // the same, after scrolling (centred + camera)
  world: { w: 0, h: 0 }, // size of the building and its plot on screen
  mouse: null, // last mouse position in CSS pixels, or null
  hovered: null, // the tile under the mouse, or null
  // Time of day: `dusk` slides towards `duskTarget` (0 = day, 1 = dusk)
  // a little every frame, so switching fades instead of jumping.
  dusk: 0,
  duskTarget: 0,
  plan: null, // the last planned walk, { tiles, shownAt }, drawn as fading dots
  lastTime: 0,
};

function toggleTimeOfDay() {
  state.duskTarget = state.duskTarget ? 0 : 1;
  timeButton.textContent = state.duskTarget ? '☀ Day' : '☾ Dusk';
}
timeButton.addEventListener('click', toggleTimeOfDay);
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') toggleTimeOfDay();
});

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
attachCamera(canvas, camera, cameraLimits, (point) => {
  // Clicking furniture opens its menu. Only a cushion also makes the
  // avatar walk over (to sit on it); the table and lanterns are just
  // selected, so the avatar doesn't wander into the spot you're arranging.
  // While moving furniture, a click puts it down instead.
  if (editor.click(point, state.origin)) return;
  const item = editor.edit.selected;
  if (item && item.type !== 'cushion') return;
  const tile = item ? tileAt(room, item.gx, item.gy) : pickTile(point);
  const tiles = tile && walkTo(avatar, room, tile);
  if (tiles) state.plan = { tiles, shownAt: performance.now() };
  camera.follow = true;
});

const DOT_FADE = 1600; // ms the planned path stays visible

/** The planned path as [{ tile, alpha }], fading out after a click. */
function pathDots(time) {
  if (!state.plan) return [];
  const alpha = 0.9 * (1 - (time - state.plan.shownAt) / DOT_FADE);
  if (alpha <= 0) return [];
  return state.plan.tiles.map((tile) => ({ tile, alpha }));
}

function frame(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dt = Math.min(100, time - state.lastTime); // ms since the last frame
  state.lastTime = time;
  // Move 1/800 of the way per ms: a full fade takes a little under a second.
  const step = dt / 800;
  state.dusk += Math.max(-step, Math.min(step, state.duskTarget - state.dusk));

  updateAvatar(avatar, dt);
  // Follow the middle of the avatar, not its feet.
  const body = gridToScreen(avatar.x + 0.5, avatar.y + 0.5, state.origin, avatar.h + 24);
  followPoint(camera, body, { w, h }, dt, cameraLimits);
  state.origin = { x: state.centred.x + camera.x, y: state.centred.y + camera.y };
  // Picking every frame (not only on mousemove) keeps the highlight right
  // when the view scrolls under a still mouse.
  state.hovered = state.mouse ? pickTile(state.mouse) : null;
  editor.update(state.origin, state.hovered);
  if (!camera.drag?.moved) {
    const overItem = state.mouse && !editor.edit.moving && editor.pick(state.mouse, state.origin);
    canvas.style.cursor = editor.edit.moving ? 'move' : overItem ? 'pointer' : '';
  }

  drawBackdrop(ctx, w, h, state.dusk);
  drawScene(ctx, room, state.origin, {
    hovered: state.hovered,
    time,
    avatar,
    dots: pathDots(time),
    selected: editor.edit.selected,
    ghost: editor.edit.ghost,
    dusk: state.dusk,
  });
  const lights = room.items.filter((item) => item.glow).map((item) => ({
    ...lightPosition(room, item, state.origin),
    glow: item.glow,
  }));
  drawLighting(ctx, w, h, lights, state.dusk, time);
  if (DETAIL >= 3) drawGrain(ctx, w, h);

  const t = state.hovered;
  hud.textContent =
    editor.hudText(time) ??
    (t ? `${AREA_NAMES[t.area]} · tile (${t.gx}, ${t.gy})${t.walkable ? '' : ' · blocked'}` : 'hover a tile');
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
