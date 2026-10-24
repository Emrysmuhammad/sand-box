(function (root) {
  'use strict';

  /** Settings that never change while the sandbox runs. */
  const Config = Object.freeze({
    WIDTH: 240,                 // world size in cells (the canvas has this many pixels)
    HEIGHT: 150,

    STEPS_PER_FRAME: 2,         // default simulation speed
    MAX_STEPS_PER_FRAME: 4,

    BRUSH_MIN: 1,
    BRUSH_MAX: 12,
    BRUSH_DEFAULT: 3,

    EXPLOSION_RADIUS: 7,
    MAX_BLASTS_PER_STEP: 40,    // chain reactions are spread over several steps beyond this

    BACKGROUND: Object.freeze([11, 16, 32]),

    STORAGE_KEYS: Object.freeze({
      WORLD: 'sandbox.world'
    })
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;                 // Node (unit tests)
  } else {
    root.Sandbox = root.Sandbox || {};
    root.Sandbox.Config = Config;            // Browser
  }
})(typeof window !== 'undefined' ? window : globalThis);