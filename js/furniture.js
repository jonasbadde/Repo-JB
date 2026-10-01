// Furniture rules: what can be moved, where it may go, and saving the
// layout. Pure logic, no drawing or DOM, so it can be tested with Node.
//
// The current layout is room.items (furniture standing in the house) and
// room.tray (furniture that has been picked up).
import { DECOR, itemTiles } from './decor.js';
import { tileAt, refreshWalkable, canStepBetween } from './room.js';

// Things you can move. The vase belongs in the tokonoma, and the stone
// lantern and maple are part of the garden map, so those stay put.
export const MOVABLE = new Set(['table', 'cushion', 'paperLantern']);

// Things that look the same from every side, so rotating them does nothing.
export const ROUND = new Set(['paperLantern']);

// Furniture stays indoors or on the roofed veranda.
const AREAS = new Set(['main', 'genkan', 'engawa']);

const SAVE_KEY = 'teaHouse.furniture.v1';

/** The item standing on tile (gx, gy), or null. */
export function itemAt(room, gx, gy) {
  return room.items.find((item) => itemTiles(item).some((t) => t.gx === gx && t.gy === gy)) || null;
}

/**
 * Could `item` stand at (gx, gy) turned `rot`? `avoid` lists tiles that
 * must stay free (where the avatar is). The item itself may already be in
 * the room; it is ignored when checking for overlaps.
 * Returns { ok: true } or { ok: false, reason } with a short reason to show.
 */
export function checkPlace(room, item, gx, gy, rot, avoid = []) {
  const trial = { ...item, gx, gy, rot };
  for (const { gx: x, gy: y } of itemTiles(trial)) {
    const tile = tileAt(room, x, y);
    if (!tile || !AREAS.has(tile.area) || !tile.floorWalkable) return { ok: false, reason: "can't go here" };
    const other = itemAt(room, x, y);
    if (other && other !== item) return { ok: false, reason: 'something is in the way' };
    if (avoid.some((t) => t && t.gx === x && t.gy === y)) return { ok: false, reason: 'you are standing there' };
  }
  if (!keepsFloorConnected(room, item, trial)) return { ok: false, reason: 'that would block the way' };
  return { ok: true };
}

/**
 * Put the item at (gx, gy) turned rot (it may come from the room or the
 * tray). Call checkPlace first.
 */
export function place(room, item, gx, gy, rot) {
  room.tray = room.tray.filter((t) => t !== item);
  if (!room.items.includes(item)) room.items.push(item);
  Object.assign(item, { gx, gy, rot });
  refreshWalkable(room);
}

/** Pick the item up into the tray. */
export function pickUp(room, item) {
  room.items = room.items.filter((t) => t !== item);
  if (!room.tray.includes(item)) room.tray.push(item);
  refreshWalkable(room);
}

/** Take the item out of the room without putting it in the tray (while it's being moved). */
export function lift(room, item) {
  room.items = room.items.filter((t) => t !== item);
  refreshWalkable(room);
}

/**
 * Would the floor still be in one piece with `trial` instead of `item`?
 * Every walkable tile must stay reachable from every other, so furniture
 * can never shut the avatar in or block the only doorway. We try the
 * change, flood-fill from one walkable tile, then put everything back.
 */
function keepsFloorConnected(room, item, trial) {
  const saved = room.items;
  room.items = [...saved.filter((t) => t !== item), trial];
  refreshWalkable(room);
  const ok = floorIsConnected(room);
  room.items = saved;
  refreshWalkable(room);
  return ok;
}

export function floorIsConnected(room) {
  const walkable = room.tiles.filter((t) => t.walkable);
  if (!walkable.length) return true;
  const seen = new Set([walkable[0]]);
  const queue = [walkable[0]];
  while (queue.length) {
    const t = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = tileAt(room, t.gx + dx, t.gy + dy);
      if (n && !seen.has(n) && canStepBetween(room, t, n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen.size === walkable.length;
}

// ---------------------------------------------------------------------------
// Saving in the browser (localStorage). Every access is wrapped in try,
// because storage can be switched off (private windows, blocked cookies).

export function saveLayout(room) {
  const data = {
    items: room.items.filter((i) => MOVABLE.has(i.type)).map(({ id, gx, gy, rot }) => ({ id, gx, gy, rot })),
    tray: room.tray.map((i) => i.id),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Not saved; the layout still works for this visit.
  }
}

/** Load the saved layout, if there is one and it is still valid. */
export function loadLayout(room) {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return;
  }
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.tray)) return;
  const fresh = DECOR.map((item) => ({ ...item }));
  const byId = new Map(fresh.map((item) => [item.id, item]));
  const items = fresh.filter((item) => !MOVABLE.has(item.type)); // fixed things
  const tray = [];
  const used = new Set(); // each item may appear only once
  const take = (id) => {
    const item = byId.get(id);
    if (!item || !MOVABLE.has(item.type) || used.has(id)) return null;
    used.add(id);
    return item;
  };
  for (const { id, gx, gy, rot } of data.items) {
    const item = take(id);
    if (!item || !Number.isInteger(gx) || !Number.isInteger(gy) || !Number.isInteger(rot)) return;
    items.push(Object.assign(item, { gx, gy, rot: ((rot % 4) + 4) % 4 }));
  }
  for (const id of data.tray) {
    const item = take(id);
    if (!item) return;
    tray.push(item);
  }

  // Only accept the save if every piece of furniture is still somewhere
  // it would be allowed now (the map may have changed since).
  const before = { items: room.items, tray: room.tray };
  room.items = items;
  room.tray = tray;
  refreshWalkable(room);
  const valid = items
    .filter((i) => MOVABLE.has(i.type))
    .every((i) => checkPlace(room, i, i.gx, i.gy, i.rot).ok);
  if (!valid) {
    Object.assign(room, before);
    refreshWalkable(room);
  }
}

/** Back to the layout in decor.js, and forget the saved one. */
export function resetLayout(room) {
  room.items = DECOR.map((item) => ({ ...item }));
  room.tray = [];
  refreshWalkable(room);
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to forget.
  }
}
