(function (root) {
  'use strict';

  const M = (typeof module !== 'undefined' && module.exports) ? require('./materials.js') : root.Sandbox;
  const { IDS, MATERIALS, canSink } = M;
  const { EMPTY } = IDS;

  /*
    Movement rules. Each function moves ONE cell. `world` provides:
      world.W, world.H   grid size
      world.cells        material id of every cell (index = y * W + x)
      world.swap(i, j)   swap two cells
      world.rng()        random number in [0, 1)
  */

  /** Try to move diagonally down. */
  function diagonalDown(world, x, i, id, dir) {
    const nx = x + dir;
    if (nx < 0 || nx >= world.W) return false;
    const j = i + world.W + dir;
    if (!canSink(id, world.cells[j])) return false;
    world.swap(i, j);
    return true;
  }

  /** Powders (sand) fall straight down, otherwise slide down a slope. */
  function updatePowder(world, x, y, i) {
    if (y + 1 >= world.H) return;
    const id = world.cells[i];
    const below = i + world.W;

    if (canSink(id, world.cells[below])) {
      world.swap(i, below);
      return;
    }

    const dir = world.rng() < 0.5 ? -1 : 1;
    if (!diagonalDown(world, x, i, id, dir)) diagonalDown(world, x, i, id, -dir);
  }

  /** Flow sideways across empty cells (up to `reach` cells away). */
  function spread(world, x, i, dir, reach) {
    let target = -1;
    for (let step = 1; step <= reach; step++) {
      const nx = x + dir * step;
      if (nx < 0 || nx >= world.W) break;
      if (world.cells[i + dir * step] !== EMPTY) break;
      target = i + dir * step;
    }
    if (target < 0) return false;
    world.swap(i, target);
    return true;
  }

  /** Liquids fall, slide down slopes, then flow sideways to level out. */
  function updateLiquid(world, x, y, i) {
    const id = world.cells[i];
    const def = MATERIALS[id];

    // Thick liquids (oil, lava) only act some of the time
    if (def.viscosity < 1 && world.rng() >= def.viscosity) return;

    if (y + 1 < world.H) {
      if (canSink(id, world.cells[i + world.W])) {
        world.swap(i, i + world.W);
        return;
      }
      const diagonal = world.rng() < 0.5 ? -1 : 1;
      if (diagonalDown(world, x, i, id, diagonal) || diagonalDown(world, x, i, id, -diagonal)) return;
    }

    const dir = world.rng() < 0.5 ? -1 : 1;
    if (!spread(world, x, i, dir, def.spread)) spread(world, x, i, -dir, def.spread);
  }

  /** Gases can rise into empty space and bubble up through liquids. */
  function canRiseInto(targetId) {
    return targetId === EMPTY || MATERIALS[targetId].kind === 'liquid';
  }

  function drift(world, x, i, dir) {
    const nx = x + dir;
    if (nx < 0 || nx >= world.W || world.cells[i + dir] !== EMPTY) return false;
    world.swap(i, i + dir);
    return true;
  }

  function diagonalUp(world, x, i, dir) {
    const nx = x + dir;
    if (nx < 0 || nx >= world.W) return false;
    const j = i - world.W + dir;
    if (!canRiseInto(world.cells[j])) return false;
    world.swap(i, j);
    return true;
  }

  /** Gases (smoke, steam) float upwards with a little sideways wobble. */
  function updateGas(world, x, y, i) {
    const def = MATERIALS[world.cells[i]];
    if (world.rng() >= def.viscosity) return;

    const dir = world.rng() < 0.5 ? -1 : 1;

    if (y > 0) {
      if (world.rng() < 0.25 && drift(world, x, i, dir)) return;     // wobble

      const up = i - world.W;
      if (canRiseInto(world.cells[up])) {
        world.swap(i, up);
        return;
      }
      if (diagonalUp(world, x, i, dir) || diagonalUp(world, x, i, -dir)) return;
    }

    if (!drift(world, x, i, dir)) drift(world, x, i, -dir);
  }

  const api = { updatePowder, updateLiquid, updateGas };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sandbox = root.Sandbox || {};
    Object.assign(root.Sandbox, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);