// Background art drawn in plain screen space (no isometric math):
// the sky behind the room, and the little view through the round window.
import { PALETTE as P } from './palette.js';

/**
 * Soft sky, a few puffy clouds and rolling hills behind the whole room.
 * dusk (0..1) fades an evening sky with a few stars over the day sky.
 */
export function drawBackdrop(ctx, w, h, dusk = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, P.skyTop);
  sky.addColorStop(1, P.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (dusk > 0) {
    ctx.save();
    ctx.globalAlpha = dusk;
    const evening = ctx.createLinearGradient(0, 0, 0, h);
    evening.addColorStop(0, P.eveningTop);
    evening.addColorStop(0.55, P.eveningMiddle);
    evening.addColorStop(1, P.eveningBottom);
    ctx.fillStyle = evening;
    ctx.fillRect(0, 0, w, h);
    // Stars at fixed spots in the top part of the sky.
    ctx.fillStyle = P.star;
    for (let i = 0; i < 40; i++) {
      const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const y = ((Math.sin(i * 78.233) * 12543.1234) % 1 + 1) % 1;
      ctx.fillRect(x * w, y * h * 0.4, 1.5, 1.5);
    }
    ctx.restore();
  }

  // Clouds: a few overlapping circles each. Positions are relative to the
  // canvas size so they stay put when the window is resized.
  const clouds = [
    [0.12, 0.16, 1.0],
    [0.82, 0.12, 1.3],
    [0.66, 0.3, 0.7],
    [0.25, 0.4, 0.6],
  ];
  ctx.fillStyle = P.cloud;
  for (const [fx, fy, s] of clouds) drawCloud(ctx, fx * w, fy * h, 40 * s);

  drawHill(ctx, w, h, h * 0.78, 60, P.hillFar);
  drawHill(ctx, w, h, h * 0.88, 40, P.hillNear);
}

function drawCloud(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y + r * 0.2, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r * 0.9, y + r * 0.25, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.5, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(ctx, w, h, baseY, amp, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) {
    ctx.lineTo(x, baseY - Math.sin(x / 180) * amp * 0.5 - Math.sin(x / 70) * amp * 0.15);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

/**
 * Sunset view with a distant mountain and a five-storey pagoda.
 * The caller clips to the window shape first, so we can paint freely.
 */
export function drawWindowView(ctx, cx, cy, size) {
  const top = cy - size;
  const bottom = cy + size;

  const dusk = ctx.createLinearGradient(0, top, 0, bottom);
  dusk.addColorStop(0, P.duskTop);
  dusk.addColorStop(1, P.duskBottom);
  ctx.fillStyle = dusk;
  ctx.fillRect(cx - size * 2, top, size * 4, size * 2);

  ctx.fillStyle = P.sun;
  ctx.beginPath();
  ctx.arc(cx + size * 0.45, cy + size * 0.05, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountain (a gentle Fuji-like cone).
  ctx.fillStyle = P.mountain;
  ctx.beginPath();
  ctx.moveTo(cx - size * 1.5, bottom);
  ctx.lineTo(cx - size * 0.3, cy + size * 0.1);
  ctx.lineTo(cx + size * 0.1, cy + size * 0.1);
  ctx.lineTo(cx + size * 1.5, bottom);
  ctx.fill();

  drawPagoda(ctx, cx - size * 0.3, bottom, size * 1.5);
}

/** Stacked tiers with upturned eaves, topped by a spire. */
function drawPagoda(ctx, cx, baseY, height) {
  const tiers = 5;
  const tierH = (height * 0.8) / tiers;
  ctx.fillStyle = P.pagoda;
  ctx.strokeStyle = P.pagoda;

  let y = baseY;
  for (let i = 0; i < tiers; i++) {
    const bodyW = tierH * (1.6 - i * 0.18);
    const roofW = bodyW * 1.9;

    // Body of the storey.
    ctx.fillRect(cx - bodyW / 2, y - tierH * 0.65, bodyW, tierH * 0.65);
    y -= tierH * 0.65;

    // Roof: a wide slab whose tips curl upward.
    ctx.beginPath();
    ctx.moveTo(cx - roofW / 2, y - tierH * 0.15);
    ctx.quadraticCurveTo(cx - roofW / 4, y, cx, y - tierH * 0.35);
    ctx.quadraticCurveTo(cx + roofW / 4, y, cx + roofW / 2, y - tierH * 0.15);
    ctx.lineTo(cx + roofW / 2.6, y + tierH * 0.05);
    ctx.lineTo(cx - roofW / 2.6, y + tierH * 0.05);
    ctx.closePath();
    ctx.fill();
    y -= tierH * 0.35;
  }

  // Spire (sorin).
  ctx.lineWidth = Math.max(1, height * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y - height * 0.2);
  ctx.stroke();
}
