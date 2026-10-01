// Checks for the avatar's pathfinding. No libraries needed:
//   node tests/pathfinding.test.mjs
import assert from 'node:assert/strict';
import { createRoom, tileAt } from '../js/room.js';
import { findPath, pathToClick, stepFrom } from '../js/pathfinding.js';

const room = createRoom();
const at = (gx, gy) => tileAt(room, gx, gy);
const names = (path) => path.tiles.map((t) => `${t.gx},${t.gy}`);
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}

/** Every step of a path must be one the avatar is allowed to take. */
function assertValid(start, path) {
  let prev = start;
  for (const t of path.tiles) {
    const dx = t.gx - prev.gx;
    const dy = t.gy - prev.gy;
    assert.ok(Math.abs(dx) <= 1 && Math.abs(dy) <= 1, `jump ${prev.gx},${prev.gy} -> ${t.gx},${t.gy}`);
    assert.equal(stepFrom(room, prev, dx, dy), t, `illegal step ${prev.gx},${prev.gy} -> ${t.gx},${t.gy}`);
    prev = t;
  }
}

test('genkan to a cushion goes through the fusuma doorway', () => {
  const path = findPath(room, at(9, 1), at(3, 3));
  assert.ok(path);
  assertValid(at(9, 1), path);
  assert.deepEqual(names(path).slice(-1), ['3,3']);
  assert.ok(names(path).includes('7,2') && names(path).includes('8,2'), names(path).join(' '));
});

test('cushion to the pond side of the garden uses the shoe stone', () => {
  const path = findPath(room, at(3, 3), at(0, 9));
  assert.ok(path);
  assertValid(at(3, 3), path);
  const s = names(path).join(' ');
  assert.ok(s.includes('2,7 2,8'), s);
});

test('the engawa is too high to step off anywhere but the shoe stone', () => {
  assert.equal(stepFrom(room, at(4, 7), 0, 1), null);
  assert.equal(stepFrom(room, at(1, 7), 1, 1), null); // diagonally onto the stone
  assert.equal(stepFrom(room, at(2, 7), 0, 1), at(2, 8));
});

test('no cutting corners past walls or furniture', () => {
  assert.equal(stepFrom(room, at(7, 1), 1, 1), null); // around the fusuma doorway
  assert.equal(stepFrom(room, at(7, 3), 1, -1), null);
  assert.equal(stepFrom(room, at(2, 1), 1, 1), null); // past the table corner
  assert.equal(stepFrom(room, at(2, 5), 1, 1), at(3, 6)); // wide shoji opening is fine
});

test('clicking a blocked tile walks next to it', () => {
  for (const [gx, gy] of [[3, 2], [2, 10], [1, 0], [7, 10]]) {
    const path = pathToClick(room, at(9, 1), at(gx, gy));
    assert.ok(path, `no path for ${gx},${gy}`);
    assertValid(at(9, 1), path);
    const end = path.tiles[path.tiles.length - 1];
    assert.ok(Math.abs(end.gx - gx) <= 1 && Math.abs(end.gy - gy) <= 1, `ended at ${end.gx},${end.gy}`);
  }
});

test('clicking where you stand is an empty walk', () => {
  assert.deepEqual(pathToClick(room, at(9, 1), at(9, 1)).tiles, []);
});

if (failures) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall passed');
