const test = require('node:test');
const assert = require('node:assert/strict');
const { World } = require('../js/world.js');
const { IDS } = require('../js/materials.js');
const { seeded, run } = require('./helpers.js');

const { SAND, WATER, STONE, WOOD, FIRE, SMOKE, PLANT, LAVA, ICE, STEAM, ACID, TNT } = IDS;

// A random source that always returns 0 makes every "chance" succeed,
// so reactions happen immediately and the tests are completely predictable.
const always = () => 0;

test('fire burns out', () => {
  const world = new World(5, 5, seeded(1));
  world.set(2, 4, FIRE, 3);
  run(world, 6);
  assert.equal(world.count(FIRE), 0);
});

test('fire sets wood alight', () => {
  const world = new World(5, 5, always);
  world.set(2, 2, WOOD);
  world.set(3, 2, FIRE, 200);
  world.step();
  assert.equal(world.count(WOOD), 0);
  assert.ok(world.count(FIRE) >= 2);
});

test('fire spreads along a row of wood', () => {
  const world = new World(10, 6, always);
  for (let x = 0; x < 10; x++) world.set(x, 4, WOOD);
  world.set(0, 3, FIRE, 200);

  run(world, 30);

  assert.equal(world.count(WOOD), 0);
});

test('fire does not light stone or sand', () => {
  const world = new World(5, 5, always);
  world.set(2, 4, STONE);
  world.set(3, 4, FIRE, 200);
  world.set(1, 4, SAND);
  world.step();
  assert.equal(world.get(2, 4), STONE);
});

test('water puts fire out and makes steam', () => {
  const world = new World(3, 3, always);
  world.set(1, 1, FIRE, 50);
  world.set(2, 1, WATER);
  world.step();
  assert.equal(world.count(FIRE), 0);
  assert.ok(world.count(STEAM) >= 1);
});

test('fire melts ice into water', () => {
  const world = new World(3, 3, always);
  world.set(1, 1, ICE);
  world.set(2, 1, FIRE, 50);
  world.step();
  assert.equal(world.count(ICE), 0);
  assert.equal(world.count(WATER), 1);
});

test('lava and water make stone and steam', () => {
  const world = new World(3, 3, always);
  for (let x = 0; x < 3; x++) world.set(x, 2, WATER);   // a full floor of water
  world.set(1, 1, LAVA);

  world.step();

  assert.equal(world.count(LAVA), 0);
  assert.equal(world.count(STONE), 1);
  assert.equal(world.count(STEAM), 1);
  assert.equal(world.count(WATER), 2);
});

test('lava sets wood alight', () => {
  const world = new World(5, 5, always);
  world.set(2, 4, LAVA);
  world.set(3, 4, WOOD);
  world.step();
  assert.equal(world.count(WOOD), 0);
});

test('plants grow into water', () => {
  const world = new World(5, 5, seeded(4));
  for (let i = 0; i < world.cells.length; i++) world.put(i, WATER);
  world.set(2, 2, PLANT);

  run(world, 400);

  assert.ok(world.count(PLANT) > 1, 'the plant should have grown');
  assert.equal(world.count(PLANT) + world.count(WATER), 25);
});

test('ice slowly freezes neighbouring water', () => {
  const world = new World(3, 3, always);
  for (let i = 0; i < world.cells.length; i++) world.put(i, WATER);
  world.set(1, 1, ICE);
  world.step();
  assert.equal(world.count(ICE), 2);
});

test('acid dissolves stone', () => {
  const world = new World(3, 3, seeded(5));
  for (let i = 0; i < world.cells.length; i++) world.put(i, STONE);
  world.set(1, 1, ACID);

  run(world, 300);

  assert.ok(world.count(STONE) < 8, 'some stone should have dissolved');
});

test('steam condenses into water', () => {
  const world = new World(3, 6, seeded(6));
  world.set(1, 3, STEAM, 2);
  run(world, 3);
  assert.equal(world.count(STEAM), 0);
  assert.equal(world.count(WATER), 1);
});

test('smoke fades away', () => {
  const world = new World(3, 6, seeded(7));
  world.set(1, 3, SMOKE, 2);
  run(world, 3);
  assert.equal(world.count(SMOKE), 0);
});

test('fire sets off TNT: nearby material burns and stone survives', () => {
  const world = new World(15, 15, seeded(8));
  world.set(7, 7, TNT);
  world.set(8, 7, FIRE, 50);
  world.set(7, 5, WOOD);        // close to the blast
  world.set(7, 6, STONE);       // right next to the TNT

  world.step();

  assert.equal(world.count(TNT), 0);
  assert.equal(world.count(WOOD), 0);
  assert.equal(world.get(7, 6), STONE);
});

test('TNT blasts set off other TNT (chain reaction)', () => {
  const world = new World(15, 15, seeded(9));
  world.set(4, 7, TNT);
  world.set(9, 7, TNT);
  world.set(5, 7, FIRE, 50);

  world.step();

  assert.equal(world.count(TNT), 0);
});

test('explosions near the edge of the world do not crash', () => {
  const world = new World(8, 8, seeded(10));
  world.set(0, 0, TNT);
  world.set(1, 0, FIRE, 50);
  world.step();
  assert.equal(world.count(TNT), 0);
});