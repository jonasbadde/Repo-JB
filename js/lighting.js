// Day/dusk lighting, drawn on top of the finished scene.
//
// Two canvas blend modes do the work (ctx.globalCompositeOperation):
//   'multiply' darkens: every pixel is multiplied by a colour. Multiplying
//              by white changes nothing; by a dusky blue-purple it turns
//              the whole picture into evening.
//   'lighter'  adds light: colours are added together, so a warm gradient
//              drawn this way brightens whatever is under it, like a lamp.
import { PALETTE as P } from './palette.js';

const GLOW_RADIUS = 140;
const WHITE = [255, 255, 255];
const DUSK = rgb(P.duskTint);
const GLOW = rgb(P.glow);

/** '#8074a8' -> [128, 116, 168] */
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix two [r, g, b] colours: t = 0 gives a, t = 1 gives b. */
function mix(a, b, t) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`;
}

/**
 * dusk: 0 = full day, 1 = full dusk (in between while fading).
 * lights: [{ x, y, glow }] in screen pixels; glow is the strength (0..1).
 */
export function drawLighting(ctx, w, h, lights, dusk, time) {
  ctx.save();

  if (dusk > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = mix(WHITE, DUSK, dusk);
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalCompositeOperation = 'lighter';
  lights.forEach(({ x, y, glow }, i) => {
    // Lanterns glow faintly by day and strongly at dusk, with a slow
    // flicker. Each one gets its own phase (i) so they don't pulse together.
    const flicker = 1 + 0.06 * Math.sin(time / 170 + i * 2.3) + 0.04 * Math.sin(time / 60 + i);
    const strength = (0.1 + 0.65 * dusk) * glow * flicker;

    const g = ctx.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
    g.addColorStop(0, warm(strength));
    g.addColorStop(0.25, warm(strength * 0.45));
    g.addColorStop(1, warm(0));
    ctx.fillStyle = g;
    ctx.fillRect(x - GLOW_RADIUS, y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
  });

  ctx.restore();
}

function warm(alpha) {
  return `rgba(${GLOW.join(', ')}, ${Math.max(0, alpha).toFixed(3)})`;
}
