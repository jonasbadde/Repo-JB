// Pathfinding: the shortest walk between two tiles, using A* ("A star").
//
// A* explores tiles outwards from the start, always continuing from the
// tile that looks cheapest so far: the distance already walked to it plus
// a guess of the distance still to go. As long as the guess never
// overestimates, the first time we reach the goal is along a shortest path.
//
// The avatar can walk in 8 directions. Straight steps cost 1, diagonal
// steps cost √2 (they are longer). Whether a single step is allowed is
// decided by canStepBetween in room.js, so walls, doorways, furniture and
// height differences are all handled there.
import { tileAt, canStepBetween } from './room.js';

const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1], // straight
  [1, 1], [1, -1], [-1, 1], [-1, -1], // diagonal
];

/**
 * The tile reached by stepping (dx, dy) from tile a, or null if that step
 * isn't allowed. A diagonal step is only allowed if both straight two-step
 * routes around the corner are allowed too, so the avatar never squeezes
 * past the end of a wall or the corner of a table.
 */
export function stepFrom(room, a, dx, dy) {
  const b = tileAt(room, a.gx + dx, a.gy + dy);
  if (!b) return null;
  if (dx === 0 || dy === 0) return canStepBetween(room, a, b) ? b : null;
  const viaX = tileAt(room, a.gx + dx, a.gy);
  const viaY = tileAt(room, a.gx, a.gy + dy);
  const ok =
    canStepBetween(room, a, viaX) && canStepBetween(room, viaX, b) &&
    canStepBetween(room, a, viaY) && canStepBetween(room, viaY, b);
  return ok ? b : null;
}

/**
 * Guess of the remaining distance ("octile distance"): go diagonally as
 * far as possible, then straight. It is exact on an empty floor and never
 * too high, which is what A* needs.
 */
function estimate(a, b) {
  const dx = Math.abs(a.gx - b.gx);
  const dy = Math.abs(a.gy - b.gy);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * Shortest path from tile `start` to tile `goal`.
 * Returns { tiles, cost }, where tiles lists every tile after the start up
 * to and including the goal, or null if the goal can't be reached.
 */
export function findPath(room, start, goal) {
  if (!goal.walkable) return null;
  const key = (t) => t.gy * room.width + t.gx;
  const cost = new Map([[key(start), 0]]); // cheapest known cost to each tile
  const cameFrom = new Map();
  const open = [start]; // tiles waiting to be explored

  while (open.length) {
    // Take the most promising tile. The map is tiny, so a plain scan is
    // fast enough and simpler than a priority queue.
    let best = 0;
    const score = (t) => cost.get(key(t)) + estimate(t, goal);
    for (let i = 1; i < open.length; i++) if (score(open[i]) < score(open[best])) best = i;
    const tile = open.splice(best, 1)[0];

    if (tile === goal) {
      const tiles = [];
      for (let t = goal; t !== start; t = cameFrom.get(key(t))) tiles.unshift(t);
      return { tiles, cost: cost.get(key(goal)) };
    }

    for (const [dx, dy] of DIRECTIONS) {
      const next = stepFrom(room, tile, dx, dy);
      if (!next) continue;
      const c = cost.get(key(tile)) + (dx && dy ? Math.SQRT2 : 1);
      if (c >= (cost.get(key(next)) ?? Infinity)) continue;
      cost.set(key(next), c);
      cameFrom.set(key(next), tile);
      if (!open.includes(next)) open.push(next);
    }
  }
  return null;
}

/**
 * Where to walk when the player clicks `target`: the target itself if the
 * avatar can get there, otherwise the reachable tile next to it with the
 * shortest walk (straight neighbours win ties over diagonal ones, because
 * they are closer to what was clicked). Returns { tiles, cost } or null.
 */
export function pathToClick(room, start, target) {
  const direct = findPath(room, start, target);
  if (direct) return direct;

  let best = null;
  for (const [dx, dy] of DIRECTIONS) {
    const n = tileAt(room, target.gx + dx, target.gy + dy);
    const path = n && (n === start ? { tiles: [], cost: 0 } : findPath(room, start, n));
    if (path && (!best || path.cost < best.cost - 1e-9)) best = path;
  }
  return best;
}
