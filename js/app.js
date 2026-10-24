(function (root) {
  'use strict';

  const { Config, IDS, MATERIALS, saveWorld, loadWorld } = root.Sandbox;

  /**
   * The controller: it owns the current tool, brush size and speed, runs the
   * animation loop (paint, simulate, draw) and handles the buttons.
   */
  class App {
    constructor(ui, renderer, world, input) {
      this.ui = ui;
      this.renderer = renderer;
      this.world = world;
      this.input = input;

      this.tool = IDS.SAND;
      this.brush = Config.BRUSH_DEFAULT;
      this.speed = Config.STEPS_PER_FRAME;
      this.paused = false;

      this.frames = 0;
      this.lastStats = performance.now();

      this.loop = this.loop.bind(this);

      ui.buildPalette((id) => this.selectTool(id));
      ui.setActiveTool(this.tool);
      ui.setBrush(this.brush);
      ui.setSpeed(this.speed);
      ui.setPaused(this.paused);
    }

    start() {
      requestAnimationFrame(this.loop);
    }

    // ---------- the animation loop ----------

    loop(now) {
      this.paintStroke();

      if (!this.paused) {
        for (let i = 0; i < this.speed; i++) this.world.step();
      }

      this.renderer.draw(this.brushPreview());
      this.updateStats(now);

      requestAnimationFrame(this.loop);
    }

    /** While a pointer is pressed, keep painting from where the last stroke ended. */
    paintStroke() {
      const s = this.input.state;
      if (!s.active) return;

      const id = s.erase ? IDS.EMPTY : this.tool;
      this.world.paintLine(s.prevX, s.prevY, s.x, s.y, this.brush - 1, id, { overwrite: s.overwrite });
      s.prevX = s.x;
      s.prevY = s.y;
    }

    brushPreview() {
      const s = this.input.state;
      return s.hover || s.active ? { x: s.x, y: s.y, r: this.brush - 1 } : null;
    }

    /** Update the FPS and particle counters a few times per second. */
    updateStats(now) {
      this.frames++;
      const elapsed = now - this.lastStats;
      if (elapsed < 500) return;

      this.ui.setStats(this.world.particleCount(), Math.round(this.frames * 1000 / elapsed));
      this.frames = 0;
      this.lastStats = now;
    }

    // ---------- controls ----------

    selectTool(id) {
      this.tool = id;
      this.ui.setActiveTool(id);
    }

    setBrush(size) {
      this.brush = Math.min(Config.BRUSH_MAX, Math.max(Config.BRUSH_MIN, size));
      this.ui.setBrush(this.brush);
    }

    changeBrush(delta) {
      this.setBrush(this.brush + delta);
    }

    setSpeed(speed) {
      this.speed = Math.min(Config.MAX_STEPS_PER_FRAME, Math.max(1, speed));
      this.ui.setSpeed(this.speed);
    }

    togglePause() {
      this.paused = !this.paused;
      this.ui.setPaused(this.paused);
    }

    /** Advance a single step while paused. */
    stepOnce() {
      if (this.paused) this.world.step();
    }

    clear() {
      this.world.clear();
      this.ui.toast('World cleared');
    }

    save() {
      const ok = saveWorld(this.world.cells, this.world.W, this.world.H);
      this.ui.toast(ok ? 'World saved' : 'Could not save (browser storage is blocked)');
    }

    load() {
      const cells = loadWorld(this.world.W, this.world.H, MATERIALS.length - 1);
      if (!cells) {
        this.ui.toast('No saved world found');
        return;
      }
      this.world.loadCells(cells);
      this.ui.toast('World loaded');
    }

    exportPng() {
      this.renderer.exportPng(4);
      this.ui.toast('Saving picture...');
    }
  }

  root.Sandbox.App = App;
})(typeof window !== 'undefined' ? window : globalThis);