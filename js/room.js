// Building data model. Pure data, no drawing, so later steps (pathfinding,
// furniture, multiplayer sync) can use it without touching the renderer.
//
// The layout is drawn as text below: one letter per tile, gx going right
// and gy going down. On screen the map is turned 45°, so the top-left
// letter becomes the back corner of the building. Edit the letters to
// change the layout.

const MAP = `
TKKTTTTTSSS.
TTTTTTTTSSS.
TTTTTTTTSSS.
TTTTTTTTSSS.
TTTTTTTT.:..
TTTTTTTT.:..
WWWWWWWW::..
WWWWWWWW....
..:.......L.
.PPP........
.PPP...M....
............
`;

// What each letter means. `height` is how far the floor sits above the
// ground in pixels: Japanese houses are raised on stone footings to keep
// the floor dry, and the entrance (genkan) is lower so you step *up* into
// the house after taking your shoes off.
const LEGEND = {
  T: { area: 'main', floor: 'tatami', height: 36, walkable: true },
  K: { area: 'main', floor: 'tokonoma', height: 44, walkable: false },
  S: { area: 'genkan', floor: 'stone', height: 12, walkable: true },
  W: { area: 'engawa', floor: 'planks', height: 30, walkable: true },
  '.': { area: 'garden', floor: 'moss', height: 0, walkable: true },
  ':': { area: 'garden', floor: 'steppingStone', height: 0, walkable: true },
  P: { area: 'garden', floor: 'water', height: 0, walkable: false },
  // Tiles under big garden objects. The objects themselves live in decor.js.
  L: { area: 'garden', floor: 'moss', height: 0, walkable: false },
  M: { area: 'garden', floor: 'moss', height: 0, walkable: false },
};

export const AREA_NAMES = {
  main: 'Main room',
  genkan: 'Genkan (entrance)',
  engawa: 'Engawa (veranda)',
  garden: 'Garden',
};

// Areas that have walls around them. The engawa is a roofed veranda that
// is open to the garden, so it only gets a wall where it meets the house.
const INDOOR = new Set(['main', 'genkan']);

// Openings in walls, as pairs of neighbouring tiles. An edge listed here
// gets no wall, so the avatar will be able to walk through it.
const DOORWAYS = [
  [[7, 2], [8, 2]], // main room <-> genkan (open fusuma)
  [[9, 3], [9, 4]], // genkan <-> garden (front door)
  [[2, 5], [2, 6]], // main room <-> engawa (open shoji)
  [[3, 5], [3, 6]],
  [[4, 5], [4, 6]],
  [[5, 5], [5, 6]],
];

// The tallest step up or down the avatar may take without stairs.
export const MAX_STEP = 24;

// Places where a bigger height difference is still walkable: the shoe stone
// (kutsunugi-ishi) in front of the engawa acts as a step.
const STEPS = [[[2, 7], [2, 8]]];

export function createRoom() {
  const rows = MAP.trim().split('\n');
  const width = rows[0].length; // tiles along gx
  const depth = rows.length; // tiles along gy

  const tiles = [];
  for (let gy = 0; gy < depth; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const info = LEGEND[rows[gy][gx]];
      if (!info) throw new Error(`Unknown map letter "${rows[gy][gx]}" at (${gx}, ${gy})`);
      tiles.push({ gx, gy, ...info });
    }
  }

  const room = {
    width,
    depth,
    tiles,
    doorways: new Set(DOORWAYS.map(([a, b]) => edgeKey(a, b))),
    steps: new Set(STEPS.map(([a, b]) => edgeKey(a, b))),
    wallTop: 186, // height of the wall tops above the ground, in pixels
  };
  room.walls = findWalls(room);
  return room;
}

export function isInside(room, gx, gy) {
  return gx >= 0 && gy >= 0 && gx < room.width && gy < room.depth;
}

export function tileAt(room, gx, gy) {
  return isInside(room, gx, gy) ? room.tiles[gy * room.width + gx] : null;
}

/**
 * A name for the edge between two neighbouring tiles that is the same
 * whichever order you pass them in, so it can be used as a Set key.
 */
function edgeKey(a, b) {
  const [p, q] = a[0] + a[1] * 1000 < b[0] + b[1] * 1000 ? [a, b] : [b, a];
  return `${p[0]},${p[1]}|${q[0]},${q[1]}`;
}

/**
 * Work out every wall from the map, so walls never get out of sync with it.
 * A wall goes on each tile edge where an indoor area meets a different area
 * (or the edge of the map), unless that edge is a doorway.
 *
 * Each wall is { gx, gy, axis, back }:
 *   axis 'x' = the edge on the far side of tile (gx, gy) in the +gx direction
 *   axis 'y' = the edge on the far side of tile (gx, gy) in the +gy direction
 * `back` marks the outer walls along the top two edges of the map. Those are
 * drawn full height; every other wall stands between the camera and the
 * room, so it is drawn cut down low (like The Sims' "walls cutaway" view).
 */
function findWalls(room) {
  const walls = [];
  const needsWall = (a, b) => {
    const ia = a && INDOOR.has(a.area);
    const ib = b && INDOOR.has(b.area);
    if (!ia && !ib) return false;
    if (a && b && a.area === b.area) return false;
    if (a && b && room.doorways.has(edgeKey([a.gx, a.gy], [b.gx, b.gy]))) return false;
    return true;
  };

  for (let gy = 0; gy < room.depth; gy++) {
    for (let gx = 0; gx < room.width; gx++) {
      const t = tileAt(room, gx, gy);
      // Back edges of the map: only the top row and left column have them.
      if (gx === 0 && needsWall(null, t)) walls.push({ gx: -1, gy, axis: 'x', back: true });
      if (gy === 0 && needsWall(null, t)) walls.push({ gx, gy: -1, axis: 'y', back: true });
      // Edges towards the +gx and +gy neighbours.
      if (needsWall(t, tileAt(room, gx + 1, gy))) walls.push({ gx, gy, axis: 'x', back: false });
      if (needsWall(t, tileAt(room, gx, gy + 1))) walls.push({ gx, gy, axis: 'y', back: false });
    }
  }
  return walls;
}

/** Is there a wall on the edge between neighbouring tiles a and b? */
function hasWall(room, a, b) {
  const [p, q] = a.gx + a.gy < b.gx + b.gy ? [a, b] : [b, a];
  const axis = q.gx > p.gx ? 'x' : 'y';
  return room.walls.some((w) => w.gx === p.gx && w.gy === p.gy && w.axis === axis);
}

/**
 * Can someone walk directly from tile a to its neighbour b?
 * Not used yet. This is the rule the avatar's pathfinding will follow.
 */
export function canStepBetween(room, a, b) {
  if (!a || !b || !a.walkable || !b.walkable) return false;
  if (hasWall(room, a, b)) return false;
  if (Math.abs(a.height - b.height) <= MAX_STEP) return true;
  return room.steps.has(edgeKey([a.gx, a.gy], [b.gx, b.gy]));
}

/**
 * Tiles in back-to-front draw order. A tile with a smaller gx + gy is
 * further back, so drawing in that order lets nearer things overlap
 * farther ones (the "painter's algorithm").
 */
export function tilesInDrawOrder(room) {
  return [...room.tiles].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
}
