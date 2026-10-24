// Shared helpers for the tests (this file contains no tests itself).

/** A tiny deterministic random generator. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Run the simulation for a number of steps. */
function run(world, steps) {
  for (let i = 0; i < steps; i++) world.step();
}

/** Every { x, y } that holds the given material. */
function positions(world, id) {
  const out = [];
  for (let i = 0; i < world.cells.length; i++) {
    if (world.cells[i] === id) out.push({ x: i % world.W, y: Math.floor(i / world.W) });
  }
  return out;
}

module.exports = { seeded, run, positions };