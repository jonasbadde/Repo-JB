// Editing furniture with the mouse: click a piece to select it, then use
// its little menu to Move, Rotate or Pick it up. The rules for where things
// may go are in furniture.js; this file handles clicks, keys and the menu.
import { gridToScreen, pointInPolygon } from './iso.js';
import { tileAt } from './room.js';
import { itemSize } from './decor.js';
import { MOVABLE, ROUND, checkPlace, place, lift } from './furniture.js';
import { furnitureChanged } from './avatar.js';

// How tall each kind of furniture is, and how far its outline is inset
// from the tile edges, so clicking hits the piece and not the empty floor.
const SHAPE = {
  table: { height: 16, inset: 0.1 },
  cushion: { height: 5, inset: 0.15 },
  paperLantern: { height: 45, inset: 0.3 },
};

// The menu floats at least this high, so it clears a sitting avatar's head.
const MENU_LIFT = 40;

const MESSAGE_TIME = 2500; // ms a "can't place" message stays in the HUD

export function createFurnitureEditor(room, avatar) {
  const menu = document.getElementById('furni-menu');
  const edit = {
    selected: null, // the item whose menu is open
    moving: null, // { item, from } while an item follows the mouse; from = where it was
    ghost: null, // { item, gx, gy, rot, ok } where the moving item would land
    message: null, // { text, until }
  };

  const say = (text) => (edit.message = { text, until: performance.now() + MESSAGE_TIME });
  // The avatar's tiles must stay free: where it stands and where it is stepping to.
  const avoid = () => [avatar.tile, avatar.next];
  const changed = () => furnitureChanged(avatar, room);

  function startMoving(item) {
    edit.moving = { item, from: { gx: item.gx, gy: item.gy, rot: item.rot } };
    edit.selected = null;
    lift(room, item);
    changed();
  }

  function drop() {
    const g = edit.ghost;
    if (!g) return;
    if (!g.ok) {
      say(`Can't put it there: ${g.reason}`);
      return;
    }
    place(room, g.item, g.gx, g.gy, g.rot);
    edit.moving = null;
    edit.ghost = null;
    changed();
  }

  /** Turn the selected item a quarter turn where it stands, if the turned shape fits. */
  function rotate(item) {
    const rot = ((item.rot || 0) + 1) % 4;
    // A cushion keeps the same tile when turned, so it may turn under the avatar.
    const check = checkPlace(room, item, item.gx, item.gy, rot, item.type === 'cushion' ? [] : avoid());
    if (!check.ok) {
      say(`Can't turn it: ${check.reason}`);
      return;
    }
    place(room, item, item.gx, item.gy, rot);
    changed();
  }

  function cancelMove() {
    const { item, from } = edit.moving;
    // Put it back where it was, unless the avatar has walked onto that spot.
    const back = checkPlace(room, item, from.gx, from.gy, from.rot, avoid());
    if (back.ok) place(room, item, from.gx, from.gy, from.rot);
    edit.moving = null;
    edit.ghost = null;
    changed();
  }

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('button')?.dataset.action;
    const item = edit.selected;
    if (!item) return;
    if (action === 'move') startMoving(item);
    if (action === 'rotate') rotate(item);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      // Turn the item being moved, or the selected one.
      if (edit.moving && !ROUND.has(edit.moving.item.type) && edit.ghost) edit.ghost.rot = (edit.ghost.rot + 1) % 4;
      else if (edit.selected && !ROUND.has(edit.selected.type)) rotate(edit.selected);
    }
    if (e.key === 'Escape') {
      if (edit.moving) cancelMove();
      edit.selected = null;
    }
  });

  return {
    edit,

    /**
     * Handle a click on the canvas. Returns true if the click was used for
     * furniture and the avatar should not react to it.
     */
    click(point, origin) {
      if (edit.moving) {
        drop();
        return true;
      }
      edit.selected = pickItem(room, origin, point);
      return false;
    },

    /** The item a click at `point` would select, or null. */
    pick: (point, origin) => pickItem(room, origin, point),

    /** Called every frame: follow the mouse with the ghost and keep the menu on its item. */
    update(origin, hovered) {
      if (edit.moving) {
        const { item } = edit.moving;
        const rot = edit.ghost ? edit.ghost.rot : item.rot;
        edit.ghost = hovered && {
          item,
          gx: hovered.gx,
          gy: hovered.gy,
          rot,
          ...checkPlace(room, item, hovered.gx, hovered.gy, rot, avoid()),
        };
      }
      const item = edit.selected;
      menu.hidden = !item;
      if (item) {
        menu.querySelector('[data-action=rotate]').disabled = ROUND.has(item.type);
        const { w, d } = itemSize(item);
        const floor = tileAt(room, item.gx, item.gy).height;
        const top = gridToScreen(item.gx + w / 2, item.gy + d / 2, origin, floor + Math.max(SHAPE[item.type].height, MENU_LIFT) + 12);
        menu.style.left = `${top.x}px`;
        menu.style.top = `${top.y}px`;
      }
    },

    /** Text for the HUD while editing, or null to show the normal tile info. */
    hudText(now) {
      if (edit.message && now < edit.message.until) return edit.message.text;
      if (edit.moving) {
        const turn = ROUND.has(edit.moving.item.type) ? '' : ' · R turns it';
        return `Placing ${NAMES[edit.moving.item.type]} · click to put it down${turn} · Esc cancels`;
      }
      return null;
    },
  };
}

export const NAMES = { table: 'the table', cushion: 'a cushion', paperLantern: 'a paper lantern' };

/**
 * The movable item under screen point p, nearest first. Each item's
 * outline is its footprint raised to its height, like a box seen from the
 * camera, so you can click anywhere on the piece.
 */
function pickItem(room, origin, p) {
  const front = (item) => item.gx + item.gy + itemSize(item).w + itemSize(item).d;
  const items = room.items.filter((i) => MOVABLE.has(i.type)).sort((a, b) => front(b) - front(a));
  return items.find((item) => pointInPolygon(p, itemShape(room, item, origin))) || null;
}

function itemShape(room, item, origin) {
  const { w, d } = itemSize(item);
  const { height, inset: m } = SHAPE[item.type];
  const floor = tileAt(room, item.gx, item.gy).height;
  const at = (x, y, h) => gridToScreen(item.gx + x, item.gy + y, origin, h);
  const top = floor + height;
  return [at(m, m, top), at(w - m, m, top), at(w - m, m, floor), at(w - m, d - m, floor), at(m, d - m, floor), at(m, d - m, top)];
}
