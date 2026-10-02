// Soft light and shade that make the scene feel lived-in (detail level 2):
// contact shadows under furniture, darker corners where the floor meets a
// wall, and patches of daylight that fall through the shoji.
//
// These all lie on the floor and can stretch over several tiles, but the
// scene is drawn tile by tile, back to front. So each one is drawn once per
// tile it touches, clipped to that tile's diamond, at that tile's depth.
// Then a nearer floor tile or wall still covers it correctly.
import { gridToScreen, tileCorners } from './iso.js';
import { tileAt } from './room.js';
import { itemTiles, itemSize } from './decor.js';
import { polygonPath, fillPolygon } from './draw.js';
import { PALETTE as P } from './palette.js';
import { DETAIL } from './detail.js';
import { hash } from './draw.js';

const DEPTH = 0.05; // after the floor tile, before highlights and objects

// How tall things are, for their cast shadows (pixels above their floor).
const HEIGHT = { table: 16, cushion: 5, paperLantern: 45, vase: 22, stoneLantern: 52 };
// Daylight comes from the back right, through the shoji in the gy = 0 wall,
// so shadows fall towards +gy (down-left on screen), a little towards -gx.
const SHADOW_DIR = [-0.25, 1];
const SHADOW_LENGTH = 0.022; // tiles of shadow per pixel of height

// Where daylight comes through the back walls: shoji panels on the right
// wall (gy = 0) as [u0, u1], and how far the light reaches into the room.
// (The shoji at the genkan end is left out: its beam would cross the
// fusuma and look like a smear on the wall.)
const SUN_WINDOWS = [[0, 1]];
const SUN_REACH = 2.2; // tiles
const SUN_SLANT = 0.9; // the sun is to the right, so the patch slides towards +gx

/** Add the ambience pieces to the renderer's draw list. dusk: 0 = day, 1 = dusk. */
export function addAmbience(list, ctx, room, origin, dusk) {
  for (const item of room.items) {
    if (item.type === 'maple') {
      addTreeShadow(list, ctx, room, origin, item, dusk);
      continue;
    }
    const { w, d } = itemSize(item);
    const m = { paperLantern: 0.28, cushion: 0.16, stoneLantern: 0.22, vase: 0.3 }[item.type] ?? 0.1;
    const shape = [[item.gx + m, item.gy + m], [item.gx + w - m, item.gy + m], [item.gx + w - m, item.gy + d - m], [item.gx + m, item.gy + d - m]];
    for (const t of itemTiles(item)) addClipped(list, ctx, room, origin, t, (floor) => softShadow(ctx, origin, shape, floor));
    if (DETAIL >= 3 && HEIGHT[item.type] && dusk < 1) addCastShadow(list, ctx, room, origin, item, shape, dusk);
  }

  for (const tile of room.tiles) {
    if (tile.area !== 'main' && tile.area !== 'genkan') continue;
    if (tile.gx === 0 || tile.gy === 0) addClipped(list, ctx, room, origin, tile, () => cornerShade(ctx, tile, origin));
  }

  if (dusk < 1) {
    for (const [u0, u1] of SUN_WINDOWS) {
      const patch = [[u0, 0], [u1, 0], [u1 + SUN_SLANT, SUN_REACH], [u0 + SUN_SLANT, SUN_REACH]];
      for (let gy = 0; gy < Math.ceil(SUN_REACH); gy++) {
        for (let gx = Math.floor(u0); gx < Math.ceil(u1 + SUN_SLANT); gx++) {
          const tile = tileAt(room, gx, gy);
          if (!tile || tile.area !== 'main') continue;
          addClipped(list, ctx, room, origin, tile, (floor) => {
            ctx.globalAlpha = 1 - dusk;
            fillPolygon(ctx, patch.map(([x, y]) => gridToScreen(x, y, origin, floor)), P.sunPatch);
            ctx.globalAlpha = 1;
          });
        }
      }
    }
  }
}

/**
 * The shadow an item throws away from the light: its footprint stretched
 * in the light's direction by an amount that grows with its height. It
 * fades out at dusk, when there is no sun.
 */
function addCastShadow(list, ctx, room, origin, item, shape, dusk) {
  const len = HEIGHT[item.type] * SHADOW_LENGTH;
  const moved = shape.map(([x, y]) => [x + SHADOW_DIR[0] * len, y + SHADOW_DIR[1] * len]);
  const outline = convexHull([...shape, ...moved]);
  const floorHere = tileAt(room, item.gx, item.gy).height;
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  for (let gy = Math.floor(Math.min(...ys)); gy <= Math.floor(Math.max(...ys)); gy++) {
    for (let gx = Math.floor(Math.min(...xs)); gx <= Math.floor(Math.max(...xs)); gx++) {
      const tile = tileAt(room, gx, gy);
      // A shadow only falls on floor at the same level (not down a step).
      if (!tile || tile.height !== floorHere) continue;
      addClipped(list, ctx, room, origin, tile, (floor) => {
        ctx.globalAlpha = 0.45 * (1 - dusk);
        softShadow(ctx, origin, outline, floor, 0.5);
        ctx.globalAlpha = 1;
      });
    }
  }
}

/**
 * A tree's shadow is its crown's: a big soft round patch on the ground,
 * pushed away from the light. Only in daylight; at dusk just the trunk's foot.
 */
function addTreeShadow(list, ctx, room, origin, tree, dusk) {
  const cx = tree.gx + 0.5 + SHADOW_DIR[0] * 0.9;
  const cy = tree.gy + 0.5 + SHADOW_DIR[1] * 0.9;
  const crown = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    crown.push([cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9]);
  }
  for (let gy = Math.floor(cy - 1); gy <= Math.floor(cy + 1); gy++) {
    for (let gx = Math.floor(cx - 1); gx <= Math.floor(cx + 1); gx++) {
      const tile = tileAt(room, gx, gy);
      if (!tile || tile.height !== 0) continue;
      addClipped(list, ctx, room, origin, tile, (floor) => {
        ctx.globalAlpha = 0.5 * (1 - dusk) + 0.15;
        softShadow(ctx, origin, crown, floor, 0.45);
        ctx.globalAlpha = 1;
      });
    }
  }
}

/** Smallest convex outline around some [x, y] points (Andrew's monotone chain). */
function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

/** Queue `draw(floorHeight)` to run clipped to tile t's diamond, at t's depth. */
function addClipped(list, ctx, room, origin, t, draw) {
  const tile = tileAt(room, t.gx, t.gy);
  if (!tile) return;
  list.push({
    depth: tile.gx + tile.gy + DEPTH,
    draw: () => {
      ctx.save();
      polygonPath(ctx, tileCorners(tile.gx, tile.gy, origin, tile.height));
      ctx.clip();
      draw(tile.height);
      ctx.restore();
    },
  });
}

/** A soft-edged shadow: the shape filled a few times, each a little larger and fainter. */
function softShadow(ctx, origin, shape, floor, alpha = 0.35) {
  const cx = shape.reduce((s, p) => s + p[0], 0) / shape.length;
  const cy = shape.reduce((s, p) => s + p[1], 0) / shape.length;
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * alpha;
  for (const grow of [1.25, 1.1, 0.95]) {
    const pts = shape.map(([x, y]) => gridToScreen(cx + (x - cx) * grow, cy + (y - cy) * grow, origin, floor));
    fillPolygon(ctx, pts, P.contactShadow);
  }
  ctx.globalAlpha = base;
}

/** Darken the floor along a back wall, fading out into the room. */
function cornerShade(ctx, tile, origin) {
  const [top, right, , left] = tileCorners(tile.gx, tile.gy, origin, tile.height);
  const into = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const edges = [];
  if (tile.gx === 0) edges.push([top, left, right]); // wall along the tile's top-left edge
  if (tile.gy === 0) edges.push([top, right, left]); // wall along its top-right edge
  for (const [a, b, away] of edges) {
    const mid = into(a, b, 0.5);
    const inner = { x: mid.x + (away.x - top.x) * 0.45, y: mid.y + (away.y - top.y) * 0.45 };
    const g = ctx.createLinearGradient(mid.x, mid.y, inner.x, inner.y);
    g.addColorStop(0, P.cornerShade);
    g.addColorStop(1, P.clear);
    const tc = tileCorners(tile.gx, tile.gy, origin, tile.height);
    fillPolygon(ctx, tc, g);
  }
}

// ---------------------------------------------------------------------------
// Detail level 3: light beams with dust, and paper grain over everything.

const BEAM_TOP = 64 + 76; // where the light enters, pixels above the main floor's ground level
const BEAM_BOTTOM = 64;
const MOTES = 10; // dust specks per beam

/**
 * Faint beams of daylight from the shoji down to their sun patches, with
 * dust drifting in them. Drawn over the finished scene, because the light
 * hangs in the air in front of whatever stands in it.
 */
export function drawLightBeams(ctx, room, origin, dusk, time) {
  if (dusk >= 1) return;
  const floor = tileAt(room, 1, 1).height;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [u0, u1] of SUN_WINDOWS) {
    const at = (x, y, h) => gridToScreen(x, y, origin, h);
    const beam = [
      at(u0, 0, floor + BEAM_TOP - 36),
      at(u1, 0, floor + BEAM_TOP - 36),
      at(u1 + SUN_SLANT, SUN_REACH, floor),
      at(u0 + SUN_SLANT, SUN_REACH, floor),
    ];
    const hi = at((u0 + u1) / 2, 0, floor + BEAM_TOP - 36);
    const lo = at((u0 + u1) / 2 + SUN_SLANT, SUN_REACH, floor);
    const g = ctx.createLinearGradient(hi.x, hi.y, lo.x, lo.y);
    g.addColorStop(0, P.sunBeam);
    g.addColorStop(1, P.clear);
    ctx.globalAlpha = 1 - dusk;
    fillPolygon(ctx, beam, g);

    // Dust: each speck drifts slowly on its own loop and twinkles.
    ctx.fillStyle = P.dust;
    for (let i = 0; i < MOTES; i++) {
      const t = time / 9000 + hash(u0, i, 3);
      const along = (hash(u0, i, 1) + t * 0.15) % 1; // 0 at the window, 1 at the floor
      const across = hash(u0, i, 2) + Math.sin(t * 6 + i) * 0.05;
      const x = u0 + (u1 - u0) * across + SUN_SLANT * along;
      const p = at(x, SUN_REACH * along, floor + (BEAM_TOP - 36) * (1 - along));
      ctx.globalAlpha = (1 - dusk) * (0.2 + 0.4 * Math.abs(Math.sin(t * 9 + i)));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

let grain = null;

/** A fine, still paper grain over the whole picture, like a painted background. */
export function drawGrain(ctx, w, h) {
  if (!grain) {
    // Made once: a small tile of repeatable noise, used as a pattern.
    const tile = document.createElement('canvas');
    tile.width = tile.height = 96;
    const t = tile.getContext('2d');
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const v = hash(x, y, 7);
        t.fillStyle = v > 0.5 ? P.grainLight : P.grainDark;
        t.globalAlpha = Math.abs(v - 0.5) * 2;
        t.fillRect(x, y, 1, 1);
      }
    }
    grain = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // grain in real pixels, also on high-DPI screens
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
