const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDS, MATERIALS, PALETTE, SHADES, DISPLAY_ORDER, BY_HOTKEY, FLAMMABLE, canSink, randomLife
} = require('../js/materials.js');

const { EMPTY, SAND, WATER, STONE, WOOD, SMOKE, OIL, PLANT, LAVA, TNT, FIRE } = IDS;

test('every id matches its position in the MATERIALS list', () => {
  MATERIALS.forEach((m, index) => assert.equal(m.id, index));
  assert.equal(MATERIALS.length, Object.keys(IDS).length);
});

test('every material has a full set of valid colors', () => {
  PALETTE.forEach((shades) => {
    assert.equal(shades.length, SHADES);
    shades.forEach((rgb) => {
      assert.equal(rgb.length, 3);
      rgb.forEach((channel) => assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255));
    });
  });
});

test('hotkeys are unique and the palette shows every material once', () => {
  const keys = MATERIALS.map((m) => m.hotkey);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(BY_HOTKEY['1'], SAND);
  assert.equal(BY_HOTKEY.e, EMPTY);

  assert.equal(DISPLAY_ORDER.length, MATERIALS.length);
  assert.equal(new Set(DISPLAY_ORDER).size, MATERIALS.length);
});

test('heavier materials sink through lighter ones', () => {
  assert.equal(canSink(SAND, WATER), true);
  assert.equal(canSink(WATER, OIL), true);
  assert.equal(canSink(LAVA, WATER), true);
  assert.equal(canSink(WATER, SMOKE), true);
  assert.equal(canSink(SAND, EMPTY), true);
});

test('lighter materials never sink through heavier ones', () => {
  assert.equal(canSink(WATER, SAND), false);
  assert.equal(canSink(OIL, WATER), false);
  assert.equal(canSink(SMOKE, WATER), false);
});

test('nothing sinks through solids or other powders', () => {
  assert.equal(canSink(SAND, STONE), false);
  assert.equal(canSink(WATER, WOOD), false);
  assert.equal(canSink(SAND, SAND), false);
  assert.equal(canSink(SAND, TNT), false);
});

test('wood, plants and oil are flammable but stone is not', () => {
  assert.ok(FLAMMABLE[WOOD].chance > 0);
  assert.ok(FLAMMABLE[PLANT].burn[0] > 0);
  assert.ok(FLAMMABLE[OIL].chance > 0);
  assert.equal(FLAMMABLE[STONE], null);
});

test('randomLife stays inside the material range', () => {
  const [min, max] = MATERIALS[FIRE].life;
  assert.equal(randomLife(FIRE, () => 0), min);
  assert.equal(randomLife(FIRE, () => 0.999999), max);
  assert.equal(randomLife(STONE, () => 0.5), 0);
});