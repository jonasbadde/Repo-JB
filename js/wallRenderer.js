// Draws the building's walls and roof.
//
// Back walls (along the top two edges of the map) are drawn full height with
// shoji, fusuma, the round window and the tokonoma. All other walls stand
// between the camera and the rooms, so they are drawn cut down low: you see
// where they are without them hiding the floor.
import { TILE_W, TILE_H, gridToScreen } from './iso.js';
import { tileAt } from './room.js';
import { WALL_PANELS } from './decor.js';
import { drawWindowView } from './scenery.js';
import { fillPolygon, line } from './draw.js';
import { PALETTE as P } from './palette.js';

const KICK = 24; // wooden kick panel at the bottom of a wall, above its floor
const RAIL_DROP = 38; // the horizontal beam (nageshi) sits this far below the wall top
const RAIL_THICK = 10;
const WINDOW_HALF_WIDTH = 1.5; // plaster panel around the round window, in tiles
const LOW_WALL = 22; // height of the cut-down front walls
const ROOF_DEPTH = 1.3; // how far the roof reaches back, in tiles
const ROOF_RISE = 46; // how much it climbs over that distance, in pixels
const EAVE_END = 8; // the left roof runs on over the veranda to this gy

// ---------------------------------------------------------------------------
// Wall space
//
// A back wall is described with two numbers: `u` = how far along it (in
// tiles) and `h` = height above the ground (in pixels).
//   'left'  wall runs along gy at gx = 0  (the upper-left edge on screen)
//   'right' wall runs along gx at gy = 0  (the upper-right edge on screen)

function wallPoint(side, u, h, origin) {
  return side === 'left' ? gridToScreen(0, u, origin, h) : gridToScreen(u, 0, origin, h);
}

/** Fill the wall-space rectangle [u0,u1] x [h0,h1] (it shows as a parallelogram). */
function wallQuad(ctx, side, origin, u0, u1, h0, h1, color) {
  fillPolygon(
    ctx,
    [
      wallPoint(side, u0, h0, origin),
      wallPoint(side, u1, h0, origin),
      wallPoint(side, u1, h1, origin),
      wallPoint(side, u0, h1, origin),
    ],
    color,
  );
}

function wallLine(ctx, side, origin, u0, h0, u1, h1) {
  line(ctx, wallPoint(side, u0, h0, origin), wallPoint(side, u1, h1, origin));
}

/**
 * Split the back walls into runs that share a floor height. The wall over
 * the genkan starts lower than the one over the raised main room, but both
 * reach the same top, like one continuous outer wall.
 */
function backWallRuns(room) {
  const runs = [];
  for (const w of room.walls) {
    if (!w.back) continue;
    const side = w.axis === 'x' ? 'left' : 'right';
    const u = side === 'left' ? w.gy : w.gx;
    const tile = side === 'left' ? tileAt(room, 0, u) : tileAt(room, u, 0);
    const last = runs[runs.length - 1];
    if (last && last.side === side && last.u1 === u && last.base === tile.height) last.u1 = u + 1;
    else runs.push({ side, u0: u, u1: u + 1, base: tile.height });
  }
  return runs;
}

// ---------------------------------------------------------------------------
// Back walls and roof

export function drawBackWalls(ctx, room, origin) {
  const runs = backWallRuns(room);
  const rightEnd = Math.max(...runs.filter((r) => r.side === 'right').map((r) => r.u1));
  drawRoof(ctx, room, origin, rightEnd);
  for (const run of runs) drawWallRun(ctx, room, origin, run);

  // The corner post where the two back walls meet.
  const foot = gridToScreen(0, 0, origin, tileAt(room, 0, 0).height);
  const head = gridToScreen(0, 0, origin, room.wallTop);
  ctx.fillStyle = P.woodDark;
  ctx.fillRect(foot.x - 3, head.y, 6, foot.y - head.y);
}

function drawWallRun(ctx, room, origin, { side, u0, u1, base }) {
  const top = room.wallTop;
  const railLow = top - RAIL_DROP;
  const railHigh = railLow + RAIL_THICK;

  // Each panel covers its stretch of the wall between the kick and the rail.
  for (const panel of WALL_PANELS[side]) {
    const a = Math.max(panel.u0, u0);
    const b = Math.min(panel.u1, u1);
    if (a >= b) continue;
    PANELS[panel.kind](ctx, side, origin, a, b, base + KICK, railLow);
  }

  wallQuad(ctx, side, origin, u0, u1, base, base + KICK, P.wood);
  wallQuad(ctx, side, origin, u0, u1, railHigh, top, P.plaster);
  wallQuad(ctx, side, origin, u0, u1, railLow, railHigh, P.woodDark);

  // Posts every two tiles, except where they would cut through the window
  // or the tokonoma (those have their own frames).
  const panels = WALL_PANELS[side];
  for (let u = Math.ceil(u0 / 2) * 2; u <= u1; u += 2) {
    const inside = panels.find((p) => u > p.u0 && u < p.u1);
    if (inside && (inside.kind === 'window' || inside.kind === 'tokonoma')) continue;
    wallQuad(ctx, side, origin, u - 0.08, u, base, top, P.woodDark);
  }
  wallQuad(ctx, side, origin, u0, u1, top - 6, top, P.woodDark);
}

// One function per kind of wall panel. Each fills [u0,u1] x [h0,h1].
const PANELS = {
  shoji(ctx, side, origin, u0, u1, h0, h1) {
    wallQuad(ctx, side, origin, u0, u1, h0, h1, side === 'left' ? P.shojiShade : P.shoji);
    // Kumiko lattice: thin wooden strips over the paper.
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let u = u0 + 0.5; u < u1; u += 0.5) wallLine(ctx, side, origin, u, h0, u, h1);
    for (let h = h0 + 22; h < h1; h += 22) wallLine(ctx, side, origin, u0, h, u1, h);
    ctx.stroke();
  },

  fusuma(ctx, side, origin, u0, u1, h0, h1) {
    wallQuad(ctx, side, origin, u0, u1, h0, h1, P.fusuma);

    // A painted range of misty mountains running across all the doors.
    // Using the wall's u as the x position keeps the painting continuous.
    const peak = (u) => h0 + (h1 - h0) * (0.55 + 0.2 * Math.sin(u * 2.1) + 0.1 * Math.sin(u * 5.3));
    const mountain = [wallPoint(side, u0, h0 + 8, origin)];
    for (let u = u0; u <= u1 + 0.001; u += 0.1) mountain.push(wallPoint(side, u, peak(u), origin));
    mountain.push(wallPoint(side, u1, h0 + 8, origin));
    fillPolygon(ctx, mountain, P.fusumaInk);
    wallQuad(ctx, side, origin, u0, u1, h0 + 8, h0 + 26, P.fusumaMist);

    // Door frames and the little round finger pulls (hikite).
    ctx.strokeStyle = P.woodDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let u = u0; u <= u1; u += 1) wallLine(ctx, side, origin, u, h0, u, h1);
    ctx.stroke();
    ctx.fillStyle = P.woodDark;
    for (let u = u0 + 0.85; u < u1; u += 1) {
      const p = wallPoint(side, u, (h0 + h1) / 2, origin);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  window(ctx, side, origin, u0, u1, h0, h1) {
    PANELS.shoji(ctx, side, origin, u0, u1, h0, h1);
    const u = (u0 + u1) / 2;
    wallQuad(ctx, side, origin, u - WINDOW_HALF_WIDTH, u + WINDOW_HALF_WIDTH, h0, h1, P.plaster);
    drawRoundWindow(ctx, side, origin, u, (h0 + h1) / 2, 34);
  },

  tokonoma(ctx, side, origin, u0, u1, h0, h1) {
    // The alcove is set back, so its plaster is a little darker.
    wallQuad(ctx, side, origin, u0, u1, h0, h1, P.plasterShade);

    // Hanging scroll: a mounted strip of paper with a few brush strokes.
    const mid = (u0 + u1) / 2;
    const sTop = h1 - 6;
    const sBottom = h0 + 22;
    wallQuad(ctx, side, origin, mid - 0.32, mid + 0.32, sBottom, sTop, P.scrollMount);
    wallQuad(ctx, side, origin, mid - 0.24, mid + 0.24, sBottom + 10, sTop - 14, P.scrollPaper);
    ctx.strokeStyle = P.scrollInk;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const h = sTop - 24 - i * 16;
      wallLine(ctx, side, origin, mid - 0.06, h, mid + 0.08, h - 9);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Rod at the bottom and the hanging cord at the top.
    wallQuad(ctx, side, origin, mid - 0.38, mid + 0.38, sBottom - 4, sBottom, P.woodDark);

    // The tokobashira: a natural, slightly lighter post framing the alcove.
    wallQuad(ctx, side, origin, u1 - 0.1, u1, h0 - KICK, h1, P.woodLight);
  },

  boards(ctx, side, origin, u0, u1, h0, h1) {
    // Plain vertical cedar boards for the entrance hall.
    wallQuad(ctx, side, origin, u0, u1, h0, h1, P.woodLight);
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let u = u0 + 0.25; u < u1; u += 0.25) wallLine(ctx, side, origin, u, h0, u, h1);
    ctx.stroke();
  },
};

/**
 * A round "marumado" window.
 *
 * A circle on a wall that faces us at an angle shows up as a slanted ellipse.
 * Rather than work that ellipse out by hand, we temporarily tell the canvas
 * how wall space maps to screen space with ctx.transform(a, b, c, d, e, f):
 *   screenX = a*u + c*v + e
 *   screenY = b*u + d*v + f
 * Moving 1 tile along the wall moves (±TILE_W/2, TILE_H/2) on screen, and v
 * is plain vertical pixels. Then a normal ellipse() comes out slanted.
 */
function drawRoundWindow(ctx, side, origin, u, centerH, size) {
  const centre = wallPoint(side, u, centerH, origin);
  const dirX = side === 'left' ? -TILE_W / 2 : TILE_W / 2;

  const windowPath = () => {
    const tilesPerPx = 1 / 36; // ~36px of screen per tile along a wall edge
    ctx.save();
    ctx.transform(dirX, TILE_H / 2, 0, 1, centre.x, centre.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * tilesPerPx, size, 0, 0, Math.PI * 2);
    ctx.restore();
    // The path was recorded in screen space, so it survives restore().
  };

  // Clip to the window, paint the view, then frame it with a wooden ring.
  // (The view draws its own shapes, so we rebuild the path for the frame.)
  windowPath();
  ctx.save();
  ctx.clip();
  drawWindowView(ctx, centre.x, centre.y, size * 1.2);
  ctx.restore();

  windowPath();
  ctx.strokeStyle = P.woodDark;
  ctx.lineWidth = 5;
  ctx.stroke();
}

/**
 * A hipped roof of clay tiles rising back and away from the wall tops.
 * Both halves start at the wall tops and slope back to a ridge; they meet
 * along the diagonal hip line behind the corner post. We only ever see the
 * back half of the roof: the front half is "cut away" like the front walls.
 */
function drawRoof(ctx, room, origin, rightEnd) {
  const top = room.wallTop;
  const R = (gx, gy, h) => gridToScreen(gx, gy, origin, h);
  const d = ROOF_DEPTH;
  const ridge = top + ROOF_RISE;
  const halves = [
    // Left half: inner edge along gx = 0, sloping back towards -gx.
    { inner: [R(0, 0, top), R(0, EAVE_END, top)], outer: [R(-d, -d, ridge), R(-d, EAVE_END, ridge)], shade: P.roofTileDark },
    // Right half: inner edge along gy = 0, sloping back towards -gy.
    { inner: [R(0, 0, top), R(rightEnd, 0, top)], outer: [R(-d, -d, ridge), R(rightEnd, -d, ridge)], shade: P.roofTile },
  ];

  for (const { inner, outer, shade } of halves) {
    const [i0, i1] = inner;
    const [o0, o1] = outer;
    fillPolygon(ctx, [i0, i1, o1, o0], shade);

    // Rows of tiles: lines running along the roof at even steps up the slope.
    ctx.strokeStyle = P.roofRidge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.2; t < 1; t += 0.2) {
      line(ctx, { x: i0.x + (o0.x - i0.x) * t, y: i0.y + (o0.y - i0.y) * t }, { x: i1.x + (o1.x - i1.x) * t, y: i1.y + (o1.y - i1.y) * t });
    }
    ctx.stroke();

    // Ridge cap along the top, and a dark fascia board along the eave.
    ctx.lineWidth = 5;
    ctx.beginPath();
    line(ctx, o0, o1);
    ctx.stroke();
    ctx.strokeStyle = P.woodDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    line(ctx, i0, i1);
    ctx.stroke();

    // Gable end: a small triangle that gives the roof some thickness.
    fillPolygon(ctx, [i1, o1, { x: o1.x, y: o1.y + ROOF_RISE }], P.roofRidge);
  }
}

/**
 * The tall post holding up the end of the roof where it reaches over the
 * veranda. It stands on the engawa's far corner.
 */
export function drawEavePost(ctx, room, origin) {
  const foot = gridToScreen(0, EAVE_END, origin, tileAt(room, 0, EAVE_END - 1).height);
  const head = gridToScreen(0, EAVE_END, origin, room.wallTop);
  ctx.fillStyle = P.wood;
  ctx.fillRect(foot.x - 3, head.y, 6, foot.y - head.y);
}

// ---------------------------------------------------------------------------
// Cut-down front walls

/**
 * One low wall on the edge between tile (gx, gy) and its +gx or +gy
 * neighbour. It stands on the higher of the two floors.
 */
export function drawLowWall(ctx, room, wall, origin) {
  const { gx, gy, axis } = wall;
  const a = tileAt(room, gx, gy);
  const n = axis === 'x' ? tileAt(room, gx + 1, gy) : tileAt(room, gx, gy + 1);
  const base = Math.max(a.height, n ? n.height : 0);
  const [p0, p1] = axis === 'x' ? [[gx + 1, gy], [gx + 1, gy + 1]] : [[gx, gy + 1], [gx + 1, gy + 1]];
  const pt = (p, h) => gridToScreen(p[0], p[1], origin, h);

  const entrance = a.area === 'genkan' || (n && n.area === 'genkan');
  const lit = axis === 'x'; // walls facing +gx catch the light
  fillPolygon(ctx, [pt(p0, base), pt(p1, base), pt(p1, base + LOW_WALL), pt(p0, base + LOW_WALL)], entrance ? P.woodLight : lit ? P.shoji : P.shojiShade);
  fillPolygon(ctx, [pt(p0, base), pt(p1, base), pt(p1, base + 8), pt(p0, base + 8)], P.wood);

  // The cut top of the wall and a post at each end.
  ctx.strokeStyle = P.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  line(ctx, pt(p0, base + LOW_WALL), pt(p1, base + LOW_WALL));
  ctx.stroke();
  ctx.fillStyle = P.woodDark;
  for (const p of [p0, p1]) {
    const foot = pt(p, base);
    ctx.fillRect(foot.x - 2, foot.y - LOW_WALL - 2, 4, LOW_WALL + 2);
  }
}
