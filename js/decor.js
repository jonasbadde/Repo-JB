// What sits in the building: furniture, garden objects and what is painted
// or hung on the back walls. Pure data like room.js; decorRenderer.js and
// wallRenderer.js do the drawing.
//
// Each item has an id and stands on a tile (gx, gy). Items bigger than one
// tile give their size in tiles with w (along gx) and d (along gy). `rot`
// is how many quarter turns the item is rotated: a turned table swaps w and
// d, and a cushion's rot says which way you face when sitting on it.
//
// This is the *starting* layout. Furniture can be moved, so the current
// layout lives in room.items (see room.js and furniture.js).

export const DECOR = [
  // Main room: a low table with a cushion on each long side.
  { id: 'table', type: 'table', gx: 3, gy: 2, w: 2, d: 1, rot: 0 },
  { id: 'cushion-1', type: 'cushion', gx: 3, gy: 1, rot: 0 },
  { id: 'cushion-2', type: 'cushion', gx: 4, gy: 1, rot: 0 },
  { id: 'cushion-3', type: 'cushion', gx: 3, gy: 3, rot: 2 },
  { id: 'cushion-4', type: 'cushion', gx: 4, gy: 3, rot: 2 },
  { id: 'vase', type: 'vase', gx: 2, gy: 0 }, // ikebana in the tokonoma

  // Paper lanterns (andon) in the room and on the veranda.
  { id: 'andon-1', type: 'paperLantern', gx: 0, gy: 4, glow: 1, rot: 0 },
  { id: 'andon-2', type: 'paperLantern', gx: 7, gy: 7, glow: 1, rot: 0 },

  // Garden.
  { id: 'stone-lantern', type: 'stoneLantern', gx: 10, gy: 8, glow: 0.7 },
  { id: 'maple', type: 'maple', gx: 7, gy: 10 },
];

/** The grid direction each rotation faces: rot 0 looks towards +gy. */
export const FACING = [[0, 1], [-1, 0], [0, -1], [1, 0]];

/**
 * What fills each stretch of the two back walls, measured in tiles along
 * the wall (u). 'left' runs along gy, 'right' runs along gx.
 * Kinds: shoji (paper screens), fusuma (painted sliding doors), window
 * (round window with a view), tokonoma (alcove with a hanging scroll) and
 * boards (plain wooden wall, used in the entrance).
 */
export const WALL_PANELS = {
  left: [
    { u0: 0, u1: 2, kind: 'fusuma' },
    { u0: 2, u1: 5, kind: 'window' },
    { u0: 5, u1: 6, kind: 'shoji' },
  ],
  right: [
    { u0: 0, u1: 1, kind: 'shoji' },
    { u0: 1, u1: 3, kind: 'tokonoma' },
    { u0: 3, u1: 7, kind: 'fusuma' },
    { u0: 7, u1: 8, kind: 'shoji' },
    { u0: 8, u1: 11, kind: 'boards' },
  ],
};

/** An item's size in tiles after rotation: { w, d }. */
export function itemSize(item) {
  const w = item.w || 1;
  const d = item.d || 1;
  return (item.rot || 0) % 2 ? { w: d, d: w } : { w, d };
}

/** The tiles an item covers, e.g. a 2x1 table covers two tiles. */
export function itemTiles(item) {
  const { w, d } = itemSize(item);
  const tiles = [];
  for (let dy = 0; dy < d; dy++) {
    for (let dx = 0; dx < w; dx++) tiles.push({ gx: item.gx + dx, gy: item.gy + dy });
  }
  return tiles;
}
