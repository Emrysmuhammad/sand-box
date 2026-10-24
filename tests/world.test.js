const test = require('node:test');
const assert = require('node:assert/strict');
const { World } = require('../js/world.js');
const { IDS } = require('../js/materials.js');
const { seeded, positions } = require('./helpers.js');

const { EMPTY, SAND, WATER, STONE } = IDS;

const blank = () => new World(5, 5, seeded(1));

test('a new world is empty', () => {
  const world = blank();
  assert.equal(world.particleCount(), 0);
  assert.equal(world.cells.length, 25);
});

test('set and get work, and outside the world counts as empty', () => {
  const world = blank();
  world.set(2, 3, STONE);
  assert.equal(world.get(2, 3), STONE);
  assert.equal(world.get(-1, 0), EMPTY);
  assert.equal(world.get(5, 5), EMPTY);
  world.set(99, 99, STONE);               // ignored
  assert.equal(world.count(STONE), 1);
});

test('painting with radius 0 fills a single cell', () => {
  const world = blank();
  world.paint(2, 2, 0, SAND, { chance: 1 });
  assert.equal(world.count(SAND), 1);
  assert.equal(world.get(2, 2), SAND);
});

test('painting with radius 1 fills a 3x3 area', () => {
  const world = blank();
  world.paint(2, 2, 1, SAND, { chance: 1 });
  assert.equal(world.count(SAND), 9);
});

test('painting does not overwrite existing material by default', () => {
  const world = blank();
  world.set(2, 2, STONE);
  world.paint(2, 2, 1, SAND, { chance: 1 });
  assert.equal(world.get(2, 2), STONE);
  assert.equal(world.count(SAND), 8);
});

test('painting with overwrite replaces existing material', () => {
  const world = blank();
  world.set(2, 2, STONE);
  world.paint(2, 2, 1, SAND, { chance: 1, overwrite: true });
  assert.equal(world.count(SAND), 9);
  assert.equal(world.count(STONE), 0);
});

test('the eraser clears everything it touches', () => {
  const world = blank();
  world.paint(2, 2, 1, SAND, { chance: 1 });
  world.set(2, 2, STONE);
  world.paint(2, 2, 1, EMPTY);
  assert.equal(world.particleCount(), 0);
});

test('painting near the edge stays inside the world', () => {
  const world = blank();
  world.paint(0, 0, 3, SAND, { chance: 1 });
  assert.ok(world.count(SAND) > 0 && world.count(SAND) <= 25);
});

test('sand sprays (not every cell is filled) but stone is solid', () => {
  const spray = new World(5, 5, () => 0.99);
  spray.paint(2, 2, 1, SAND);
  assert.equal(spray.count(SAND), 0);

  const full = new World(5, 5, () => 0.99);
  full.paint(2, 2, 1, STONE);
  assert.equal(full.count(STONE), 9);

  const dense = new World(5, 5, () => 0);
  dense.paint(2, 2, 1, SAND);
  assert.equal(dense.count(SAND), 9);
});

test('paintLine leaves no gaps', () => {
  const world = blank();
  world.paintLine(0, 2, 4, 2, 0, STONE);
  assert.equal(world.count(STONE), 5);
  positions(world, STONE).forEach(({ y }) => assert.equal(y, 2));
});

test('paintLine works diagonally and backwards', () => {
  const world = blank();
  world.paintLine(4, 4, 0, 0, 0, STONE);
  assert.equal(world.count(STONE), 5);
  for (let i = 0; i < 5; i++) assert.equal(world.get(i, i), STONE);
});

test('paintLine with identical points paints a single dab', () => {
  const world = blank();
  world.paintLine(2, 2, 2, 2, 0, STONE);
  assert.equal(world.count(STONE), 1);
});

test('clear empties the world', () => {
  const world = blank();
  world.paint(2, 2, 2, STONE);
  world.clear();
  assert.equal(world.particleCount(), 0);
});

test('loadCells replaces the world with saved material ids', () => {
  const world = blank();
  world.paint(2, 2, 2, STONE);

  const saved = new Uint8Array(25);
  saved[0] = SAND;
  saved[24] = WATER;
  world.loadCells(saved);

  assert.equal(world.particleCount(), 2);
  assert.equal(world.get(0, 0), SAND);
  assert.equal(world.get(4, 4), WATER);
});