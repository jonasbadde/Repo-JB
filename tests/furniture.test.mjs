// Checks for moving furniture. Run with: node tests/furniture.test.mjs
import assert from 'node:assert/strict';
import { test, finish } from './test.mjs';
import { createRoom, tileAt } from '../js/room.js';
import { checkPlace, place, pickUp, itemAt, floorIsConnected, loadLayout, saveLayout } from '../js/furniture.js';

const fresh = () => createRoom();
const byId = (room, id) => room.items.find((i) => i.id === id) || room.tray.find((i) => i.id === id);

test('the starting layout keeps the whole floor connected', () => {
  assert.ok(floorIsConnected(fresh()));
});

test('a lantern can move to a free tatami tile, which then blocks walking', () => {
  const room = fresh();
  const lantern = byId(room, 'andon-1');
  assert.ok(checkPlace(room, lantern, 6, 4, 0).ok);
  place(room, lantern, 6, 4, 0);
  assert.equal(tileAt(room, 6, 4).walkable, false);
  assert.equal(tileAt(room, 0, 4).walkable, true);
});

test('furniture stays indoors, off the tokonoma and off other furniture', () => {
  const room = fresh();
  const lantern = byId(room, 'andon-1');
  assert.equal(checkPlace(room, lantern, 5, 9, 0).reason, "can't go here"); // garden
  assert.equal(checkPlace(room, lantern, 1, 0, 0).reason, "can't go here"); // tokonoma
  assert.equal(checkPlace(room, lantern, 3, 1, 0).reason, 'something is in the way'); // a cushion
  assert.equal(checkPlace(room, lantern, 9, 1, 0, [tileAt(room, 9, 1)]).reason, 'you are standing there');
});

test('furniture may not block the only way through', () => {
  const room = fresh();
  const lantern = byId(room, 'andon-1');
  // The back corner (0,0) sits beside the tokonoma, so (0,1) is its only way out.
  assert.equal(checkPlace(room, lantern, 0, 1, 0).reason, 'that would block the way');
  // The doorway into the genkan is fine: the house has a loop through the
  // front door, the garden and the shoe stone.
  assert.ok(checkPlace(room, lantern, 8, 2, 0).ok);
});

test('rotating the table turns its footprint', () => {
  const room = fresh();
  const table = byId(room, 'table');
  // Turned in place, the table would cover (3,2) and (3,3); (3,3) has a cushion.
  assert.equal(checkPlace(room, table, 3, 2, 1).reason, 'something is in the way');
  assert.ok(checkPlace(room, table, 6, 2, 1).ok);
  place(room, table, 6, 2, 1);
  assert.equal(itemAt(room, 6, 3), table);
  assert.equal(itemAt(room, 7, 2), null);
});

test('the table may not straddle a step between floors', () => {
  const room = fresh();
  const table = byId(room, 'table');
  assert.equal(checkPlace(room, table, 6, 5, 1).reason, "the floor isn't level"); // tatami (6,5) + engawa (6,6)
});

test('picking up moves an item to the tray and frees its tiles', () => {
  const room = fresh();
  const table = byId(room, 'table');
  pickUp(room, table);
  assert.deepEqual(room.tray, [table]);
  assert.equal(tileAt(room, 3, 2).walkable, true);
  assert.ok(checkPlace(room, table, 3, 2, 0).ok);
});

test('a saved layout loads back, and a broken one is ignored', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const room = fresh();
  place(room, byId(room, 'andon-1'), 6, 4, 0);
  pickUp(room, byId(room, 'cushion-1'));
  saveLayout(room);

  const again = fresh();
  loadLayout(again);
  assert.equal(itemAt(again, 6, 4)?.id, 'andon-1');
  assert.deepEqual(again.tray.map((i) => i.id), ['cushion-1']);

  store.set('teaHouse.furniture.v1', JSON.stringify({ items: [{ id: 'table', gx: 5, gy: 9, rot: 0 }], tray: [] }));
  const broken = fresh();
  loadLayout(broken);
  assert.equal(itemAt(broken, 3, 2)?.id, 'table'); // a table in the garden: kept the default
});

test("a saved layout can't put furniture where the avatar starts", () => {
  const store = new Map([['teaHouse.furniture.v1', JSON.stringify({ items: [{ id: 'andon-1', gx: 9, gy: 1, rot: 0 }], tray: [] })]]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem() {}, removeItem() {} };
  const room = fresh();
  loadLayout(room, [{ gx: 9, gy: 1 }]);
  assert.equal(itemAt(room, 0, 4)?.id, 'andon-1'); // stayed at the default
});

finish();
