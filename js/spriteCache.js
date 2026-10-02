// Drawing the same thing every frame is wasted work when it never changes.
// A static part of the scene (the ground, back trees, back walls and roof)
// is drawn once into an offscreen canvas, laid out as if grid (0,0) were at
// screen (0,0). Each frame we just copy that picture to where it belongs.
//
// The cache is thrown away when the pixel ratio changes (moving the window
// to another screen, or zooming the browser), so pictures stay sharp.

const cache = new Map();
let cachedDpr = 0;

/**
 * Draw `key` at `origin`. `box` = { x, y, w, h } is the area the picture
 * covers relative to grid (0,0); `draw(ctx, origin)` paints it the first time.
 */
export function drawCached(ctx, key, box, draw, origin) {
  const dpr = window.devicePixelRatio || 1;
  if (dpr !== cachedDpr) {
    cache.clear();
    cachedDpr = dpr;
  }
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.ceil(box.w * dpr);
    canvas.height = Math.ceil(box.h * dpr);
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(-box.x, -box.y);
    draw(g, { x: 0, y: 0 });
    cache.set(key, canvas);
    // An ImageBitmap is handed to the graphics card once and then reused;
    // a plain canvas may be copied over again every frame. Until the bitmap
    // is ready (it is made in the background) we use the canvas.
    const dprAtStart = dpr;
    createImageBitmap(canvas).then((bitmap) => {
      if (cachedDpr === dprAtStart) cache.set(key, bitmap);
    });
  }
  ctx.drawImage(canvas, origin.x + box.x, origin.y + box.y, box.w, box.h);
}

/** The smallest whole-pixel box around some points, with `pad` pixels to spare. */
export function boxAround(points, pad) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad) - x, h: Math.ceil(Math.max(...ys) + pad) - y };
}
