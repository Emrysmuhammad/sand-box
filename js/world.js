(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const M = isNode ? require('./materials.js') : root.Sandbox;
  const Physics = isNode ? require('./physics.js') : root.Sandbox;
  const Reactions = isNode ? require('./reactions.js') : root.Sandbox;
  const Config = isNode ? require('./config.js') : root.Sandbox.Config;

  const { IDS, MATERIALS, SHADES, randomLife } = M;
  const { EMPTY } = IDS;

  /** Which function updates which material. Materials not listed here never act (stone, wood, TNT). */
  const UPDATERS = [];
  UPDATERS[IDS.SAND] = Physics.updatePowder;
  UPDATERS[IDS.WATER] = Physics.updateLiquid;
  UPDATERS[IDS.OIL] = Physics.updateLiquid;
  UPDATERS[IDS.FIRE] = Reactions.updateFire;
  UPDATERS[IDS.SMOKE] = Reactions.updateSmoke;
  UPDATERS[IDS.STEAM] = Reactions.updateSteam;
  UPDATERS[IDS.LAVA] = Reactions.updateLava;
  UPDATERS[IDS.ACID] = Reactions.updateAcid;
  UPDATERS[IDS.PLANT] = Reactions.updatePlant;
  UPDATERS[IDS.ICE] = Reactions.updateIce;

  /**
   * The grid of cells and the simulation that moves them. No DOM code.
   * Cells live in flat typed arrays: index = y * W + x, y = 0 is the top.
   *
   * To stay fast and fair, each step scans from the BOTTOM up (so a falling
   * grain moves only once per step) and picks a random left/right direction
   * for every row (so nothing drifts to one side).
   */
  class World {
    constructor(width, height, rng) {
      this.W = width;
      this.H = height;
      this.rng = rng || Math.random;

      const size = width * height;
      this.cells = new Uint8Array(size);    // material id
      this.life = new Uint16Array(size);    // remaining lifetime (fire, smoke, steam)
      this.shade = new Uint8Array(size);    // which color variation to draw
      this.stamp = new Uint8Array(size);    // marks cells that already moved this step

      this.tick = 0;
      this.mark = 1;
      this.blasts = [];                     // queued TNT explosions (cell indexes)
    }

    // ---------- reading and writing cells ----------

    inBounds(x, y) {
      return x >= 0 && x < this.W && y >= 0 && y < this.H;
    }

    /** The material at (x, y). Outside the world counts as empty. */
    get(x, y) {
      return this.inBounds(x, y) ? this.cells[y * this.W + x] : EMPTY;
    }

    /** Put a material into cell index i with a fresh shade and lifetime. */
    put(i, id, life) {
      this.cells[i] = id;
      this.life[i] = life === undefined ? randomLife(id, this.rng) : life;
      this.shade[i] = Math.floor(this.rng() * SHADES);
    }

    set(x, y, id, life) {
      if (this.inBounds(x, y)) this.put(y * this.W + x, id, life);
    }

    /** Swap two cells and mark both so they are not moved again this step. */
    swap(i, j) {
      const { cells, life, shade, stamp } = this;

      const c = cells[i]; cells[i] = cells[j]; cells[j] = c;
      const l = life[i];  life[i] = life[j];   life[j] = l;
      const s = shade[i]; shade[i] = shade[j]; shade[j] = s;

      stamp[i] = this.mark;
      stamp[j] = this.mark;
    }

    count(id) {
      let n = 0;
      for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === id) n++;
      return n;
    }

    /** Number of non-empty cells. */
    particleCount() {
      let n = 0;
      for (let i = 0; i < this.cells.length; i++) if (this.cells[i] !== EMPTY) n++;
      return n;
    }

    clear() {
      this.cells.fill(0);
      this.life.fill(0);
      this.shade.fill(0);
      this.stamp.fill(0);
      this.blasts.length = 0;
    }

    /** Replace the whole world with saved material ids. */
    loadCells(source) {
      this.clear();
      for (let i = 0; i < this.cells.length; i++) {
        if (source[i] !== EMPTY) this.put(i, source[i]);
      }
    }

    // ---------- painting ----------

    /**
     * Paint a round blob of a material centred on (cx, cy). radius 0 = one cell.
     * Cells are filled with the material's brush chance (a spray for sand and
     * water, solid for stone). Existing material is kept unless `overwrite` is
     * set. The eraser (EMPTY) always clears.
     */
    paint(cx, cy, radius, id, options) {
      const opts = options || {};
      const chance = opts.chance === undefined ? MATERIALS[id].brush : opts.chance;
      const limit = radius * radius + radius;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > limit) continue;

          const x = cx + dx;
          const y = cy + dy;
          if (!this.inBounds(x, y)) continue;

          const i = y * this.W + x;
          if (id === EMPTY) {
            if (this.cells[i] !== EMPTY) this.put(i, EMPTY);
            continue;
          }
          if (!opts.overwrite && this.cells[i] !== EMPTY) continue;
          if (chance < 1 && this.rng() >= chance) continue;
          this.put(i, id);
        }
      }
    }

    /** Paint along a straight line (Bresenham) so fast mouse moves leave no gaps. */
    paintLine(x0, y0, x1, y1, radius, id, options) {
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      let x = x0;
      let y = y0;

      for (;;) {
        this.paint(x, y, radius, id, options);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    }

    // ---------- the simulation ----------

    /** Advance the whole world by one step. */
    step() {
      this.tick++;
      this.mark = (this.tick % 255) + 1;          // 1 to 255, never 0

      const { W, H, cells, stamp } = this;

      for (let y = H - 1; y >= 0; y--) {
        const leftToRight = this.rng() < 0.5;
        for (let k = 0; k < W; k++) {
          const x = leftToRight ? k : W - 1 - k;
          const i = y * W + x;

          const update = UPDATERS[cells[i]];
          if (update === undefined || stamp[i] === this.mark) continue;
          update(this, x, y, i);
        }
      }

      // Explosions are handled after everything else has moved
      let handled = 0;
      while (this.blasts.length > 0 && handled < Config.MAX_BLASTS_PER_STEP) {
        Reactions.explode(this, this.blasts.shift());
        handled++;
      }
    }
  }

  const api = { World };

  if (isNode) {
    module.exports = api;
  } else {
    root.Sandbox = root.Sandbox || {};
    Object.assign(root.Sandbox, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);