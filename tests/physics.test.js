const test = require('node:test');
const assert = require('node:assert/strict');
const { World } = require('../js/world.js');
const { IDS, MATERIALS } = require('../js/materials.js');
const { seeded, run, positions } = require('./helpers.js');

const { SAND, WATER, STONE, WOOD, SMOKE, OIL, STEAM, TNT } = IDS;

test('sand falls to the floor', () => {
  const world = new World(5, 6, seeded(1));
  world.set(2, 0, SAND);
  run(world, 10);
  assert.equal(world.get(2, 5), SAND);
  assert.equal(world.count(SAND), 1);
});

test('sand falls one cell per step, not further', () => {
  const world = new World(3, 10, seeded(1));
  world.set(1, 0, SAND);
  run(world, 3);
  assert.equal(world.get(1, 3), SAND);
});

test('sand forms a stable pile', () => {
  const world = new World(7, 12, seeded(2));
  for (let y = 0; y < 10; y++) world.set(3, y, SAND);
  run(world, 300);

  assert.equal(world.count(SAND), 10);

  const grains = positions(world, SAND);
  assert.ok(new Set(grains.map((g) => g.x)).size > 1, 'the sand should spread into a pile');

  // A settled grain is either on the floor or fully supported by the cells below it
  grains.forEach(({ x, y }) => {
    if (y === world.H - 1) return;
    assert.notEqual(world.get(x, y + 1), 0, 'grain at ' + x + ',' + y + ' is floating');
    if (x > 0) assert.notEqual(world.get(x - 1, y + 1), 0);
    if (x < world.W - 1) assert.notEqual(world.get(x + 1, y + 1), 0);
  });
});

test('sand sinks through water', () => {
  const world = new World(3, 8, seeded(3));
  for (let y = 5; y < 8; y++) for (let x = 0; x < 3; x++) world.set(x, y, WATER);
  world.set(1, 0, SAND);

  run(world, 100);

  assert.equal(world.count(SAND), 1);
  assert.equal(world.count(WATER), 9);
  assert.equal(world.get(1, 7), SAND);
});

test('water spreads out and settles flat on the floor', () => {
  const world = new World(9, 6, seeded(4));
  for (let y = 0; y < 6; y++) world.set(4, y, WATER);
  run(world, 500);

  assert.equal(world.count(WATER), 6);
  positions(world, WATER).forEach(({ y }) => assert.equal(y, 5));
});

test('oil floats on water', () => {
  const world = new World(3, 6, seeded(5));
  for (let x = 0; x < 3; x++) {
    world.set(x, 5, OIL);       // oil starts underneath
    world.set(x, 4, WATER);
    world.set(x, 3, WATER);
  }

  run(world, 60);

  const oilBottom = Math.max(...positions(world, OIL).map((p) => p.y));
  const waterTop = Math.min(...positions(world, WATER).map((p) => p.y));
  assert.ok(oilBottom < waterTop, 'all oil should end up above all water');
  assert.equal(world.count(OIL), 3);
  assert.equal(world.count(WATER), 6);
});

test('smoke rises', () => {
  const world = new World(3, 8, seeded(6));
  world.set(1, 7, SMOKE, 1000);
  run(world, 30);
  const [smoke] = positions(world, SMOKE);
  assert.ok(smoke.y <= 3, 'smoke should have risen, but is at row ' + smoke.y);
});

test('steam bubbles up through water', () => {
  const world = new World(3, 6, seeded(7));
  for (let y = 3; y < 6; y++) for (let x = 0; x < 3; x++) world.set(x, y, WATER);
  world.set(1, 5, STEAM, 1000);          // start at the very bottom

  run(world, 150);

  const [steam] = positions(world, STEAM);
  assert.ok(steam.y <= 2, 'steam should be above the water, but is at row ' + steam.y);
  assert.equal(world.count(WATER), 8);
});

test('solid materials never move', () => {
  const world = new World(9, 9, seeded(8));
  world.set(4, 2, STONE);
  world.set(2, 6, WOOD);
  world.set(6, 4, TNT);
  run(world, 50);

  assert.equal(world.get(4, 2), STONE);
  assert.equal(world.get(2, 6), WOOD);
  assert.equal(world.get(6, 4), TNT);
});

test('sand and water are never created or lost', () => {
  const world = new World(10, 10, seeded(9));
  const pick = seeded(10);
  for (let i = 0; i < world.cells.length; i++) {
    const roll = pick();
    if (roll < 0.25) world.put(i, SAND);
    else if (roll < 0.5) world.put(i, WATER);
  }
  const sand = world.count(SAND);
  const water = world.count(WATER);

  run(world, 200);

  assert.equal(world.count(SAND), sand);
  assert.equal(world.count(WATER), water);
});

test('a world full of every material runs without errors', () => {
  const world = new World(30, 20, seeded(11));
  const pick = seeded(12);
  for (let i = 0; i < world.cells.length; i++) {
    world.put(i, Math.floor(pick() * MATERIALS.length));
  }

  run(world, 150);

  assert.equal(world.cells.length, 600);
  world.cells.forEach((id) => assert.ok(id >= 0 && id < MATERIALS.length));
});