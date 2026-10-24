(function (root) {
  'use strict';

  const { BY_HOTKEY } = root.Sandbox;

  /**
   * Turns mouse, touch and keyboard actions into painting state and callbacks.
   *
   * Painting state (read by the app every frame):
   *   active     a pointer is pressed on the canvas
   *   erase      the right mouse button is used
   *   overwrite  Shift is held (paint over existing material)
   *   hover      the pointer is over the canvas (shows the brush circle)
   *   x, y       current cell, prevX, prevY: where the last stroke ended
   *
   * Callbacks:
   *   onSelect(id), onBrush(delta), onTogglePause(), onStep(), onClear()
   */
  const Input = {
    state: { active: false, erase: false, overwrite: false, hover: false, x: 0, y: 0, prevX: 0, prevY: 0 },

    bind(canvas, size, handlers) {
      const s = this.state;

      /** Convert a pointer position into a cell coordinate. */
      function toCell(event) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * size.width / rect.width);
        const y = Math.floor((event.clientY - rect.top) * size.height / rect.height);
        return {
          x: Math.min(size.width - 1, Math.max(0, x)),
          y: Math.min(size.height - 1, Math.max(0, y))
        };
      }

      // ----- mouse and touch -----
      canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 && event.button !== 2) return;
        event.preventDefault();

        const cell = toCell(event);
        s.active = true;
        s.erase = event.button === 2;
        s.overwrite = event.shiftKey;
        s.hover = true;
        s.x = s.prevX = cell.x;
        s.y = s.prevY = cell.y;

        canvas.setPointerCapture(event.pointerId);   // keep painting if the pointer leaves the canvas
      });

      canvas.addEventListener('pointermove', (event) => {
        const cell = toCell(event);
        s.x = cell.x;
        s.y = cell.y;
        s.hover = true;
        s.overwrite = event.shiftKey;
      });

      const stop = () => { s.active = false; };
      canvas.addEventListener('pointerup', stop);
      canvas.addEventListener('pointercancel', stop);
      canvas.addEventListener('pointerleave', () => { if (!s.active) s.hover = false; });

      // Right-click erases, so the browser menu must not open
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());

      // ----- keyboard -----
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

        if (Object.prototype.hasOwnProperty.call(BY_HOTKEY, key)) {
          handlers.onSelect(BY_HOTKEY[key]);
          return;
        }

        switch (key) {
          case ' ':
            // A focused button handles Space itself
            if (event.target.tagName === 'BUTTON') return;
            event.preventDefault();
            handlers.onTogglePause();
            break;
          case '.': handlers.onStep(); break;
          case 'c': handlers.onClear(); break;
          case '[': handlers.onBrush(-1); break;
          case ']': handlers.onBrush(1); break;
          default: break;
        }
      });
    }
  };

  root.Sandbox.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);