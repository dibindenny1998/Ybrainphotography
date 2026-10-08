/**
 * Diya embers — glowing red/amber sparks drifting upward on a 2D canvas.
 * Used by the preloader and the enquiry section (the hero has a WebGL version).
 */
interface Spark { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number; tw: number }

export function embers(canvas: HTMLCanvasElement, { density = 1, origin = 'bottom' as 'bottom' | 'center' } = {}) {
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const sparks: Spark[] = [];
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (): Spark => {
    const fromCenter = origin === 'center';
    return {
      x: fromCenter ? w / 2 + (Math.random() - 0.5) * w * 0.3 : Math.random() * w,
      y: fromCenter ? h * 0.62 + (Math.random() - 0.5) * 40 : h + 10,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.35 + Math.random() * 1.1),
      r: 0.6 + Math.random() * 2.2,
      life: 0,
      max: 220 + Math.random() * 380,
      hue: Math.random(),
      tw: Math.random() * Math.PI * 2,
    };
  };
  const target = () => Math.round(((w * h) / 9000) * density);
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    while (sparks.length < target()) sparks.push(spawn());
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life++;
      s.tw += 0.08;
      s.x += s.vx + Math.sin(s.life * 0.02 + s.hue * 6) * 0.25;
      s.y += s.vy;
      const t = s.life / s.max;
      if (t >= 1 || s.y < -20) { sparks[i] = spawn(); continue; }
      const a = Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(s.tw));
      const col = s.hue > 0.55 ? '255,176,96' : s.hue > 0.2 ? '255,77,102' : '255,224,190';
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(0.35, `rgba(${col},${a * 0.35})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return {
    start() { if (!running) { running = true; tick(); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    destroy() { this.stop(); ro.disconnect(); },
  };
}
