// Draws the whole scene in the right order.
//
// The painter's algorithm: paint far things first and near things last, so
// near things cover far ones. In this isometric view "far" means a small
// gx + gy, so every floor tile, wall and object gets a depth number based on
// that sum and we draw them sorted by it. The avatar will join this list in
// the next step.
import { tileCorners } from './iso.js';
import { tilesInDrawOrder, tileAt } from './room.js';
import { drawTile } from './floorRenderer.js';
import { drawBackWalls, drawLowWall, drawEavePost } from './wallRenderer.js';
import { drawGround, frontFences } from './ground.js';
import { drawItem } from './decorRenderer.js';
import { DECOR, itemTiles } from './decor.js';
import { fillPolygon, strokePolygon } from './draw.js';
import { PALETTE as P } from './palette.js';

// Small offsets that decide the order of things at the same gx + gy:
// floor first, then the hover highlight, then objects, and a front wall
// last because it stands on the tile's near edge.
const ORDER = { tile: 0, highlight: 0.1, object: 0.6, wall: 0.8 };

export function drawScene(ctx, room, origin, { hovered, time }) {
  // Things that are behind everything else don't need sorting.
  drawGround(ctx, room, origin);
  drawBackWalls(ctx, room, origin);

  const list = [];
  for (const tile of tilesInDrawOrder(room)) {
    list.push({ depth: tile.gx + tile.gy + ORDER.tile, draw: () => drawTile(ctx, room, tile, origin, time) });
  }
  for (const wall of room.walls) {
    if (wall.back) continue;
    list.push({ depth: wall.gx + wall.gy + ORDER.wall, draw: () => drawLowWall(ctx, room, wall, origin) });
  }
  for (const item of DECOR) {
    // A big item is drawn with its front-most tile, so everything behind it
    // is already painted.
    const front = Math.max(...itemTiles(item).map((t) => t.gx + t.gy));
    list.push({ depth: front + ORDER.object, draw: () => drawItem(ctx, room, item, origin) });
  }
  for (const fence of frontFences(room, origin)) list.push({ depth: fence.depth, draw: () => fence.draw(ctx) });
  list.push({ depth: 7 + ORDER.wall + 0.1, draw: () => drawEavePost(ctx, room, origin) });
  if (hovered) {
    const tile = tileAt(room, hovered.gx, hovered.gy);
    list.push({ depth: tile.gx + tile.gy + ORDER.highlight, draw: () => drawHighlight(ctx, tile, origin) });
  }

  // sort() keeps equal depths in the order they were added.
  list.sort((a, b) => a.depth - b.depth);
  for (const item of list) item.draw();
}

function drawHighlight(ctx, tile, origin) {
  const corners = tileCorners(tile.gx, tile.gy, origin, tile.height);
  fillPolygon(ctx, corners, P.hoverFill);
  strokePolygon(ctx, corners, tile.walkable ? P.hoverStroke : P.hoverBlocked, 2);
}
