// Draws one floor tile: its top surface and, where the floor is raised above
// the tile in front of it, the visible side faces underneath.
import { TILE_W, gridToScreen, tileCorners } from './iso.js';
import { tileAt } from './room.js';
import { fillPolygon, strokePolygon, lerp, line, hash, woodGrain } from './draw.js';
import { PALETTE as P } from './palette.js';
import { DETAIL } from './detail.js';

export function drawTile(ctx, room, tile, origin, time) {
  drawSides(ctx, room, tile, origin);
  const corners = tileCorners(tile.gx, tile.gy, origin, tile.height);
  TOPS[tile.floor](ctx, tile, corners, origin, room, time);
}

// ---------------------------------------------------------------------------
// Side faces
//
// We can only ever see the two *front* sides of a tile (the ones facing +gx
// and +gy), because the back sides face away from the camera. A side face is
// drawn only when the neighbour in front is lower, and only down to that
// neighbour's height, so faces never poke through the floor in front.

function drawSides(ctx, room, tile, origin) {
  const { gx, gy, height } = tile;
  if (height === 0) return;
  const [, right, bottom, left] = tileCorners(gx, gy, origin, height);

  // Right-hand face (towards +gx) is lit; the left-hand one is in shade.
  const sides = [
    { n: tileAt(room, gx + 1, gy), a: right, b: bottom, lit: true, along: [gx + 1, gy, gx + 1, gy + 1] },
    { n: tileAt(room, gx, gy + 1), a: left, b: bottom, lit: false, along: [gx, gy + 1, gx + 1, gy + 1] },
  ];
  for (const { n, a, b, lit, along } of sides) {
    const nh = n ? n.height : 0;
    if (nh >= height) continue;
    const drop = height - nh;
    const down = (p) => ({ x: p.x, y: p.y + drop });
    const face = [a, b, down(b), down(a)];

    if (n && nh > 0) {
      // A step between two floors inside the house: a polished wooden riser.
      fillPolygon(ctx, face, lit ? P.wood : P.woodDark);
    } else if (tile.area === 'engawa') {
      // The veranda stands on posts with a shadowy gap underneath.
      fillPolygon(ctx, face, P.underFloor);
      fillPolygon(ctx, [a, b, { x: b.x, y: b.y + 6 }, { x: a.x, y: a.y + 6 }], P.wood);
      drawPost(ctx, along, origin, nh, height, tile.gx + tile.gy);
    } else {
      // Stone footing under the house, with a wooden sill beam on top.
      fillPolygon(ctx, face, lit ? P.foundation : P.foundationDark);
      ctx.strokeStyle = P.stoneJoint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const mid = lerp(a, b, 0.5 + (hash(gx, gy) - 0.5) * 0.4);
      line(ctx, { x: mid.x, y: mid.y + 6 }, { x: mid.x, y: mid.y + drop });
      ctx.stroke();
      fillPolygon(ctx, [a, b, { x: b.x, y: b.y + 6 }, { x: a.x, y: a.y + 6 }], P.woodDark);
    }
  }
}

/** A square wooden post at the start of an engawa edge, on every other tile. */
function drawPost(ctx, along, origin, base, top, parity) {
  if (parity % 2) return;
  const [x0, y0] = along;
  const p = gridToScreen(x0, y0, origin, top);
  const b = gridToScreen(x0, y0, origin, base);
  ctx.fillStyle = P.wood;
  ctx.fillRect(p.x - 3, p.y, 6, b.y - p.y);
}

// ---------------------------------------------------------------------------
// Top surfaces, one function per floor type.

const TOPS = {
  tatami(ctx, tile, corners, origin, room) {
    if (DETAIL >= 1) return drawDetailedTatami(ctx, tile, corners, room);
    const { gx, gy } = tile;
    fillPolygon(ctx, corners, (gx + gy) % 2 ? P.tatamiAlt : P.tatami);

    // Woven-straw texture: a few lines parallel to one pair of edges.
    // Alternating direction tile to tile mimics how tatami are laid.
    const [top, right, bottom, left] = corners;
    const [a0, a1, b0, b1] = (gx + gy) % 2 ? [top, left, right, bottom] : [top, right, left, bottom];
    ctx.strokeStyle = P.tatamiWeave;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.2; t < 1; t += 0.2) line(ctx, lerp(a0, b0, t), lerp(a1, b1, t));
    ctx.stroke();

    strokePolygon(ctx, corners, P.tatamiEdge, 1);
  },

  tokonoma(ctx, tile, corners) {
    // The alcove floor is one polished board, a step above the tatami.
    fillPolygon(ctx, corners, P.woodLight);
    const [top, right, bottom, left] = corners;
    if (DETAIL >= 3) {
      woodGrain(ctx, top, left, right, bottom, 7, tile.gx + 50, P.woodGrain);
      // A soft reflection on the polished wood.
      fillPolygon(ctx, [lerp(top, right, 0.3), lerp(top, right, 0.5), lerp(left, bottom, 0.4), lerp(left, bottom, 0.2)], P.lacquerShine);
      return;
    }
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.3; t < 1; t += 0.35) line(ctx, lerp(top, left, t), lerp(right, bottom, t));
    ctx.stroke();
  },

  stone(ctx, tile, corners) {
    if (DETAIL >= 3) return drawDetailedStone(ctx, tile, corners);
    const { gx, gy } = tile;
    // Four square pavers per tile, alternating shades like a cut-stone floor.
    const [top, right, bottom, left] = corners;
    const centre = lerp(top, bottom, 0.5);
    const mids = [lerp(top, right, 0.5), lerp(right, bottom, 0.5), lerp(bottom, left, 0.5), lerp(left, top, 0.5)];
    const quads = [
      [top, mids[0], centre, mids[3]],
      [mids[0], right, mids[1], centre],
      [centre, mids[1], bottom, mids[2]],
      [mids[3], centre, mids[2], left],
    ];
    quads.forEach((q, i) => {
      fillPolygon(ctx, q, hash(gx, gy, i) > 0.5 ? P.stone : P.stoneAlt);
      strokePolygon(ctx, q, P.stoneJoint, 1);
    });
  },

  planks(ctx, tile, corners) {
    if (DETAIL >= 3) return drawDetailedPlanks(ctx, tile, corners);
    const { gx, gy } = tile;
    // Boards run along the length of the veranda (the gx direction).
    fillPolygon(ctx, corners, (gx % 2) ? P.planksAlt : P.planks);
    const [top, right, bottom, left] = corners;
    ctx.strokeStyle = P.plankGap;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.25; t < 1; t += 0.25) line(ctx, lerp(top, left, t), lerp(right, bottom, t));
    // A butt joint where two boards meet, at a different spot on each row.
    const j = hash(gx, gy);
    line(ctx, lerp(top, right, j), lerp(left, bottom, j));
    ctx.stroke();
  },

  moss(ctx, tile, corners, origin, room) {
    drawMoss(ctx, tile, corners, room);
  },

  steppingStone(ctx, tile, corners, origin, room) {
    drawMoss(ctx, tile, corners, room);
    // A flat, slightly irregular stone lying in the moss. A circle on the
    // ground looks like an ellipse twice as wide as it is tall.
    const [top, , bottom] = corners;
    const c = lerp(top, bottom, 0.5);
    const r = TILE_W * (0.26 + hash(tile.gx, tile.gy, 3) * 0.06);
    ctx.fillStyle = P.steppingStone;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 2, r, r / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.steppingStoneTop;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 1, r, r / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  water(ctx, tile, corners, origin, room, time) {
    // Deeper water further from the edge: a gradient centred on the pond.
    const [top, right, bottom, left] = corners;
    const c = lerp(top, bottom, 0.5);
    const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, TILE_W * 0.7);
    g.addColorStop(0, P.waterDeep);
    g.addColorStop(1, P.water);
    fillPolygon(ctx, corners, g);

    // Glints that slowly drift, so the pond looks alive.
    ctx.strokeStyle = P.waterShine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const phase = time / 1500 + hash(tile.gx, tile.gy) * 6;
    for (let i = 0; i < 2; i++) {
      const c = lerp(lerp(top, bottom, 0.35 + i * 0.3), lerp(left, right, 0.5), 0.5);
      const dx = Math.sin(phase + i * 2) * 8;
      ctx.moveTo(c.x + dx - 6, c.y);
      ctx.lineTo(c.x + dx + 6, c.y);
    }
    ctx.stroke();

    // Rim stones on every edge that borders dry land.
    const { gx, gy } = tile;
    const edges = [
      [tileAt(room, gx, gy - 1), top, right],
      [tileAt(room, gx + 1, gy), right, bottom],
      [tileAt(room, gx, gy + 1), bottom, left],
      [tileAt(room, gx - 1, gy), left, top],
    ];
    ctx.fillStyle = P.pondRim;
    for (const [n, a, b] of edges) {
      if (n && n.floor === 'water') continue;
      for (let t = 0.17; t < 1; t += 0.33) {
        const p = lerp(a, b, t);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
};

/**
 * A tatami mat with its woven straw, the cloth border (heri) along its long
 * sides, light falling from the right and paler patches where people walk.
 */
function drawDetailedTatami(ctx, { gx, gy }, corners, room) {
  const [top, right, bottom, left] = corners;
  const mat = DETAIL >= 3 ? matAt(room, gx, gy) : { alongX: !((gx + gy) % 2), ends: [true, true] };
  const alt = mat.alongX ? 0 : 1;
  const sun = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
  sun.addColorStop(0, alt ? P.tatamiAlt : P.tatami);
  sun.addColorStop(1, P.tatamiLight);
  fillPolygon(ctx, corners, sun);

  // Mats are laid in alternating directions. a0-a1 and b0-b1 are the long
  // sides; the straw runs along them.
  const [a0, a1, b0, b1] = alt ? [top, left, right, bottom] : [top, right, left, bottom];
  if (hash(gx, gy, 5) > 0.7) {
    const c = lerp(lerp(a0, b1, 0.5), lerp(a1, b0, 0.5), 0.3 + hash(gx, gy, 6) * 0.4);
    ctx.fillStyle = P.tatamiWorn;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = P.tatamiWeave;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let t = 0.1; t < 0.92; t += 0.055) line(ctx, lerp(a0, b0, t), lerp(a1, b1, t));
  ctx.stroke();

  // Heri: a dark cloth band with a woven pattern down its middle.
  ctx.lineWidth = 1;
  for (const [p0, p1, q0, q1] of [[a0, a1, b0, b1], [b0, b1, a0, a1]]) {
    const in0 = lerp(p0, q0, 0.07);
    const in1 = lerp(p1, q1, 0.07);
    fillPolygon(ctx, [p0, p1, in1, in0], P.tatamiEdge);
    ctx.strokeStyle = P.heriPattern;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    line(ctx, lerp(p0, in0, 0.5), lerp(p1, in1, 0.5));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // The short ends of the mat: a fine dark seam (not where the two halves
  // of one mat meet in the middle).
  ctx.strokeStyle = P.woodGrain;
  ctx.beginPath();
  if (mat.ends[0]) line(ctx, a0, b0);
  if (mat.ends[1]) line(ctx, a1, b1);
  ctx.stroke();
}

/**
 * Real tatami are twice as long as wide. Here each mat covers two tiles,
 * laid in the classic pattern of 2x2 blocks that alternate direction, so
 * no four corners ever meet. A mat cut short by the tokonoma or a wall is
 * a half mat. Returns { alongX, ends: [start end?, far end?] } for a tile.
 */
function matAt(room, gx, gy) {
  const alongX = (Math.floor(gx / 2) + Math.floor(gy / 2)) % 2 === 0;
  const first = alongX ? gx % 2 === 0 : gy % 2 === 0;
  const [px, py] = alongX ? [gx + (first ? 1 : -1), gy] : [gx, gy + (first ? 1 : -1)];
  const partner = tileAt(room, px, py);
  const whole = partner && partner.floor === 'tatami';
  // ends[0] is the edge at the lower gx (or gy), ends[1] the higher one.
  return { alongX, ends: whole ? (first ? [true, false] : [false, true]) : [true, true] };
}

/**
 * Veranda boards running along gx: four per tile, each its own shade, with
 * grain, now and then a knot, and nail heads where the board ends.
 */
function drawDetailedPlanks(ctx, { gx, gy }, corners) {
  const [top, right, bottom, left] = corners;
  for (let k = 0; k < 4; k++) {
    const a0 = lerp(top, left, k / 4);
    const a1 = lerp(top, left, (k + 1) / 4);
    const b0 = lerp(right, bottom, k / 4);
    const b1 = lerp(right, bottom, (k + 1) / 4);
    const tone = hash(gx, gy * 4 + k, 11);
    fillPolygon(ctx, [a0, b0, b1, a1], tone > 0.5 ? P.planks : P.planksAlt);
    if (tone > 0.75) fillPolygon(ctx, [a0, b0, b1, a1], P.lacquerShine); // a paler, sun-bleached board
    woodGrain(ctx, a0, a1, b0, b1, 2, gx * 31 + gy * 7 + k, P.woodGrain);
    if (hash(gx, gy * 4 + k, 12) > 0.85) {
      const c = lerp(lerp(a0, a1, 0.5), lerp(b0, b1, 0.5), 0.2 + hash(gx, k, 13) * 0.6);
      ctx.fillStyle = P.knot;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 2.2, 1.1, -0.46, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nail heads near the board's end, and the gap to the next board.
    ctx.fillStyle = P.nail;
    const n = lerp(lerp(a0, a1, 0.5), lerp(b0, b1, 0.5), 0.08);
    ctx.fillRect(n.x - 0.6, n.y - 0.6, 1.2, 1.2);
  }
  ctx.strokeStyle = P.plankGap;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let t = 0.25; t < 1; t += 0.25) line(ctx, lerp(top, left, t), lerp(right, bottom, t));
  line(ctx, top, left); // where these boards butt against the next tile's
  ctx.stroke();
}

/**
 * Genkan paving: four cut stones per tile with bevelled, slightly worn
 * edges (light on the top-left, shadow on the bottom-right) and specks.
 */
function drawDetailedStone(ctx, { gx, gy }, corners) {
  const [top, right, bottom, left] = corners;
  const centre = lerp(top, bottom, 0.5);
  const mids = [lerp(top, right, 0.5), lerp(right, bottom, 0.5), lerp(bottom, left, 0.5), lerp(left, top, 0.5)];
  const quads = [
    [top, mids[0], centre, mids[3]],
    [mids[0], right, mids[1], centre],
    [centre, mids[1], bottom, mids[2]],
    [mids[3], centre, mids[2], left],
  ];
  quads.forEach((q, i) => {
    fillPolygon(ctx, q, hash(gx, gy, i) > 0.5 ? P.stone : P.stoneAlt);
    const inset = q.map((p) => lerp(p, lerp(q[0], q[2], 0.5), 0.12));
    ctx.lineWidth = 1;
    ctx.strokeStyle = P.stoneBevelLight;
    ctx.beginPath();
    line(ctx, inset[3], inset[0]);
    line(ctx, inset[0], inset[1]);
    ctx.stroke();
    ctx.strokeStyle = P.stoneJoint;
    ctx.beginPath();
    line(ctx, inset[1], inset[2]);
    line(ctx, inset[2], inset[3]);
    ctx.stroke();
    ctx.fillStyle = P.stoneSpeck;
    for (let k = 0; k < 5; k++) {
      const p = lerp(lerp(q[0], q[1], hash(gx * 4 + i, gy, k)), lerp(q[3], q[2], hash(gx * 4 + i, gy, k)), hash(gx, gy * 4 + i, k + 5));
      ctx.fillRect(p.x, p.y, 1, 1);
    }
  });
  strokePolygon(ctx, corners, P.stoneJoint, 1);
  if (gx === SANDALS.gx && gy === SANDALS.gy) drawSandals(ctx, lerp(top, bottom, 0.5));
}

// Straw sandals (zori) left at the genkan, by the step up into the house.
const SANDALS = { gx: 8, gy: 1 };

function drawSandals(ctx, c) {
  for (const dx of [-5, 4]) {
    ctx.fillStyle = P.contactShadow;
    ctx.beginPath();
    ctx.ellipse(c.x + dx + 1, c.y + 1.5, 4.5, 2.4, -0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.straw;
    ctx.beginPath();
    ctx.ellipse(c.x + dx, c.y, 4.5, 2.2, -0.46, 0, Math.PI * 2);
    ctx.fill();
    // The thong (hanao), in the cushions' plum colour.
    ctx.strokeStyle = P.cushion;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(c.x + dx - 2.5, c.y + 0.8);
    ctx.lineTo(c.x + dx + 1, c.y - 1.2);
    ctx.lineTo(c.x + dx + 2.5, c.y + 1.2);
    ctx.stroke();
  }
}

function drawMoss(ctx, { gx, gy }, corners, room) {
  fillPolygon(ctx, corners, hash(gx, gy, 1) > 0.5 ? P.moss : P.mossAlt);
  const [top, right, bottom, left] = corners;

  // Shadow at the foot of the house: if the tile behind is raised, darken
  // a strip along the shared edge. It grounds the building visually.
  const behind = [
    [tileAt(room, gx, gy - 1), [top, right, lerp(right, bottom, 0.35), lerp(top, left, 0.35)]],
    [tileAt(room, gx - 1, gy), [top, left, lerp(left, bottom, 0.35), lerp(top, right, 0.35)]],
  ];
  for (const [n, strip] of behind) if (n && n.height > 0) fillPolygon(ctx, strip, P.shadow);

  // A few darker specks at fixed "random" spots inside the diamond.
  ctx.fillStyle = P.mossSpeck;
  for (let i = 0; i < 4; i++) {
    const u = 0.15 + hash(gx, gy, i + 10) * 0.7;
    const v = 0.15 + hash(gx, gy, i + 20) * 0.7;
    const p = lerp(lerp(top, right, u), lerp(left, bottom, u), v);
    ctx.fillRect(p.x - 1, p.y - 1, 3, 2);
  }
}
