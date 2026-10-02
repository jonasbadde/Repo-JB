// Small canvas helpers shared by all the renderers.

export function polygonPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function fillPolygon(ctx, pts, color) {
  polygonPath(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokePolygon(ctx, pts, color, width) {
  polygonPath(ctx, pts);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function line(ctx, a, b) {
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * A repeatable "random" number in [0, 1) for a tile. Math.random() would
 * give different specks of moss every frame and make them flicker; hashing
 * the tile position gives the same value every time.
 */
export function hash(gx, gy, salt = 0) {
  const s = Math.sin(gx * 127.1 + gy * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Fine, slightly wavy wood-grain lines over a board. The board's two ends
 * are the edges a0-a1 and b0-b1; the grain runs from one end to the other.
 * `seed` makes each board's grain different but the same every frame.
 */
export function woodGrain(ctx, a0, a1, b0, b1, count, seed, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.3 + hash(seed, i, 1) * 0.4) / count;
    const from = lerp(a0, a1, t);
    const to = lerp(b0, b1, t);
    const wobble = 0.6 + hash(seed, i, 2) * 0.8;
    const phase = hash(seed, i, 3) * 6;
    // Wobble sideways to the grain, whichever way the board runs.
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const nx = -(to.y - from.y) / len;
    const ny = (to.x - from.x) / len;
    ctx.moveTo(from.x, from.y);
    for (let k = 1; k <= 8; k++) {
      const p = lerp(from, to, k / 8);
      const off = Math.sin(phase + k * 1.3) * wobble;
      ctx.lineTo(p.x + nx * off, p.y + ny * off);
    }
  }
  ctx.stroke();
}

/**
 * A clump of foliage: a round blob covered in small leaf dabs, lighter on
 * the upper right where the light comes from and darker underneath.
 */
export function leafyBlob(ctx, x, y, r, base, light, dark, seed) {
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const dabs = Math.round(r * 1.6);
  for (let i = 0; i < dabs; i++) {
    const a = hash(seed, i, 1) * Math.PI * 2;
    const d = Math.sqrt(hash(seed, i, 2)) * r * 0.95;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    // Upper-right dabs are lit, lower-left ones in shade.
    const lit = (Math.cos(a) - Math.sin(a)) * (d / r);
    ctx.fillStyle = lit > 0.35 ? light : lit < -0.95 ? dark : base;
    ctx.beginPath();
    ctx.ellipse(px, py, 2.6, 1.8, a, 0, Math.PI * 2);
    ctx.fill();
  }
}
