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

export const TILE_W = 64; // diamond width in pixels
export const TILE_H = 32; // diamond height in pixels (half the width => 2:1)

/** Grid point -> screen pixel. Fractional grid coords are fine. */
export function gridToScreen(gx, gy, origin) {
  return {
    x: origin.x + (gx - gy) * (TILE_W / 2),
    y: origin.y + (gx + gy) * (TILE_H / 2),
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
 */
export function screenToGrid(sx, sy, origin) {
  const dx = sx - origin.x;
  const dy = sy - origin.y;
  return {
    x: dx / TILE_W + dy / TILE_H,
    y: dy / TILE_H - dx / TILE_W,
  };
}

/** The four screen corners of tile (gx, gy): top, right, bottom, left. */
export function tileCorners(gx, gy, origin) {
  return [
    gridToScreen(gx, gy, origin),
    gridToScreen(gx + 1, gy, origin),
    gridToScreen(gx + 1, gy + 1, origin),
    gridToScreen(gx, gy + 1, origin),
  ];
}
