(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const { Config, World, Renderer, Input, UI, App } = window.Sandbox;

    const ui = new UI(document);
    const world = new World(Config.WIDTH, Config.HEIGHT);
    const renderer = new Renderer(ui.el.canvas, world);
    const app = new App(ui, renderer, world, Input);

    // Painting and keyboard shortcuts
    Input.bind(
      ui.el.canvas,
      { width: Config.WIDTH, height: Config.HEIGHT },
      {
        onSelect: (id) => app.selectTool(id),
        onBrush: (delta) => app.changeBrush(delta),
        onTogglePause: () => app.togglePause(),
        onStep: () => app.stepOnce(),
        onClear: () => app.clear()
      }
    );

    // After a MOUSE click, release focus so the Space key keeps toggling pause.
    // Keyboard activation (event.detail === 0) keeps focus for accessibility.
    function onClick(element, handler) {
      element.addEventListener('click', (event) => {
        handler();
        if (event.detail > 0) element.blur();
      });
    }

    onClick(ui.el.pause, () => app.togglePause());
    onClick(ui.el.step, () => app.stepOnce());
    onClick(ui.el.clear, () => app.clear());
    onClick(ui.el.save, () => app.save());
    onClick(ui.el.load, () => app.load());
    onClick(ui.el.png, () => app.exportPng());

    ui.el.brushSize.addEventListener('input', () => app.setBrush(Number(ui.el.brushSize.value)));
    ui.el.speed.addEventListener('input', () => app.setSpeed(Number(ui.el.speed.value)));

    app.start();

    window.sandbox = app; // handy for debugging in the console
  });
})();