// Draws the whole scene in the right order.
//
// The painter's algorithm: paint far things first and near things last, so
// near things cover far ones. In this isometric view "far" means a small
// gx + gy, so every floor tile, wall and object gets a depth number based on
// that sum and we draw them sorted by it. The avatar is in the same list,
// so walls, the table and the maple hide it when it walks behind them.
import { tileCorners, gridToScreen } from './iso.js';
import { tilesInDrawOrder, tileAt } from './room.js';
import { drawTile } from './floorRenderer.js';
import { drawBackWalls, drawLowWall, drawEavePost } from './wallRenderer.js';
import { drawGround, frontFences } from './ground.js';
import { drawItem, drawItemAt } from './decorRenderer.js';
import { drawAvatar, drawPathDot } from './avatarRenderer.js';
import { avatarDepth } from './avatar.js';
import { itemTiles, FACING } from './decor.js';
import { fillPolygon, strokePolygon } from './draw.js';
import { PALETTE as P } from './palette.js';

// Small offsets that decide the order of things at the same gx + gy:
// floor first, then the hover highlight, then objects, then the avatar (so
// it sits on top of a cushion), and a front wall last because it stands on
// the tile's near edge.
const ORDER = { tile: 0, highlight: 0.1, object: 0.6, avatar: 0.7, wall: 0.8 };

/**
 * Extra things to draw: `selected` is the furniture whose menu is open,
 * `ghost` = { item, gx, gy, rot, ok } is furniture being moved.
 */
export function drawScene(ctx, room, origin, { hovered, time, avatar, dots = [], selected = null, ghost = null }) {
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
  for (const item of room.items) {
    // A big item is drawn with its front-most tile, so everything behind it
    // is already painted.
    const front = Math.max(...itemTiles(item).map((t) => t.gx + t.gy));
    list.push({ depth: front + ORDER.object, draw: () => drawItem(ctx, room, item, origin) });
  }
  for (const fence of frontFences(room, origin)) list.push({ depth: fence.depth, draw: () => fence.draw(ctx) });
  list.push({ depth: 7 + ORDER.wall + 0.1, draw: () => drawEavePost(ctx, room, origin) });
  list.push({ depth: avatarDepth(avatar) + ORDER.avatar, draw: () => drawAvatar(ctx, avatar, origin) });
  // Path dots lie on the floor, so furniture and walls in front hide them.
  for (const { tile, alpha } of dots) {
    list.push({ depth: tile.gx + tile.gy + ORDER.highlight, draw: () => drawPathDot(ctx, tile, origin, alpha) });
  }
  if (selected) {
    for (const t of itemTiles(selected)) {
      const tile = tileAt(room, t.gx, t.gy);
      list.push({ depth: tile.gx + tile.gy + ORDER.highlight, draw: () => strokePolygon(ctx, corners(tile, origin), P.hoverStroke, 2) });
    }
    if (selected.type === 'cushion') list.push({ depth: depthOf(selected) + ORDER.object + 0.05, draw: () => drawFacing(ctx, room, selected, origin) });
  }
  if (ghost) {
    addGhost(list, ctx, room, ghost, origin);
  } else if (hovered) {
    const tile = tileAt(room, hovered.gx, hovered.gy);
    list.push({ depth: tile.gx + tile.gy + ORDER.highlight, draw: () => drawHighlight(ctx, tile, origin) });
  }

  // sort() keeps equal depths in the order they were added.
  list.sort((a, b) => a.depth - b.depth);
  for (const item of list) item.draw();
}

/** gx + gy of an item's front-most tile. */
function depthOf(item) {
  return Math.max(...itemTiles(item).map((t) => t.gx + t.gy));
}

function corners(tile, origin) {
  return tileCorners(tile.gx, tile.gy, origin, tile.height);
}

/** A see-through copy of the moving item, over a green (fits) or red (doesn't) footprint. */
function addGhost(list, ctx, room, ghost, origin) {
  const item = { ...ghost.item, gx: ghost.gx, gy: ghost.gy, rot: ghost.rot };
  for (const t of itemTiles(item)) {
    const tile = tileAt(room, t.gx, t.gy);
    if (!tile) continue;
    list.push({
      depth: tile.gx + tile.gy + ORDER.highlight,
      draw: () => {
        fillPolygon(ctx, corners(tile, origin), ghost.ok ? P.placeOk : P.placeBad);
        strokePolygon(ctx, corners(tile, origin), ghost.ok ? P.placeOkStroke : P.hoverBlocked, 2);
      },
    });
  }
  const floor = tileAt(room, ghost.gx, ghost.gy).height;
  list.push({
    depth: depthOf(item) + ORDER.avatar + 0.05, // in front of the avatar, so it's never lost behind it
    draw: () => {
      ctx.globalAlpha = 0.6;
      drawItemAt(ctx, item, origin, floor);
      if (item.type === 'cushion') drawFacing(ctx, room, item, origin);
      ctx.globalAlpha = 1;
    },
  });
}

/** A small arrow on a cushion: the way you face when sitting on it. */
function drawFacing(ctx, room, item, origin) {
  const [dx, dy] = FACING[item.rot || 0];
  const h = tileAt(room, item.gx, item.gy).height + 6;
  const at = (along, side) =>
    gridToScreen(item.gx + 0.5 + dx * along - dy * side, item.gy + 0.5 + dy * along + dx * side, origin, h);
  fillPolygon(ctx, [at(0.28, 0), at(0.06, 0.14), at(0.06, -0.14)], P.hoverStroke);
}

function drawHighlight(ctx, tile, origin) {
  const corners = tileCorners(tile.gx, tile.gy, origin, tile.height);
  fillPolygon(ctx, corners, P.hoverFill);
  strokePolygon(ctx, corners, tile.walkable ? P.hoverStroke : P.hoverBlocked, 2);
}
