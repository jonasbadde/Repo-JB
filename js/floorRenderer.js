// Draws one floor tile: its top surface and, where the floor is raised above
// the tile in front of it, the visible side faces underneath.
import { TILE_W, gridToScreen, tileCorners } from './iso.js';
import { tileAt } from './room.js';
import { fillPolygon, strokePolygon, lerp, line, hash } from './draw.js';
import { PALETTE as P } from './palette.js';

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
  tatami(ctx, { gx, gy }, corners) {
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
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0.3; t < 1; t += 0.35) line(ctx, lerp(top, left, t), lerp(right, bottom, t));
    ctx.stroke();
  },

  stone(ctx, { gx, gy }, corners) {
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

  planks(ctx, { gx, gy }, corners) {
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

  moss(ctx, tile, corners) {
    drawMoss(ctx, tile, corners);
  },

  steppingStone(ctx, tile, corners) {
    drawMoss(ctx, tile, corners);
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

function drawMoss(ctx, { gx, gy }, corners) {
  fillPolygon(ctx, corners, hash(gx, gy, 1) > 0.5 ? P.moss : P.mossAlt);
  // A few darker specks at fixed "random" spots inside the diamond.
  const [top, right, bottom, left] = corners;
  ctx.fillStyle = P.mossSpeck;
  for (let i = 0; i < 4; i++) {
    const u = 0.15 + hash(gx, gy, i + 10) * 0.7;
    const v = 0.15 + hash(gx, gy, i + 20) * 0.7;
    const p = lerp(lerp(top, right, u), lerp(left, bottom, u), v);
    ctx.fillRect(p.x - 1, p.y - 1, 3, 2);
  }
}
