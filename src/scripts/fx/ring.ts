/**
 * 3D photo ring — a cylinder of photos you can drag with momentum.
 * Spins gently on its own and reacts to scroll speed.
 */
import gsap from 'gsap';

export function photoRing(stage: HTMLElement, onOpen: (index: number) => void) {
  const ring = stage.querySelector<HTMLElement>('[data-ring]')!;
  const cards = [...ring.querySelectorAll<HTMLElement>('[data-ring-card]')];
  const n = cards.length;
  let radius = 0, rot = 0, vel = 0.06, dragging = false, moved = 0, lastX = 0, boost = 0;

  const layout = () => {
    const cw = cards[0].offsetWidth;
    radius = Math.round((cw / 2 / Math.tan(Math.PI / n)) * 1.22);
    cards.forEach((c, i) => (c.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`));
    ring.style.setProperty('--r', radius + 'px');
  };
  layout();
  window.addEventListener('resize', layout);

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    vel = dx * 0.18;
    rot += vel;
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (moved < 6) {
      const card = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-ring-card]');
      if (card) onOpen(Number(card.dataset.ringCard));
    }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  let visible = false;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(stage);

  gsap.ticker.add(() => {
    if (!visible) return;
    if (!dragging) {
      vel += (0.06 + boost - vel) * 0.025; // ease back to a slow auto-spin
      rot += vel;
    }
    boost *= 0.92;
    ring.style.transform = `translateZ(${-radius}px) rotateX(-6deg) rotateY(${rot}deg)`;
    // depth shading: cards facing away fade back
    cards.forEach((c, i) => {
      const a = (((360 / n) * i + rot) % 360 + 360) % 360;
      const facing = Math.cos((a * Math.PI) / 180); // 1 = front
      c.style.opacity = String(0.25 + 0.75 * Math.max(0, facing) ** 0.8 + 0.08);
      c.style.filter = `brightness(${0.45 + 0.55 * Math.max(0, facing)})`;
      c.style.zIndex = String(Math.round(facing * 100) + 100);
    });
  });

  return { kick: (v: number) => (boost = gsap.utils.clamp(-3, 3, v)) };
}
