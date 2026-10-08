/** Letters scramble through random glyphs before resolving — used on hover and reveal. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ✦*#%&@0123456789';
const running = new WeakMap<HTMLElement, number>();

export function scramble(el: HTMLElement, { duration = 700 } = {}) {
  const final = el.dataset.scrambleText ?? (el.dataset.scrambleText = el.textContent ?? '');
  cancelAnimationFrame(running.get(el) ?? 0);
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      if (ch === ' ' || p * final.length * 1.2 > i + final.length * 0.2) out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = p >= 1 ? final : out;
    if (p < 1) running.set(el, requestAnimationFrame(step));
  };
  running.set(el, requestAnimationFrame(step));
}

export function bindScramble(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const host = (el.closest('a, button') as HTMLElement) ?? el;
    host.addEventListener('mouseenter', () => scramble(el));
  });
}
