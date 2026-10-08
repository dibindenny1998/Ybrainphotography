/**
 * Cursor image trail — photos drop in behind the pointer and fade away.
 * On touch screens (or when idle) a gentle automatic trail plays instead.
 */
import gsap from 'gsap';

export function imageTrail(area: HTMLElement, sources: string[]) {
  const layer = area.querySelector<HTMLElement>('[data-trail-layer]')!;
  const pool: HTMLImageElement[] = [];
  const POOL = 14;
  for (let i = 0; i < POOL; i++) {
    const img = document.createElement('img');
    img.className = 'trail__img';
    img.alt = '';
    img.decoding = 'async';
    img.src = sources[i % sources.length];
    layer.appendChild(img);
    pool.push(img);
  }
  let idx = 0, srcIdx = POOL % sources.length, z = 1;
  let last = { x: 0, y: 0 }, inside = false, lastMove = 0;
  const THRESH = window.innerWidth < 768 ? 60 : 90;

  const drop = (x: number, y: number, dx: number, dy: number) => {
    const img = pool[idx++ % POOL];
    img.src = sources[srcIdx++ % sources.length];
    const r = area.getBoundingClientRect();
    const w = window.innerWidth < 768 ? 120 : 210;
    gsap.killTweensOf(img);
    gsap.set(img, { width: w, x: x - r.left - w / 2, y: y - r.top - w * 0.62, zIndex: z++, autoAlpha: 1, scale: 0.4, rotate: gsap.utils.random(-12, 12), filter: 'brightness(1.6)' });
    gsap.timeline()
      .to(img, { scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'expo.out' })
      .to(img, { x: `+=${dx * 0.6}`, y: `+=${dy * 0.6}`, duration: 1.2, ease: 'power3.out' }, 0)
      .to(img, { autoAlpha: 0, scale: 0.6, y: '+=60', duration: 0.9, ease: 'power2.in' }, 0.75);
  };

  area.addEventListener('pointermove', (e) => {
    inside = true;
    lastMove = performance.now();
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (Math.hypot(dx, dy) > THRESH) {
      drop(e.clientX, e.clientY, dx, dy);
      last = { x: e.clientX, y: e.clientY };
    }
  });
  area.addEventListener('pointerleave', () => (inside = false));

  // idle / touch: an automatic figure-of-eight trail so phones see it too
  let t = 0, visible = false;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(area);
  const auto = () => {
    if (visible && (!inside || performance.now() - lastMove > 2500)) {
      t += 1;
      const r = area.getBoundingClientRect();
      const a = t * 0.55;
      const x = r.left + r.width / 2 + Math.sin(a) * r.width * 0.32;
      const y = r.top + r.height / 2 + Math.sin(a * 2) * r.height * 0.18;
      drop(x, y, Math.cos(a) * 40, Math.cos(a * 2) * 20);
    }
  };
  setInterval(auto, 420);
}
