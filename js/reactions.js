(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const M = isNode ? require('./materials.js') : root.Sandbox;
  const Physics = isNode ? require('./physics.js') : root.Sandbox;
  const Config = isNode ? require('./config.js') : root.Sandbox.Config;

  const { IDS, FLAMMABLE } = M;
  const { updateLiquid, updateGas } = Physics;
  const { EMPTY, SAND, WATER, STONE, WOOD, FIRE, SMOKE, PLANT, LAVA, ICE, STEAM, TNT } = IDS;

  // Materials that acid can eat
  const DISSOLVABLE = new Set([SAND, STONE, WOOD, PLANT, ICE, TNT]);

  // Reused buffer for the (up to) four neighbours of a cell
  const NB = new Int32Array(4);

  /** Fill NB with the indexes of the left, right, upper and lower neighbours. */
  function neighbors4(world, x, y, i) {
    let n = 0;
    if (x > 0) NB[n++] = i - 1;
    if (x < world.W - 1) NB[n++] = i + 1;
    if (y > 0) NB[n++] = i - world.W;
    if (y < world.H - 1) NB[n++] = i + world.W;
    return n;
  }

  /** Turn a flammable cell into fire that burns for as long as that material burns. */
  function ignite(world, j) {
    const [min, max] = FLAMMABLE[world.cells[j]].burn;
    world.put(j, FIRE, min + Math.floor(world.rng() * (max - min + 1)));
  }

  /** Set a TNT cell off: it becomes fire now and its explosion is queued. */
  function detonate(world, j) {
    world.put(j, FIRE, 8);
    world.blasts.push(j);
  }

  /**
   * A TNT explosion: everything close to the centre is turned into fire,
   * further out only some cells are, water flashes to steam, and stone
   * survives. Other TNT inside the blast is set off too (chain reaction).
   */
  function explode(world, center) {
    const { W, H, cells } = world;
    const r = Config.EXPLOSION_RADIUS;
    const cx = center % W;
    const cy = Math.floor(center / W);

    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= H) continue;

      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= W) continue;

        const dist2 = dx * dx + dy * dy;
        if (dist2 > r * r) continue;

        const k = y * W + x;
        const m = cells[k];
        if (m === STONE) continue;
        if (m === TNT && k !== center) { detonate(world, k); continue; }
        if (m === WATER) { world.put(k, STEAM); continue; }

        const closeness = Math.sqrt(dist2) / r;          // 0 at the centre, 1 at the edge
        const flame = 8 + Math.floor(world.rng() * 16);
        if (closeness < 0.55) {
          world.put(k, FIRE, flame);
        } else {
          const roll = world.rng();
          if (roll < 0.5) world.put(k, FIRE, flame);
          else if (roll < 0.75) world.put(k, SMOKE);
        }
      }
    }
  }

  /** Fire spreads, gets put out by water, melts ice, sets off TNT, and flickers upwards. */
  function updateFire(world, x, y, i) {
    const { W, cells } = world;

    const left = world.life[i] - 1;
    if (left <= 0) {
      world.put(i, world.rng() < 0.35 ? SMOKE : EMPTY);
      return;
    }
    world.life[i] = left;

    const n = neighbors4(world, x, y, i);
    for (let k = 0; k < n; k++) {
      const j = NB[k];
      const m = cells[j];

      if (FLAMMABLE[m] && world.rng() < FLAMMABLE[m].chance) {
        ignite(world, j);
      } else if (m === TNT) {
        detonate(world, j);
      } else if (m === WATER) {
        world.put(i, STEAM);                                    // the fire goes out
        if (world.rng() < 0.15) world.put(j, STEAM);
        return;
      } else if (m === ICE && world.rng() < 0.08) {
        world.put(j, WATER);
      }
    }

    // Occasional puff of smoke
    if (y > 0 && cells[i - W] === EMPTY && world.rng() < 0.04) world.put(i - W, SMOKE);

    // Small, dying flames flicker upwards (flames on fuel stay where they are)
    if (y > 0 && left < 35 && world.rng() < 0.35) {
      const dir = world.rng() < 0.5 ? -1 : 1;
      if (cells[i - W] === EMPTY) world.swap(i, i - W);
      else if (x + dir >= 0 && x + dir < W && cells[i - W + dir] === EMPTY) world.swap(i, i - W + dir);
    }
  }

  /** Smoke drifts up and fades away. */
  function updateSmoke(world, x, y, i) {
    const left = world.life[i] - 1;
    if (left <= 0) {
      world.put(i, EMPTY);
      return;
    }
    world.life[i] = left;
    updateGas(world, x, y, i);
  }

  /** Steam drifts up and eventually condenses back into water (rain). */
  function updateSteam(world, x, y, i) {
    const left = world.life[i] - 1;
    if (left <= 0) {
      world.put(i, WATER);
      return;
    }
    world.life[i] = left;
    updateGas(world, x, y, i);
  }

  /** Lava turns water to stone, sets things alight, melts ice and sets off TNT. */
  function updateLava(world, x, y, i) {
    const { W, cells } = world;

    const n = neighbors4(world, x, y, i);
    for (let k = 0; k < n; k++) {
      const j = NB[k];
      const m = cells[j];

      if (m === WATER) {
        world.put(i, STONE);
        world.put(j, STEAM);
        return;
      }
      if (FLAMMABLE[m] && world.rng() < FLAMMABLE[m].chance * 3) {
        ignite(world, j);
      } else if (m === ICE && world.rng() < 0.15) {
        world.put(j, WATER);
      } else if (m === TNT) {
        detonate(world, j);
      }
    }

    // Now and then a spark pops off the top
    if (y > 0 && cells[i - W] === EMPTY && world.rng() < 0.003) world.put(i - W, FIRE);

    updateLiquid(world, x, y, i);
  }

  /** Acid eats solids and gets used up while doing it. */
  function updateAcid(world, x, y, i) {
    const n = neighbors4(world, x, y, i);
    for (let k = 0; k < n; k++) {
      const j = NB[k];
      if (DISSOLVABLE.has(world.cells[j]) && world.rng() < 0.06) {
        world.put(j, EMPTY);
        if (world.rng() < 0.5) {
          world.put(i, world.rng() < 0.3 ? SMOKE : EMPTY);        // the acid is spent
          return;
        }
      }
    }
    updateLiquid(world, x, y, i);
  }

  /** Index of one randomly chosen neighbour (up, down, left or right), or -1 at an edge. */
  function randomNeighbor(world, x, y, i) {
    const d = Math.floor(world.rng() * 4);
    if (d === 0 && x > 0) return i - 1;
    if (d === 1 && x < world.W - 1) return i + 1;
    if (d === 2 && y > 0) return i - world.W;
    if (d === 3 && y < world.H - 1) return i + world.W;
    return -1;
  }

  /** Plants slowly grow into neighbouring water. */
  function updatePlant(world, x, y, i) {
    const j = randomNeighbor(world, x, y, i);
    if (j >= 0 && world.cells[j] === WATER && world.rng() < 0.12) world.put(j, PLANT);
  }

  /** Ice slowly freezes neighbouring water. */
  function updateIce(world, x, y, i) {
    const j = randomNeighbor(world, x, y, i);
    if (j >= 0 && world.cells[j] === WATER && world.rng() < 0.01) world.put(j, ICE);
  }

  const api = {
    updateFire, updateSmoke, updateSteam, updateLava, updateAcid, updatePlant, updateIce,
    explode, detonate, ignite
  };

  if (isNode) {
    module.exports = api;
  } else {
    root.Sandbox = root.Sandbox || {};
    Object.assign(root.Sandbox, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);