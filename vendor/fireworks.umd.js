(function (global) {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pickColor() {
    const palette = ['#ff6b6b', '#ffd93d', '#6bcBef', '#4ecdc4', '#c77dff', '#ff9f1c', '#f72585'];
    return palette[(Math.random() * palette.length) | 0];
  }

  class Fireworks {
    constructor(container, options) {
      if (!container) throw new Error('A container element is required.');
      this.container = container;
      this.options = Object.assign({
        particleCount: 110,
        burstCount: 7,
        gravity: 0.065,
        friction: 0.985,
        fade: 0.012,
        spawnInterval: 150,
        burstSpacing: 180,
      }, options || {});
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.running = false;
      this.spawnTimer = null;
      this.raf = null;
      this.lastTime = 0;
    }

    _ensureCanvas() {
      if (this.canvas) return;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '0';
      this.container.appendChild(canvas);
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this._resize();
      this._resizeHandler = () => this._resize();
      window.addEventListener('resize', this._resizeHandler, { passive: true });
    }

    _resize() {
      if (!this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _spawnBurst() {
      if (!this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const originX = rand(rect.width * 0.2, rect.width * 0.8);
      const originY = rand(rect.height * 0.08, rect.height * 0.4);
      const count = this.options.particleCount;
      for (let i = 0; i < count; i += 1) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1.8, 5.2);
        this.particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(0.2, 1.6),
          life: rand(55, 95),
          age: 0,
          size: rand(1.6, 3.4),
          color: pickColor(),
          spin: rand(-0.08, 0.08),
          angle: rand(0, Math.PI * 2),
        });
      }
    }

    _tick = () => {
      if (!this.running || !this.ctx || !this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      this.particles = this.particles.filter((p) => p.age < p.life);
      for (const p of this.particles) {
        p.age += 1;
        p.vx *= this.options.friction;
        p.vy = p.vy * this.options.friction + this.options.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        const t = 1 - p.age / p.life;
        const alpha = clamp(t, 0, 1);
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle);
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size * (0.9 + t), p.size * 0.65, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.raf = window.requestAnimationFrame(this._tick);
    }

    start() {
      if (this.running) return;
      this._ensureCanvas();
      this.running = true;
      this._spawnBurst();
      let burstsLeft = Math.max(1, this.options.burstCount | 0);
      this.spawnTimer = window.setInterval(() => {
        if (!this.running) return;
        if (burstsLeft <= 0) {
          window.clearInterval(this.spawnTimer);
          this.spawnTimer = null;
          return;
        }
        this._spawnBurst();
        burstsLeft -= 1;
      }, this.options.burstSpacing);
      this._tick();
    }

    stop() {
      this.running = false;
      if (this.spawnTimer) {
        window.clearInterval(this.spawnTimer);
        this.spawnTimer = null;
      }
      if (this.raf) {
        window.cancelAnimationFrame(this.raf);
        this.raf = null;
      }
      this.particles = [];
      if (this.ctx && this.canvas) {
        const rect = this.container.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
      this.ctx = null;
    }
  }

  global.Fireworks = Fireworks;
  global.Fireworks.default = Fireworks;
  if (typeof module !== 'undefined' && module.exports) module.exports = Fireworks;
})(typeof window !== 'undefined' ? window : globalThis);
