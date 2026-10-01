// The avatar: where it is, where it is walking to, and how it moves there.
// Pure state and movement, no drawing (that is in avatarRenderer.js).
//
// Position is kept in grid coordinates (x, y) that slide smoothly from one
// tile to the next, plus a height h above the ground, so the avatar can be
// drawn between tiles and between floor heights.
import { tileAt, MAX_STEP } from './room.js';
import { pathToClick } from './pathfinding.js';

const SPEED = 2.5; // tiles per second
const STRIDE = 0.8; // tiles walked per full walk cycle (left + right foot)
const HOP = 6; // extra lift in pixels for a step taller than MAX_STEP (the shoe stone)

export function createAvatar(room, gx, gy) {
  const tile = tileAt(room, gx, gy);
  return {
    x: gx,
    y: gy,
    h: tile.height,
    tile, // the tile it stands on, or is walking away from
    next: null, // the tile it is walking to right now
    progress: 0, // 0..1 along the step from tile to next
    path: [], // tiles still to walk after `next`
    facing: [1, 1], // grid direction it looks in
    walking: false,
    phase: 0, // walk cycle, in radians
  };
}

/**
 * Start walking towards the clicked tile. Returns the planned tiles (for
 * showing the path), or null if there is nowhere to go. If the avatar is in
 * the middle of a step it finishes that step first, so it never cuts
 * across a tile edge it wasn't allowed to.
 */
export function walkTo(avatar, room, target) {
  const from = avatar.next || avatar.tile;
  const plan = pathToClick(room, from, target);
  if (!plan) return null;
  avatar.path = plan.tiles;
  return avatar.next ? [avatar.next, ...plan.tiles] : plan.tiles;
}

/** Move the avatar along its path; dt is the time since the last frame in ms. */
export function updateAvatar(avatar, dt) {
  let distance = (SPEED * dt) / 1000; // tiles to cover this frame
  while (distance > 0) {
    if (!avatar.next) {
      if (!avatar.path.length) break;
      avatar.next = avatar.path.shift();
      avatar.progress = 0;
      avatar.facing = [avatar.next.gx - avatar.tile.gx, avatar.next.gy - avatar.tile.gy];
      avatar.walking = true;
    }
    const length = Math.hypot(...avatar.facing); // 1, or √2 for a diagonal step
    const used = Math.min(distance, (1 - avatar.progress) * length);
    avatar.progress += used / length;
    avatar.phase += (used / STRIDE) * Math.PI * 2;
    distance -= used;
    if (avatar.progress >= 1 - 1e-9) {
      avatar.tile = avatar.next;
      avatar.next = null;
    }
  }
  if (!avatar.next && !avatar.path.length && avatar.walking) {
    avatar.walking = false;
    avatar.phase = 0;
  }
  place(avatar);
}

/** Set x, y and h from the current step. */
function place(avatar) {
  const a = avatar.tile;
  const b = avatar.next || a;
  const t = avatar.progress;
  avatar.x = a.gx + (b.gx - a.gx) * t;
  avatar.y = a.gy + (b.gy - a.gy) * t;
  // Ease the height in and out so stepping up or down looks like a step
  // rather than a ramp. A big step gets a little hop on top.
  const ease = t * t * (3 - 2 * t);
  const hop = Math.abs(b.height - a.height) > MAX_STEP ? Math.sin(Math.PI * t) * HOP : 0;
  avatar.h = a.height + (b.height - a.height) * ease + hop;
}

/**
 * The gx + gy depth to draw the avatar at. While walking it uses the nearer
 * of the two tiles, so it is drawn on top of both floors but still behind
 * anything standing further forward.
 */
export function avatarDepth(avatar) {
  const a = avatar.tile;
  const b = avatar.next || a;
  return Math.max(a.gx + a.gy, b.gx + b.gy);
}
