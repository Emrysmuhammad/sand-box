(function (root) {
  'use strict';

  /** How many slightly different shades each material has (makes it look natural). */
  const SHADES = 8;

  const IDS = Object.freeze({
    EMPTY: 0, SAND: 1, WATER: 2, STONE: 3, WOOD: 4, FIRE: 5, SMOKE: 6,
    OIL: 7, PLANT: 8, LAVA: 9, ICE: 10, STEAM: 11, ACID: 12, TNT: 13
  });

  /*
    kind:      'empty' | 'static' | 'powder' | 'liquid' | 'gas' | 'fire'
    density:   heavier materials sink through lighter ones
    spread:    how far a liquid can flow sideways in one step
    viscosity: chance (0 to 1) that a liquid or gas acts in a step (lower = slower)
    life:      [min, max] steps a short-lived material exists
    flammable: { chance: chance per step next to fire, burn: [min, max] burn time }
    brush:     chance that each cell inside the brush gets filled (spray effect)
  */
  const MATERIALS = [
    { id: 0, name: 'Eraser', hotkey: 'e', kind: 'empty', density: 0,
      base: [11, 16, 32], variance: 0, brush: 1 },

    { id: 1, name: 'Sand', hotkey: '1', kind: 'powder', density: 40,
      base: [219, 184, 106], variance: 0.10, brush: 0.55 },

    { id: 2, name: 'Water', hotkey: '2', kind: 'liquid', density: 10, spread: 4, viscosity: 1,
      base: [52, 120, 224], variance: 0.07, brush: 0.55 },

    { id: 3, name: 'Stone', hotkey: '3', kind: 'static', density: 100,
      base: [118, 124, 136], variance: 0.12, brush: 1 },

    { id: 4, name: 'Wood', hotkey: '4', kind: 'static', density: 100,
      base: [139, 90, 43], variance: 0.15, brush: 1,
      flammable: { chance: 0.02, burn: [70, 140] } },

    { id: 5, name: 'Fire', hotkey: '5', kind: 'fire', density: 1, life: [20, 50],
      base: [255, 150, 40], variance: 0.2, brush: 0.35 },

    { id: 6, name: 'Smoke', hotkey: 's', kind: 'gas', density: 1, viscosity: 0.8, life: [90, 180],
      base: [110, 114, 126], variance: 0.2, brush: 0.4 },

    { id: 7, name: 'Oil', hotkey: '6', kind: 'liquid', density: 8, spread: 3, viscosity: 0.7,
      base: [96, 58, 74], variance: 0.10, brush: 0.55,
      flammable: { chance: 0.25, burn: [15, 40] } },

    { id: 8, name: 'Plant', hotkey: '7', kind: 'static', density: 100,
      base: [58, 170, 82], variance: 0.18, brush: 1,
      flammable: { chance: 0.10, burn: [30, 70] } },

    { id: 9, name: 'Lava', hotkey: '8', kind: 'liquid', density: 25, spread: 1, viscosity: 0.25,
      base: [255, 100, 20], variance: 0.22, brush: 0.55 },

    { id: 10, name: 'Ice', hotkey: '9', kind: 'static', density: 100,
      base: [170, 225, 245], variance: 0.06, brush: 1 },

    { id: 11, name: 'Steam', hotkey: 'v', kind: 'gas', density: 1, viscosity: 0.9, life: [300, 600],
      base: [205, 215, 230], variance: 0.08, brush: 0.4 },

    { id: 12, name: 'Acid', hotkey: '0', kind: 'liquid', density: 12, spread: 3, viscosity: 0.8,
      base: [140, 255, 60], variance: 0.12, brush: 0.55 },

    { id: 13, name: 'TNT', hotkey: 't', kind: 'static', density: 100,
      base: [200, 50, 60], variance: 0.10, brush: 1 }
  ];

  /** The order buttons appear in the palette. */
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 6, 11, 0];

  /** hotkey -> material id */
  const BY_HOTKEY = {};
  MATERIALS.forEach((m) => { BY_HOTKEY[m.hotkey] = m.id; });

  /** Per-id lookup of flammability (null when a material cannot burn). */
  const FLAMMABLE = MATERIALS.map((m) => m.flammable || null);

  /** A slightly lighter or darker version of a color. */
  function shadeColor(base, variance, index) {
    const t = SHADES === 1 ? 0.5 : index / (SHADES - 1);       // 0 to 1
    const factor = 1 + (t - 0.5) * 2 * variance;
    return base.map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))));
  }

  /** PALETTE[materialId][shade] = [r, g, b] */
  const PALETTE = MATERIALS.map((m) =>
    Array.from({ length: SHADES }, (_, i) => shadeColor(m.base, m.variance, i)));

  /**
   * Can `mover` sink into the cell holding `target`?
   * It can enter empty space, and swap places with any lighter liquid, gas or fire.
   * It can never push through solids or other powders.
   */
  function canSink(moverId, targetId) {
    const target = MATERIALS[targetId];
    if (target.kind === 'empty') return true;
    if (target.kind === 'liquid' || target.kind === 'gas' || target.kind === 'fire') {
      return target.density < MATERIALS[moverId].density;
    }
    return false;
  }

  /** A random starting lifetime for short-lived materials (0 for everything else). */
  function randomLife(id, rng) {
    const range = MATERIALS[id].life;
    if (!range) return 0;
    return range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
  }

  const api = {
    IDS, MATERIALS, PALETTE, SHADES, DISPLAY_ORDER, BY_HOTKEY, FLAMMABLE, canSink, randomLife
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sandbox = root.Sandbox || {};
    Object.assign(root.Sandbox, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);