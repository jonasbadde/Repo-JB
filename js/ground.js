// The land around the house: a grassy plot a few tiles wider than the map,
// trees behind the house and a bamboo fence around the garden.
//
// The plot is shown like a diorama: a slice of ground with a soil edge.
// That gives the house something solid to stand on instead of floating in
// the sky, while the hills in the backdrop still show the wider world.
import { gridToScreen } from './iso.js';
import { tileAt } from './room.js';
import { fillPolygon, line, hash } from './draw.js';
import { PALETTE as P } from './palette.js';

export const MARGIN = 2; // tiles of grass around the map
export const SOIL = 26; // thickness of the soil edge in pixels
const FENCE_LOW = 26; // fence height along the front (kept low so it doesn't block the view)
const FENCE_HIGH = 54; // fence height along the back

// Trees in the grass behind the house: [gx, gy, size]. They stand behind
// everything else, so they can be drawn before the house.
const BACK_TREES = [
  [-1.6, 1.5, 1.1],
  [-1.5, 5.0, 0.9],
  [-1.2, 9.5, 1.0],
  [3.0, -1.6, 1.0],
  [7.5, -1.5, 1.2],
  [12.5, -1.4, 0.9],
];

/** Everything that lies behind the house: the plot, its soil edge and trees. */
export function drawGround(ctx, room, origin) {
  const R = (gx, gy, h = 0) => gridToScreen(gx, gy, origin, h);
  const m = MARGIN;
  const w = room.width;
  const d = room.depth;
  const top = R(-m, -m);
  const right = R(w + m, -m);
  const bottom = R(w + m, d + m);
  const left = R(-m, d + m);
  const down = (p) => ({ x: p.x, y: p.y + SOIL });

  fillPolygon(ctx, [left, bottom, down(bottom), down(left)], P.soilDark);
  fillPolygon(ctx, [bottom, right, down(right), down(bottom)], P.soil);
  fillPolygon(ctx, [top, right, bottom, left], P.grassFar);

  // Little grass tufts at fixed "random" spots in the margin.
  ctx.strokeStyle = P.tuft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gy = -m; gy < d + m; gy++) {
    for (let gx = -m; gx < w + m; gx++) {
      if (gx >= 0 && gy >= 0 && gx < w && gy < d) continue; // the map draws its own tiles
      if (hash(gx, gy, 4) < 0.5) continue; // only on about half the tiles
      const p = R(gx + hash(gx, gy, 5), gy + hash(gx, gy, 6));
      line(ctx, p, { x: p.x - 2, y: p.y - 5 });
      line(ctx, p, { x: p.x + 2, y: p.y - 6 });
    }
  }
  ctx.stroke();

  for (const [gx, gy, size] of BACK_TREES) drawTree(ctx, R(gx, gy), size);

  // Tall fence along the back edges of the garden.
  forEachFenceEdge(room, true, (a, b) => drawFence(ctx, origin, a, b, FENCE_HIGH));
}

/**
 * Fence pieces along the front edges of the garden. They stand in front of
 * garden tiles, so they go into the depth-sorted draw list like walls do.
 * Returns [{ depth, draw }].
 */
export function frontFences(room, origin) {
  const pieces = [];
  forEachFenceEdge(room, false, (a, b, depth) => {
    pieces.push({ depth, draw: (ctx) => drawFence(ctx, origin, a, b, FENCE_LOW) });
  });
  return pieces;
}

/**
 * Call fn(a, b, depth) for every map-border edge of a garden tile, where a
 * and b are the edge's end points in grid coordinates. back = true picks the
 * top and left borders, back = false the bottom and right ones.
 */
function forEachFenceEdge(room, back, fn) {
  for (let gy = 0; gy < room.depth; gy++) {
    for (let gx = 0; gx < room.width; gx++) {
      const t = tileAt(room, gx, gy);
      if (t.area !== 'garden') continue;
      const depth = gx + gy + 0.9;
      if (back) {
        if (gx === 0) fn([0, gy], [0, gy + 1]);
        if (gy === 0) fn([gx, 0], [gx + 1, 0]);
      } else {
        if (gx === room.width - 1) fn([gx + 1, gy], [gx + 1, gy + 1], depth);
        if (gy === room.depth - 1) fn([gx, gy + 1], [gx + 1, gy + 1], depth);
      }
    }
  }
}

/** A bamboo fence (yotsume-gaki): upright poles held by two cross rails. */
function drawFence(ctx, origin, a, b, height) {
  const pt = (t, h) => gridToScreen(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, origin, h);
  ctx.lineCap = 'round';
  ctx.strokeStyle = P.bamboo;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let t = 0.125; t < 1; t += 0.25) line(ctx, pt(t, 0), pt(t, height));
  ctx.stroke();
  ctx.strokeStyle = P.bambooDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const h of [height * 0.35, height * 0.8]) line(ctx, pt(0, h), pt(1, h));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A rounded tree: a trunk and three overlapping blobs of leaves. */
function drawTree(ctx, foot, size) {
  const s = 40 * size;
  ctx.fillStyle = P.trunk;
  ctx.fillRect(foot.x - 4 * size, foot.y - s * 1.4, 8 * size, s * 1.4);
  const blobs = [
    [0, -2.1, 1.0, P.treeDark],
    [-0.55, -1.6, 0.75, P.treeDark],
    [0.5, -1.7, 0.8, P.treeDark],
    [0.15, -2.25, 0.6, P.treeLight],
  ];
  for (const [dx, dy, r, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(foot.x + dx * s, foot.y + dy * s, r * s * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
}
