// Isometric projection math.
//
// The room is a flat grid of tiles addressed by (gx, gy) grid coordinates.
// To draw it "isometric" we rotate the grid 45° and squash it vertically
// by half. That's the classic 2:1 projection Habbo uses: every tile becomes
// a diamond twice as wide as it is tall.
//
//            (0,0)            <- top corner of the room
//           /     \
//      +gy /       \ +gx
//         /         \
//
// Moving +1 in gx goes right-and-down on screen:  (+TILE_W/2, +TILE_H/2)
// Moving +1 in gy goes left-and-down on screen:   (-TILE_W/2, +TILE_H/2)
//
// So for any grid point:
//   screenX = (gx - gy) * TILE_W / 2
//   screenY = (gx + gy) * TILE_H / 2
// plus an `origin` offset that says where grid (0,0) sits on the canvas.
//
// Height: isometric projection keeps vertical lines vertical, so lifting a
// point `h` pixels off the ground is simply "subtract h from screen y".

export const TILE_W = 64; // diamond width in pixels
export const TILE_H = 32; // diamond height in pixels (half the width => 2:1)

/** Grid point (optionally lifted h pixels) -> screen pixel. Fractional grid coords are fine. */
export function gridToScreen(gx, gy, origin, h = 0) {
  return {
    x: origin.x + (gx - gy) * (TILE_W / 2),
    y: origin.y + (gx + gy) * (TILE_H / 2) - h,
  };
}

/**
 * Screen pixel -> grid point (the inverse of gridToScreen).
 *
 * Solve the two equations above for gx and gy. With dx, dy measured
 * from the origin:
 *   dx / (W/2) = gx - gy
 *   dy / (H/2) = gx + gy
 * Adding them gives 2*gx, subtracting gives 2*gy, which simplifies to:
 *   gx = dx / W + dy / H
 *   gy = dy / H - dx / W
 * Returns fractional coords; floor them to get the tile under the point.
 * This assumes the point lies on the ground (h = 0); for raised floors use
 * pointInPolygon on the lifted tile corners instead.
 */
export function screenToGrid(sx, sy, origin) {
  const dx = sx - origin.x;
  const dy = sy - origin.y;
  return {
    x: dx / TILE_W + dy / TILE_H,
    y: dy / TILE_H - dx / TILE_W,
  };
}

/** The four screen corners of tile (gx, gy) at height h: top, right, bottom, left. */
export function tileCorners(gx, gy, origin, h = 0) {
  return [
    gridToScreen(gx, gy, origin, h),
    gridToScreen(gx + 1, gy, origin, h),
    gridToScreen(gx + 1, gy + 1, origin, h),
    gridToScreen(gx, gy + 1, origin, h),
  ];
}

/**
 * Is screen point p inside the convex polygon pts? We walk the edges and
 * check which side of each edge p is on (the sign of a 2D cross product).
 * Inside means "the same side of every edge".
 */
export function pointInPolygon(p, pts) {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}
