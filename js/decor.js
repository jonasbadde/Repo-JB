// What sits in the building: furniture, garden objects and what is painted
// or hung on the back walls. Pure data like room.js; decorRenderer.js and
// wallRenderer.js do the drawing.
//
// Each item stands on a tile (gx, gy). Items bigger than one tile give
// their size in tiles with w (along gx) and d (along gy). These are
// decoration only for now; picking things up comes in roadmap step 4.

export const DECOR = [
  // Main room: a low table with a cushion on each long side.
  { type: 'table', gx: 3, gy: 2, w: 2, d: 1 },
  { type: 'cushion', gx: 3, gy: 1 },
  { type: 'cushion', gx: 4, gy: 1 },
  { type: 'cushion', gx: 3, gy: 3 },
  { type: 'cushion', gx: 4, gy: 3 },
  { type: 'vase', gx: 2, gy: 0 }, // ikebana in the tokonoma

  // Paper lanterns (andon) in the room and on the veranda.
  { type: 'paperLantern', gx: 0, gy: 4, glow: 1 },
  { type: 'paperLantern', gx: 7, gy: 7, glow: 1 },

  // Garden.
  { type: 'stoneLantern', gx: 10, gy: 8, glow: 0.7 },
  { type: 'maple', gx: 7, gy: 10 },
];

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

/** The tiles an item covers, e.g. a 2x1 table covers two tiles. */
export function itemTiles(item) {
  const tiles = [];
  for (let dy = 0; dy < (item.d || 1); dy++) {
    for (let dx = 0; dx < (item.w || 1); dx++) tiles.push({ gx: item.gx + dx, gy: item.gy + dy });
  }
  return tiles;
}
