// Draws the room: two shoji back walls, a tatami floor and the hover
// highlight. Everything is positioned with gridToScreen from iso.js.
import { TILE_W, TILE_H, gridToScreen, tileCorners } from './iso.js';
import { tilesInDrawOrder } from './room.js';
import { drawWindowView } from './scenery.js';
import { PALETTE as P } from './palette.js';

const SLAB = 12; // thickness of the floor's front edge in pixels

// Heights (pixels above the floor) of the parts of a shoji wall.
const KICK_TOP = 24; // wooden kick panel at the bottom
const RAIL_BOTTOM = 112; // horizontal beam (nageshi)
const RAIL_TOP = 122;
const WINDOW_HALF_WIDTH = 1.6; // plaster panel around the round window, in tiles

export function drawRoom(ctx, room, origin, hovered) {
  // Back walls first, then the floor in front of them (painter's algorithm).
  drawWall(ctx, room, origin, 'left', { window: { u: 5, size: 36 } });
  drawWall(ctx, room, origin, 'right', {});
  drawCornerPost(ctx, room, origin);
  drawFloor(ctx, room, origin);
  drawSlab(ctx, room, origin);
  if (hovered) drawHighlight(ctx, hovered.gx, hovered.gy, origin);
}

// ---------------------------------------------------------------------------
// Walls
//
// A wall stands on one back edge of the floor. We describe points on it with
// two numbers: `u` = how far along the edge (in tiles) and `h` = height above
// the floor (in pixels). Isometric projection keeps vertical lines vertical,
// so lifting a point by h is just "subtract h from screen y".
//   'left'  wall runs along gy at gx = 0  (the upper-left edge on screen)
//   'right' wall runs along gx at gy = 0  (the upper-right edge on screen)

function wallPoint(side, u, h, origin) {
  const base = side === 'left' ? gridToScreen(0, u, origin) : gridToScreen(u, 0, origin);
  return { x: base.x, y: base.y - h };
}

/** Fill the wall-space rectangle [u0,u1] x [h0,h1] (it shows as a parallelogram). */
function wallQuad(ctx, side, origin, u0, u1, h0, h1, color) {
  const pts = [
    wallPoint(side, u0, h0, origin),
    wallPoint(side, u1, h0, origin),
    wallPoint(side, u1, h1, origin),
    wallPoint(side, u0, h1, origin),
  ];
  fillPolygon(ctx, pts, color);
}

function wallLine(ctx, side, origin, u0, h0, u1, h1) {
  const a = wallPoint(side, u0, h0, origin);
  const b = wallPoint(side, u1, h1, origin);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
}

function drawWall(ctx, room, origin, side, { window }) {
  const len = side === 'left' ? room.depth : room.width;
  const H = room.wallHeight;
  const paper = side === 'left' ? P.shojiShade : P.shoji;

  // Paper, kick panel, beam and plaster above the beam.
  wallQuad(ctx, side, origin, 0, len, 0, H, paper);
  wallQuad(ctx, side, origin, 0, len, 0, KICK_TOP, P.wood);
  wallQuad(ctx, side, origin, 0, len, RAIL_TOP, H, P.plaster);

  // Kumiko lattice: thin wooden strips over the paper.
  ctx.strokeStyle = P.wood;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = 0.5; u < len; u += 0.5) wallLine(ctx, side, origin, u, KICK_TOP, u, RAIL_BOTTOM);
  for (let h = KICK_TOP + 22; h < RAIL_BOTTOM; h += 22) wallLine(ctx, side, origin, 0, h, len, h);
  ctx.stroke();

  if (window) drawRoundWindow(ctx, side, origin, window.u, window.size);

  // Beam, posts every two tiles, and a cap along the top.
  wallQuad(ctx, side, origin, 0, len, RAIL_BOTTOM, RAIL_TOP, P.woodDark);
  for (let u = 2; u <= len; u += 2) {
    if (window && Math.abs(u - window.u) < WINDOW_HALF_WIDTH) continue; // keep posts off the window
    wallQuad(ctx, side, origin, u - 0.08, u, 0, H, P.woodDark);
  }
  wallQuad(ctx, side, origin, 0, len, H - 6, H, P.woodDark);
}

/**
 * A round "marumado" window set in a plaster panel.
 *
 * A circle on a wall that faces us at an angle shows up as a slanted ellipse.
 * Rather than work that ellipse out by hand, we temporarily tell the canvas
 * how wall space maps to screen space with ctx.transform(a, b, c, d, e, f):
 *   screenX = a*u + c*v + e
 *   screenY = b*u + d*v + f
 * Moving 1 tile along the wall moves (±TILE_W/2, TILE_H/2) on screen, and v
 * is plain vertical pixels. Then a normal ellipse() comes out slanted.
 */
function drawRoundWindow(ctx, side, origin, u, size) {
  wallQuad(ctx, side, origin, u - WINDOW_HALF_WIDTH, u + WINDOW_HALF_WIDTH, KICK_TOP, RAIL_BOTTOM, P.plaster);

  const centerH = (KICK_TOP + RAIL_BOTTOM) / 2;
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

function drawCornerPost(ctx, room, origin) {
  const bottom = gridToScreen(0, 0, origin);
  ctx.fillStyle = P.woodDark;
  ctx.fillRect(bottom.x - 3, bottom.y - room.wallHeight, 6, room.wallHeight);
}

// ---------------------------------------------------------------------------
// Floor

function drawFloor(ctx, room, origin) {
  for (const { gx, gy } of tilesInDrawOrder(room)) {
    const corners = tileCorners(gx, gy, origin);
    fillPolygon(ctx, corners, (gx + gy) % 2 ? P.tatamiAlt : P.tatami);

    // Woven-straw texture: a few lines parallel to one pair of edges.
    // Alternating direction tile to tile mimics how tatami are laid.
    const [top, right, bottom, left] = corners;
    const [a0, a1, b0, b1] = (gx + gy) % 2 ? [top, left, right, bottom] : [top, right, left, bottom];
    ctx.strokeStyle = P.tatamiWeave;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.2; t < 1; t += 0.2) {
      const p = lerp(a0, b0, t);
      const q = lerp(a1, b1, t);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();

    strokePolygon(ctx, corners, P.tatamiEdge, 1);
  }
}

/** The visible front faces of the floor, giving it a little thickness. */
function drawSlab(ctx, room, origin) {
  const leftEnd = gridToScreen(0, room.depth, origin);
  const front = gridToScreen(room.width, room.depth, origin);
  const rightEnd = gridToScreen(room.width, 0, origin);
  const down = (p) => ({ x: p.x, y: p.y + SLAB });

  fillPolygon(ctx, [leftEnd, front, down(front), down(leftEnd)], P.floorSlab);
  fillPolygon(ctx, [front, rightEnd, down(rightEnd), down(front)], P.woodDark);
}

function drawHighlight(ctx, gx, gy, origin) {
  const corners = tileCorners(gx, gy, origin);
  fillPolygon(ctx, corners, P.hoverFill);
  strokePolygon(ctx, corners, P.hoverStroke, 2);
}

// ---------------------------------------------------------------------------
// Small helpers

function polygonPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function fillPolygon(ctx, pts, color) {
  polygonPath(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
}

function strokePolygon(ctx, pts, color, width) {
  polygonPath(ctx, pts);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
