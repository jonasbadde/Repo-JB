// Draws the furniture and garden objects listed in decor.js.
//
// Most objects are built from boxes. An isometric box shows exactly three
// faces: the top and the two faces towards the camera (+gx and +gy). The
// other three are hidden behind it, so we never draw them.
import { gridToScreen } from './iso.js';
import { tileAt } from './room.js';
import { fillPolygon, line } from './draw.js';
import { PALETTE as P } from './palette.js';

export function drawItem(ctx, room, item, origin) {
  const floor = tileAt(room, item.gx, item.gy).height;
  ITEMS[item.type](ctx, item, origin, floor);
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
  fillPolygon(ctx, [p(x0, y1, h0), p(x1, y1, h0), p(x1, y1, h1), p(x0, y1, h1)], colors.left);
  fillPolygon(ctx, [p(x1, y0, h0), p(x1, y1, h0), p(x1, y1, h1), p(x1, y0, h1)], colors.right);
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
  },

  cushion(ctx, { gx, gy }, origin, floor) {
    // Zabuton: a flat, square floor cushion.
    centredBox(ctx, origin, gx, gy, 0.6, floor, floor + 5, { top: P.cushion, left: P.cushionSide, right: P.cushionSide });
  },

  vase(ctx, { gx, gy }, origin, floor) {
    // Ikebana: a small round pot with a flowering branch.
    const c = gridToScreen(gx + 0.5, gy + 0.5, origin, floor);
    ctx.fillStyle = P.vase;
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
    for (const [dx, dy, r, color] of blobs) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(foot.x + dx, foot.y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // A few fallen leaves on the moss around the trunk.
    ctx.fillStyle = P.maple;
    for (const [dx, dy] of [[-18, 4], [14, 8], [24, -2], [-8, 12], [6, -6]]) {
      ctx.fillRect(foot.x + dx, foot.y + dy, 3, 2);
    }
  },
};

/** The dark frames around the stone lantern's light openings. */
function drawOpenings(ctx, gx, gy, origin, floor) {
  ctx.strokeStyle = P.lanternStoneShade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const p = (x, y, h) => gridToScreen(gx + x, gy + y, origin, floor + h);
  line(ctx, p(0.5, 0.65, 32), p(0.5, 0.65, 40)); // middle bar on the +gy face
  line(ctx, p(0.65, 0.5, 32), p(0.65, 0.5, 40)); // middle bar on the +gx face
  ctx.stroke();
}
