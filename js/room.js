// Room data model. Pure data, no drawing, so later steps (pathfinding,
// furniture, multiplayer sync) can use it without touching the renderer.

export function createRoom(width = 10, depth = 10) {
  return {
    width, // tiles along gx
    depth, // tiles along gy
    wallHeight: 150, // pixels
  };
}

export function isInside(room, gx, gy) {
  return gx >= 0 && gy >= 0 && gx < room.width && gy < room.depth;
}

/**
 * Tiles in back-to-front draw order. A tile with a smaller gx + gy is
 * further back, so drawing in that order lets nearer things overlap
 * farther ones (the "painter's algorithm"). Avatars and furniture will
 * reuse this ordering later.
 */
export function tilesInDrawOrder(room) {
  const tiles = [];
  for (let gy = 0; gy < room.depth; gy++) {
    for (let gx = 0; gx < room.width; gx++) tiles.push({ gx, gy });
  }
  return tiles.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
}
