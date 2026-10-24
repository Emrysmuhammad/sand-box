(function (root) {
  'use strict';

  const { MATERIALS, DISPLAY_ORDER } = root.Sandbox;

  /**
   * Everything that touches the page controls lives here. It only displays
   * what it is told to display. It never decides what the sandbox should do.
   */
  class UI {
    constructor(doc) {
      this.doc = doc;
      const $ = (id) => doc.getElementById(id);

      this.el = {
        canvas: $('canvas'),
        palette: $('palette'),
        brushSize: $('brush-size'),
        brushLabel: $('brush-label'),
        speed: $('speed'),
        speedLabel: $('speed-label'),
        pause: $('pause-btn'),
        step: $('step-btn'),
        clear: $('clear-btn'),
        save: $('save-btn'),
        load: $('load-btn'),
        png: $('png-btn'),
        particles: $('stat-particles'),
        fps: $('stat-fps'),
        toast: $('toast')
      };

      this.toolButtons = new Map();   // material id -> its button
      this.toastTimer = null;
    }

    /** Create one button per material. */
    buildPalette(onSelect) {
      DISPLAY_ORDER.forEach((id) => {
        const material = MATERIALS[id];

        const button = this.doc.createElement('button');
        button.type = 'button';
        button.className = 'tool';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');

        const swatch = this.doc.createElement('span');
        swatch.className = 'tool__swatch';
        swatch.style.background = 'rgb(' + material.base.join(',') + ')';

        const name = this.doc.createElement('span');
        name.className = 'tool__name';
        name.textContent = material.name;

        const key = this.doc.createElement('span');
        key.className = 'tool__key';
        key.textContent = material.hotkey.toUpperCase();

        button.appendChild(swatch);
        button.appendChild(name);
        button.appendChild(key);
        button.addEventListener('click', () => onSelect(id));

        this.el.palette.appendChild(button);
        this.toolButtons.set(id, button);
      });
    }

    setActiveTool(id) {
      this.toolButtons.forEach((button, buttonId) => {
        const active = buttonId === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-checked', String(active));
      });
    }

    setBrush(size) {
      this.el.brushSize.value = String(size);
      this.el.brushLabel.textContent = String(size);
    }

    setSpeed(speed) {
      this.el.speed.value = String(speed);
      this.el.speedLabel.textContent = speed + '\u00D7';
    }

    setPaused(paused) {
      this.el.pause.textContent = paused ? '\u25B6 Play' : '\u23F8 Pause';
      this.el.step.disabled = !paused;
    }

    setStats(particles, fps) {
      this.el.particles.textContent = String(particles);
      this.el.fps.textContent = String(fps);
    }

    /** A short message at the bottom of the screen. */
    toast(message) {
      this.el.toast.textContent = message;
      this.el.toast.hidden = false;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.el.toast.hidden = true; }, 2200);
    }
  }

  root.Sandbox.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);