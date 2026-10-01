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
