(function (root) {
  'use strict';

  const { Config, IDS, PALETTE, SHADES } = root.Sandbox;

  // Flames go from bright yellow, through orange, to dull red as they die
  const FIRE_COLORS = [
    [255, 235, 120], [255, 195, 60], [255, 135, 30], [225, 70, 20], [150, 40, 20]
  ];

  // These materials shimmer by cycling through their shades
  const SHIMMER = new Set([IDS.LAVA, IDS.ACID]);

  function fireColor(life, shade) {
    let index = life >= 45 ? 0 : life >= 30 ? 1 : life >= 18 ? 2 : life >= 8 ? 3 : 4;
    if (shade & 1) index = Math.min(FIRE_COLORS.length - 1, index + 1);
    return FIRE_COLORS[index];
  }

  /**
   * Draws the world onto the canvas. The canvas has exactly one pixel per
   * cell and is scaled up by CSS (with sharp pixels), so drawing a frame is
   * just filling one array of colors.
   */
  class Renderer {
    constructor(canvas, world) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.world = world;
      this.frame = 0;

      canvas.width = world.W;
      canvas.height = world.H;
      this.image = this.ctx.createImageData(world.W, world.H);
    }

    /** Draw one frame. `brush` is { x, y, r } for the preview circle, or null. */
    draw(brush) {
      this.frame++;
      const { cells, life, shade } = this.world;
      const data = this.image.data;
      const shimmer = this.frame >> 3;

      for (let i = 0, p = 0; i < cells.length; i++, p += 4) {
        const id = cells[i];
        let rgb;

        if (id === IDS.FIRE) {
          rgb = fireColor(life[i], shade[i]);
        } else {
          let s = shade[i];
          if (SHIMMER.has(id)) s = (s + shimmer) % SHADES;
          rgb = PALETTE[id][s];
        }

        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
      }

      this.ctx.putImageData(this.image, 0, 0);
      if (brush) this.drawBrush(brush);
    }

    /** A thin circle showing where the brush will paint. */
    drawBrush(brush) {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(brush.x + 0.5, brush.y + 0.5, brush.r + 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    /** Download the current picture as a PNG, enlarged so it is not tiny. */
    exportPng(scale) {
      this.draw(null);                                   // no brush circle in the picture

      const big = document.createElement('canvas');
      big.width = this.world.W * scale;
      big.height = this.world.H * scale;

      const bigCtx = big.getContext('2d');
      bigCtx.imageSmoothingEnabled = false;
      bigCtx.drawImage(this.canvas, 0, 0, big.width, big.height);

      big.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'sandbox.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, 'image/png');
    }
  }

  root.Sandbox.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);