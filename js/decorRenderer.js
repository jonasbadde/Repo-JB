// Draws the furniture and garden objects listed in decor.js.
//
// Most objects are built from boxes. An isometric box shows exactly three
// faces: the top and the two faces towards the camera (+gx and +gy). The
// other three are hidden behind it, so we never draw them.
import { gridToScreen } from './iso.js';
import { tileAt } from './room.js';
import { fillPolygon, line, hash, leafyBlob } from './draw.js';
import { PALETTE as P } from './palette.js';
import { itemSize } from './decor.js';

export function drawItem(ctx, room, item, origin) {
  drawItemAt(ctx, item, origin, tileAt(room, item.gx, item.gy).height);
}

/** Draw an item standing on a floor `floor` pixels high (also used for icons and ghosts). */
export function drawItemAt(ctx, item, origin, floor) {
  ITEMS[item.type](ctx, { ...item, ...itemSize(item) }, origin, floor);
}

/**
 * Where an item's light comes from, on screen, so lighting.js can put a
 * glow there. Only items with a `glow` value give light.
 */
export function lightPosition(room, item, origin) {
  const floor = tileAt(room, item.gx, item.gy).height;
  const lift = item.type === 'stoneLantern' ? 35 : 26;
  return gridToScreen(item.gx + 0.5, item.gy + 0.5, origin, floor + lift);
}

/**
 * A box covering grid area [x0,x1] x [y0,y1] from height h0 to h1.
 * colors = { top, left, right }: 'left' is the face towards +gy (in shade),
 * 'right' the face towards +gx (lit).
 */
function box(ctx, origin, x0, y0, x1, y1, h0, h1, colors) {
  const p = (gx, gy, h) => gridToScreen(gx, gy, origin, h);
  const leftFace = [p(x0, y1, h0), p(x1, y1, h0), p(x1, y1, h1), p(x0, y1, h1)];
  const rightFace = [p(x1, y0, h0), p(x1, y1, h0), p(x1, y1, h1), p(x1, y0, h1)];
  fillPolygon(ctx, leftFace, colors.left);
  fillPolygon(ctx, rightFace, colors.right);
  if (h1 - h0 > 3) {
    // Faces get darker towards the floor, where less light reaches.
    for (const face of [leftFace, rightFace]) {
      const lo = face[0];
      const g = ctx.createLinearGradient(lo.x, lo.y, lo.x, lo.y - Math.min(14, h1 - h0));
      g.addColorStop(0, P.cornerShade);
      g.addColorStop(1, P.clear);
      fillPolygon(ctx, face, g);
    }
  }
  fillPolygon(ctx, [p(x0, y0, h1), p(x1, y0, h1), p(x1, y1, h1), p(x0, y1, h1)], colors.top);
}

/** A box centred in tile (gx, gy), `size` tiles wide (1 = the whole tile). */
function centredBox(ctx, origin, gx, gy, size, h0, h1, colors) {
  const m = (1 - size) / 2;
  box(ctx, origin, gx + m, gy + m, gx + 1 - m, gy + 1 - m, h0, h1, colors);
}

const ITEMS = {
  table(ctx, { gx, gy, w, d }, origin, floor) {
    // A low chabudai: four short legs, then the lacquered top on them.
    const x0 = gx + 0.15;
    const y0 = gy + 0.2;
    const x1 = gx + w - 0.15;
    const y1 = gy + d - 0.2;
    const legs = { top: P.woodDark, left: P.woodDark, right: P.wood };
    const s = 0.08;
    // Back legs first so the front ones cover them.
    for (const [lx, ly] of [[x0, y0], [x1 - s, y0], [x0, y1 - s], [x1 - s, y1 - s]]) {
      box(ctx, origin, lx, ly, lx + s, ly + s, floor, floor + 12, legs);
    }
    box(ctx, origin, x0, y0, x1, y1, floor + 12, floor + 16, { top: P.lacquer, left: P.woodDark, right: P.wood });
    lacquerTop(ctx, origin, x0, y0, x1, y1, floor + 16, w >= d);
    teaSet(ctx, gridToScreen(gx + w / 2, gy + d / 2, origin, floor + 16));
    steam(ctx, gridToScreen(gx + w / 2, gy + d / 2, origin, floor + 16));
  },

  cushion(ctx, { gx, gy }, origin, floor) {
    // Zabuton: a flat, square floor cushion.
    centredBox(ctx, origin, gx, gy, 0.6, floor, floor + 5, { top: P.cushion, left: P.cushionSide, right: P.cushionSide });
    puffyCushionTop(ctx, origin, gx, gy, floor + 5);
  },

  vase(ctx, { gx, gy }, origin, floor) {
    // Ikebana: a small round pot with a flowering branch.
    const c = gridToScreen(gx + 0.5, gy + 0.5, origin, floor);
    ctx.fillStyle = P.vase;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 9, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glaze: darker underneath, a bright highlight where the light hits.
    const g = ctx.createRadialGradient(c.x + 3, c.y - 13, 1, c.x, c.y - 9, 10);
    g.addColorStop(0, P.glazeShine);
    g.addColorStop(0.35, P.clear);
    g.addColorStop(1, P.cornerShade);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 9, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = P.woodDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    line(ctx, { x: c.x, y: c.y - 16 }, { x: c.x - 12, y: c.y - 46 });
    line(ctx, { x: c.x - 6, y: c.y - 30 }, { x: c.x + 10, y: c.y - 40 });
    ctx.stroke();
    ctx.fillStyle = P.blossom;
    for (const [dx, dy] of [[-12, -46], [-9, -38], [10, -40], [4, -36], [-4, -26]]) {
      ctx.beginPath();
      ctx.arc(c.x + dx, c.y + dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  paperLantern(ctx, { gx, gy }, origin, floor) {
    // Andon: a paper lamp in a wooden frame, standing on short feet.
    const paper = { top: P.lanternPaper, left: P.lanternPaperShade, right: P.lanternPaper };
    centredBox(ctx, origin, gx, gy, 0.3, floor, floor + 6, { top: P.woodDark, left: P.woodDark, right: P.wood });
    centredBox(ctx, origin, gx, gy, 0.28, floor + 6, floor + 42, paper);
    centredBox(ctx, origin, gx, gy, 0.32, floor + 42, floor + 45, { top: P.wood, left: P.woodDark, right: P.wood });
    andonFrame(ctx, origin, gx, gy, floor);

    // Wooden frame lines across the paper.
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const h of [floor + 18, floor + 30]) {
      line(ctx, gridToScreen(gx + 0.36, gy + 0.64, origin, h), gridToScreen(gx + 0.64, gy + 0.64, origin, h));
      line(ctx, gridToScreen(gx + 0.64, gy + 0.36, origin, h), gridToScreen(gx + 0.64, gy + 0.64, origin, h));
    }
    ctx.stroke();
  },

  stoneLantern(ctx, { gx, gy }, origin, floor) {
    // Tōrō: base, post, a light box with openings, a wide roof and a knob.
    const stone = { top: P.lanternStoneTop, left: P.lanternStoneShade, right: P.lanternStone };
    centredBox(ctx, origin, gx, gy, 0.5, floor, floor + 8, stone);
    centredBox(ctx, origin, gx, gy, 0.18, floor + 8, floor + 26, stone);
    centredBox(ctx, origin, gx, gy, 0.4, floor + 26, floor + 30, stone);
    centredBox(ctx, origin, gx, gy, 0.3, floor + 30, floor + 42, stone);
    // The openings where the flame shows, one on each visible face.
    centredBox(ctx, origin, gx, gy, 0.3, floor + 32, floor + 40, { top: P.lanternStone, left: P.lanternLight, right: P.lanternLight });
    drawOpenings(ctx, gx, gy, origin, floor);
    centredBox(ctx, origin, gx, gy, 0.62, floor + 42, floor + 47, stone);
    centredBox(ctx, origin, gx, gy, 0.3, floor + 47, floor + 52, stone);
    const tip = gridToScreen(gx + 0.5, gy + 0.5, origin, floor + 52);
    ctx.fillStyle = P.lanternStoneTop;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    // Weathered granite: specks, and lichen where rain sits on the ledges.
    const c = gridToScreen(gx + 0.5, gy + 0.5, origin, floor);
    for (let i = 0; i < 40; i++) {
      const lichen = i % 4 === 0;
      const h = lichen ? [8, 30, 47][i % 3] : hash(gx, i, 3) * 52;
      const half = h < 8 || (h > 42 && h < 47) ? 14 : h > 30 && h < 42 ? 9 : 6;
      ctx.fillStyle = lichen ? P.lichen : P.stoneSpeck;
      ctx.fillRect(c.x + (hash(gx, i, 4) - 0.5) * 2 * half, c.y - h - 1 + (lichen ? 0 : hash(gx, i, 5) * 2), lichen ? 2 : 1, 1);
    }
  },

  maple(ctx, { gx, gy }, origin, floor) {
    // A Japanese maple: a leaning trunk and a crown of autumn-red blobs.
    const foot = gridToScreen(gx + 0.5, gy + 0.5, origin, floor);
    ctx.strokeStyle = P.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y);
    ctx.quadraticCurveTo(foot.x - 6, foot.y - 40, foot.x + 4, foot.y - 70);
    ctx.stroke();
    // Bark: a lit edge on the right and a few dark furrows.
    ctx.strokeStyle = P.barkLight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(foot.x + 3, foot.y - 2);
    ctx.quadraticCurveTo(foot.x - 3, foot.y - 40, foot.x + 7, foot.y - 68);
    ctx.stroke();
    ctx.strokeStyle = P.woodGrain;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) line(ctx, { x: foot.x - 2, y: foot.y - 8 - k * 9 }, { x: foot.x + 1, y: foot.y - 12 - k * 9 });
    ctx.stroke();
    ctx.strokeStyle = P.trunk;
    ctx.lineWidth = 3;
    ctx.beginPath();
    line(ctx, { x: foot.x - 2, y: foot.y - 45 }, { x: foot.x - 26, y: foot.y - 70 });
    line(ctx, { x: foot.x + 2, y: foot.y - 55 }, { x: foot.x + 28, y: foot.y - 76 });
    ctx.stroke();
    ctx.lineCap = 'butt';

    const blobs = [
      [-28, -78, 20, P.mapleDark],
      [26, -84, 20, P.mapleDark],
      [0, -92, 26, P.maple],
      [-20, -100, 18, P.maple],
      [20, -104, 18, P.maple],
      [-4, -112, 16, P.mapleLight],
      [12, -96, 12, P.mapleLight],
    ];
    for (const [i, [dx, dy, r, color]] of blobs.entries()) {
      leafyBlob(ctx, foot.x + dx, foot.y + dy, r, color, P.mapleLight, P.mapleShadow, 70 + i);
    }
    fallingLeaf(ctx, foot);

    // A few fallen leaves on the moss around the trunk.
    ctx.fillStyle = P.maple;
    for (const [dx, dy] of [[-18, 4], [14, 8], [24, -2], [-8, 12], [6, -6]]) {
      ctx.fillRect(foot.x + dx, foot.y + dy, 3, 2);
    }
  },
};

/** The dark frames around the stone lantern's light openings. */
// ---------------------------------------------------------------------------
// Finer detail: lacquer, tea set, cushion tops and the andon's frame

/** Lacquer sheen, wood grain and a lit front edge on the table top at height h. */
function lacquerTop(ctx, origin, x0, y0, x1, y1, h, alongX) {
  const p = (x, y) => gridToScreen(x, y, origin, h);
  // A soft reflection band running diagonally across the top.
  fillPolygon(ctx, [p(x0 + (x1 - x0) * 0.35, y0), p(x0 + (x1 - x0) * 0.55, y0), p(x0 + (x1 - x0) * 0.4, y1), p(x0 + (x1 - x0) * 0.2, y1)], P.lacquerShine);
  ctx.strokeStyle = P.woodGrain;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let t = 0.2; t < 1; t += 0.2) {
    if (alongX) line(ctx, p(x0, y0 + (y1 - y0) * t), p(x1, y0 + (y1 - y0) * t));
    else line(ctx, p(x0 + (x1 - x0) * t, y0), p(x0 + (x1 - x0) * t, y1));
  }
  ctx.stroke();
  ctx.strokeStyle = P.lacquerShine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  line(ctx, p(x0, y1), p(x1, y1));
  line(ctx, p(x1, y0), p(x1, y1));
  ctx.stroke();
}

/** A clay teapot and two cups, standing on the table top at screen point c. */
function teaSet(ctx, c) {
  // Teapot (kyusu): round body, lid knob, spout and side handle.
  ctx.fillStyle = P.teapot;
  ctx.beginPath();
  ctx.ellipse(c.x - 9, c.y - 5, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(c.x - 4, c.y - 7, 6, 2); // spout
  ctx.fillRect(c.x - 18, c.y - 6, 5, 2); // handle
  ctx.beginPath();
  ctx.ellipse(c.x - 9, c.y - 10, 1.6, 1.4, 0, 0, Math.PI * 2); // lid knob
  ctx.fill();
  ctx.fillStyle = P.teapotShine;
  ctx.beginPath();
  ctx.ellipse(c.x - 7, c.y - 7, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Two small cups with green tea in them.
  for (const [dx, dy] of [[6, -2], [12, 2]]) {
    ctx.fillStyle = P.teacup;
    ctx.fillRect(c.x + dx - 2.5, c.y + dy - 4, 5, 4);
    ctx.beginPath();
    ctx.ellipse(c.x + dx, c.y + dy - 4, 2.5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.tea;
    ctx.beginPath();
    ctx.ellipse(c.x + dx, c.y + dy - 4, 1.8, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Now and then a leaf lets go of the maple and see-saws down to the moss.
 * One leaf at a time, on a 7-second loop: 4 s falling, then a pause.
 */
function fallingLeaf(ctx, foot) {
  const t = (performance.now() / 7000) % 1;
  const fall = t / 0.57;
  if (fall > 1) return;
  const x = foot.x + 10 + Math.sin(fall * 9) * 10 - fall * 18;
  const y = foot.y - 80 + fall * 82;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(fall * 9) * 0.9);
  ctx.fillStyle = P.mapleLight;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.8, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Two thin wisps of steam curling up from the teapot's spout. */
function steam(ctx, c) {
  const t = performance.now() / 1000;
  ctx.strokeStyle = P.steam;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const phase = t * 0.8 + i * 1.7;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(phase);
    ctx.beginPath();
    ctx.moveTo(c.x - 3 + i * 2, c.y - 9);
    for (let k = 1; k <= 6; k++) ctx.lineTo(c.x - 3 + i * 2 + Math.sin(phase * 2 + k * 0.9) * 2.2, c.y - 9 - k * 3.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

/** The top of a zabuton: puffed up in the middle, a stitched seam and a thread tie. */
function puffyCushionTop(ctx, origin, gx, gy, h) {
  const m = 0.2;
  const p = (x, y) => gridToScreen(gx + x, gy + y, origin, h);
  const c = p(0.5, 0.5);
  const puff = ctx.createRadialGradient(c.x, c.y - 1, 1, c.x, c.y, 18);
  puff.addColorStop(0, P.cushionLight);
  puff.addColorStop(1, P.cushion);
  fillPolygon(ctx, [p(m, m), p(1 - m, m), p(1 - m, 1 - m), p(m, 1 - m)], puff);
  ctx.strokeStyle = P.cushionSeam;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([1.5, 1.5]);
  ctx.beginPath();
  const s = 0.25;
  ctx.moveTo(p(s, s).x, p(s, s).y);
  for (const [x, y] of [[1 - s, s], [1 - s, 1 - s], [s, 1 - s], [s, s]]) ctx.lineTo(p(x, y).x, p(x, y).y);
  ctx.stroke();
  ctx.setLineDash([]);
  // The tie in the middle: a little cross of thread.
  ctx.strokeStyle = P.thread;
  ctx.lineWidth = 1;
  ctx.beginPath();
  line(ctx, { x: c.x - 2, y: c.y - 1 }, { x: c.x + 2, y: c.y + 1 });
  line(ctx, { x: c.x + 2, y: c.y - 1 }, { x: c.x - 2, y: c.y + 1 });
  ctx.stroke();
}

/** The andon's wooden frame over the paper: corner posts, rails and short legs. */
function andonFrame(ctx, origin, gx, gy, floor) {
  const m = 0.36; // the paper box spans m..1-m
  const at = (x, y, h) => gridToScreen(gx + x, gy + y, origin, floor + h);
  ctx.strokeStyle = P.woodDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [x, y] of [[1 - m, m], [1 - m, 1 - m], [m, 1 - m]]) line(ctx, at(x, y, 4), at(x, y, 43));
  for (const h of [6, 42]) {
    line(ctx, at(m, 1 - m, h), at(1 - m, 1 - m, h));
    line(ctx, at(1 - m, m, h), at(1 - m, 1 - m, h));
  }
  ctx.stroke();
  // Paper fibres, so it reads as washi rather than plastic.
  ctx.fillStyle = P.paperFibre;
  for (let i = 0; i < 6; i++) {
    const q = at(1 - m, m + 0.05 + hash(gx, gy, i) * 0.25, 10 + i * 5);
    ctx.fillRect(q.x - 1, q.y, 2, 0.8);
  }
}

function drawOpenings(ctx, gx, gy, origin, floor) {
  ctx.strokeStyle = P.lanternStoneShade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const p = (x, y, h) => gridToScreen(gx + x, gy + y, origin, floor + h);
  line(ctx, p(0.5, 0.65, 32), p(0.5, 0.65, 40)); // middle bar on the +gy face
  line(ctx, p(0.65, 0.5, 32), p(0.65, 0.5, 40)); // middle bar on the +gx face
  ctx.stroke();
}
