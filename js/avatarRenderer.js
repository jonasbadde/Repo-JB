// Draws the avatar: a small chibi figure in an indigo yukata and geta.
//
// The figure is drawn with plain shapes around its feet at (0, 0), with y
// going up as negative numbers, then moved and scaled into place. It has
// three views: front (walking towards the camera), back (walking away) and
// side. Facing left is the right-facing drawing mirrored, so 3 drawings
// cover all 8 directions.
import { gridToScreen } from './iso.js';
import { PALETTE as P } from './palette.js';

const SCALE = 1.2; // the shapes below are ~40px tall; this makes ~48px

// Which local x side faces the light (the right of the screen). The figure
// is mirrored when it faces left, so this flips to keep the light on the right.
let lit = 1;

/** dusk: 0 = day, 1 = dusk (the cast shadow fades with the sun). */
export function drawAvatar(ctx, avatar, origin, dusk = 0) {
  const feet = gridToScreen(avatar.x + 0.5, avatar.y + 0.5, origin, avatar.h);
  // Turn the grid direction into a screen direction: +gx is right-and-down
  // on screen, +gy is left-and-down.
  const [dx, dy] = avatar.facing;
  const toward = Math.sign(dx + dy); // 1 = towards the camera, -1 = away, 0 = sideways
  const right = dx - dy >= 0;
  const swing = avatar.walking ? Math.sin(avatar.phase) : 0;

  ctx.save();
  ctx.translate(feet.x, feet.y);
  if (dusk < 1) {
    // A shadow cast away from the daylight, like the furniture's (in
    // screen space, before the figure is mirrored).
    ctx.globalAlpha = 0.35 * (1 - dusk);
    ctx.fillStyle = P.contactShadow;
    ctx.beginPath();
    ctx.ellipse(-9, 3, avatar.sitting ? 9 : 13, 3.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  lit = right ? 1 : -1;
  ctx.scale(right ? SCALE : -SCALE, SCALE);
  ellipse(ctx, 0, 0, 10, 4, P.shadow);
  if (avatar.sitting) {
    drawSitting(ctx, toward);
  } else {
    drawGeta(ctx, toward, swing, avatar.walking);
    ctx.translate(0, avatar.walking ? -Math.abs(swing) * 1.2 : 0); // bob
    drawRobe(ctx, toward, swing, -23, -3);
    drawHead(ctx, -31, toward);
  }
  ctx.restore();
}

/** A faint dot in the middle of a tile, for showing the planned walk. */
export function drawPathDot(ctx, tile, origin, alpha) {
  const c = gridToScreen(tile.gx + 0.5, tile.gy + 0.5, origin, tile.height);
  ctx.globalAlpha = alpha;
  ellipse(ctx, c.x, c.y, 5, 2.5, P.pathDot);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Body parts

function drawGeta(ctx, toward, swing, walking) {
  // Wooden sandals on two teeth. Walking lifts one foot, then the other;
  // seen from the side the feet also move forwards and back.
  for (const [i, fx] of [[0, -3], [1, 3]]) {
    const s = i ? swing : -swing;
    const x = fx + (toward === 0 ? s * 2 : 0);
    const y = walking ? -Math.max(0, s) * 2.5 : 0;
    rect(ctx, x - 2.5, y - 3, 5, 2, P.woodLight);
    rect(ctx, x - 2, y - 1, 1, 1, P.wood);
    rect(ctx, x + 1, y - 1, 1, 1, P.wood);
    ellipse(ctx, x, y - 4, 2, 1.4, P.skin);
    ellipse(ctx, x, y - 4.4, 0.9, 0.9, P.cushion); // the strap (hanao)
  }
}

/** Robe from the shoulders (y = top) to the hem (y = hem). */
function drawRobe(ctx, toward, swing, top, hem) {
  // Sleeves on the far side of the body are drawn first.
  if (toward < 0) drawSleeves(ctx, swing, top);
  if (toward === 0) drawSleeve(ctx, -2, -swing * 2, top, P.yukataShade);

  poly(ctx, [[-6, top], [6, top], [8, hem], [-8, hem]], P.yukata);
  poly(ctx, [[-6, top], [-3, top], [-4, hem], [-8, hem]], P.yukataShade); // light comes from the right
  drawPattern(ctx, top, hem);
  drawFolds(ctx, top, hem);

  if (toward > 0) {
    // Collar: the left panel crosses over the right, as yukata are worn.
    ctx.strokeStyle = P.collar;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3.5, top);
    ctx.lineTo(1, top + 8);
    ctx.lineTo(3.5, top);
    ctx.stroke();
  }

  const obi = top + 8; // top edge of the sash
  poly(ctx, [[-6.6, obi], [6.6, obi], [6.9, obi + 4.5], [-6.9, obi + 4.5]], P.moss);
  // The obi's woven stripe.
  ctx.strokeStyle = P.obiStripe;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-6.7, obi + 2.2);
  ctx.lineTo(6.7, obi + 2.2);
  ctx.stroke();
  if (toward < 0) {
    // The obi is tied in a bow at the back.
    poly(ctx, [[-5, obi - 0.5], [0, obi + 2], [-5, obi + 5]], P.obiKnot);
    poly(ctx, [[5, obi - 0.5], [0, obi + 2], [5, obi + 5]], P.obiKnot);
  } else {
    // A paper fan (uchiwa) tucked into the obi.
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(4, obi + 4);
    ctx.lineTo(5.5, obi - 2);
    ctx.stroke();
    ellipse(ctx, 6, obi - 4.5, 2.8, 3, P.shoji);
    ellipse(ctx, 6, obi - 4.5, 1.3, 1.4, P.maple);
  }

  if (toward > 0) drawSleeves(ctx, swing, top);
  if (toward === 0) drawSleeve(ctx, 2, swing * 2, top, P.yukata);
}

function drawSleeves(ctx, swing, top) {
  drawSleeve(ctx, -8, -swing * 1.5, top, P.yukataShade);
  drawSleeve(ctx, 8, swing * 1.5, top, P.yukata);
}

/** A wide yukata sleeve with a hand peeking out; `swing` moves it with the stride. */
function drawSleeve(ctx, x, swing, top, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 3 + swing, top + 2, 6, 10 - Math.abs(swing) * 0.5, [2, 2, 3, 3]);
  ctx.fill();
  ellipse(ctx, x + swing * 1.2, top + 12, 1.8, 1.6, P.skin);
}

/** Soft folds falling from the obi, and the robe's edge catching the light. */
function drawFolds(ctx, top, hem) {
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = P.yukataShade;
  ctx.beginPath();
  for (const [x0, x1] of [[-1, -2], [2.5, 3.6]]) {
    ctx.moveTo(x0, top + 13);
    ctx.quadraticCurveTo(x0 + 0.8, (top + hem) / 2 + 6, x1, hem);
  }
  ctx.stroke();
  ctx.strokeStyle = P.yukataLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lit * 6, top + 1);
  ctx.lineTo(lit * 7.8, hem - 0.5);
  ctx.stroke();
}

function drawPattern(ctx, top, hem) {
  // Small star-shaped hemp-leaf (asanoha) marks.
  ctx.strokeStyle = P.yukataPattern;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const [x, y] of [[-3, top + 4], [3, hem - 4], [-4, hem - 3]]) {
    ctx.moveTo(x - 1.2, y);
    ctx.lineTo(x + 1.2, y);
    ctx.moveTo(x - 0.6, y - 1);
    ctx.lineTo(x + 0.6, y + 1);
    ctx.moveTo(x + 0.6, y - 1);
    ctx.lineTo(x - 0.6, y + 1);
  }
  ctx.stroke();
}

/** A big round head centred at (0, y) with the hair tied in a topknot. */
function drawHead(ctx, y, toward) {
  const r = 9;
  ellipse(ctx, 0, y + 8, 2.2, 2, P.skinShade); // neck
  // The topknot sits towards the back of the head when seen from the side.
  const bunX = toward === 0 ? -3 : 0;
  ellipse(ctx, bunX, y - r - 1.5, 3.5, 3, P.hair);
  if (toward < 0) {
    ellipse(ctx, 0, y, r, r, P.hair);
    ellipse(ctx, bunX, y - r + 1, 3, 0.8, P.hairTie);
    hairSheen(ctx, y, r);
    return;
  }

  ellipse(ctx, 0, y, r, r, P.skin);
  ctx.fillStyle = P.hair;
  ctx.beginPath();
  if (toward === 0) {
    // Side view: hair covers the back of the head and the crown.
    ctx.arc(0, y, r + 0.5, Math.PI * 0.6, Math.PI * 1.85);
    ctx.lineTo(6, y - 3);
    ctx.lineTo(1, y - 2.5);
    ctx.lineTo(-1, y + 4);
  } else {
    // Front: the top half, with a parted fringe.
    ctx.arc(0, y, r + 0.5, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(5.8, y - 4);
    ctx.lineTo(2.8, y - 2);
    ctx.lineTo(-0.2, y - 4.5);
    ctx.lineTo(-3.2, y - 2.5);
  }
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, bunX, y - r + 1, 3, 0.8, P.hairTie);
  hairSheen(ctx, y, r);

  // Eyes and rosy cheeks; facing a little to the right moves them over.
  const eyes = toward === 0 ? [5.5] : [-1.4, 5];
  for (const ex of eyes) {
    ellipse(ctx, ex, y + 1.5, 1.1, 1.6, P.eye);
    ellipse(ctx, ex + 0.35, y + 0.9, 0.45, 0.45, P.collar); // a glint in the eye
    ellipse(ctx, ex + 1.3, y + 4.5, 1.6, 1, P.blush);
  }
}

/** A soft band of light on the hair, on the side towards the light. */
function hairSheen(ctx, y, r) {
  ctx.strokeStyle = P.hairSheen;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (lit > 0) ctx.arc(0, y, r - 2, -Math.PI * 0.45, -Math.PI * 0.15);
  else ctx.arc(0, y, r - 2, -Math.PI * 0.85, -Math.PI * 0.55);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawSitting(ctx, toward) {
  // Seiza: kneeling, with the robe spread over the folded legs.
  ellipse(ctx, 0, -3.5, 10, 4.5, P.yukataShade);
  ellipse(ctx, 0, -4.5, 9, 3.6, P.yukata);
  drawRobe(ctx, toward, 0, -19, -4);
  if (toward >= 0) {
    // Hands resting in the lap.
    ellipse(ctx, -1.5, -6, 1.8, 1.4, P.skin);
    ellipse(ctx, 1.5, -6, 1.8, 1.4, P.skin);
  }
  drawHead(ctx, -27, toward);
}

// ---------------------------------------------------------------------------
// Shape helpers

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
