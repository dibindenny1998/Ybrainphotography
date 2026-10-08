/**
 * Ybrain Photography — quiet motion.
 * Fades and image reveals on scroll (CSS transitions, driven by IntersectionObserver),
 * smooth wheel scrolling on desktop only, header behaviour, mobile menu,
 * the home hero cross-fade, portfolio filter + lightbox, and the WhatsApp form.
 */
import Lenis from 'lenis';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll(s)] as T[];

/* smooth scroll (desktop) */
let lenis: Lenis | null = null;
if (fine && !reduce) {
  lenis = new Lenis({ lerp: 0.1 });
  const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
const lock = (on: boolean) => { if (lenis) on ? lenis.stop() : lenis.start(); document.body.style.overflow = on ? 'hidden' : ''; };

/* reveals */
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { rootMargin: '0px 0px -8% 0px' },
);
$$('[data-r], [data-ri]').forEach((el) => io.observe(el));

/* header: solid after scroll, hides on scroll down */
const hdr = $('[data-hdr]');
let lastY = 0;
const onScroll = () => {
  const y = window.scrollY;
  hdr?.classList.toggle('is-scrolled', y > 40);
  hdr?.classList.toggle('is-hidden', y > 300 && y > lastY && !root.classList.contains('menu-open'));
  lastY = y;
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* mobile menu */
const menu = $('[data-menu]');
const menuBtn = $('[data-menu-btn]');
menuBtn?.addEventListener('click', () => {
  const open = menu!.hidden;
  menu!.hidden = !open;
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('span')!.textContent = open ? 'Close' : 'Menu';
  lock(open);
});

/* home hero: slow cross-fade */
const slides = $$('[data-slide]');
if (slides.length > 1 && !reduce) {
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    slides[i].classList.remove('is-on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-on');
    const cap = $('[data-slide-cap]');
    if (cap) cap.textContent = slides[i].dataset.cap || '';
  }, 5200);
}

/* portfolio: filter */
const items = $$('[data-item]');
$$('[data-filter]').forEach((b) =>
  b.addEventListener('click', () => {
    const id = b.dataset.filter!;
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    items.forEach((it) => {
      const show = id === 'all' || it.dataset.cat === id;
      it.hidden = !show;
      if (show) { it.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => it.classList.add('in'))); }
    });
    history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`);
  }),
);
if (items.length && location.hash) $(`[data-filter="${location.hash.slice(1)}"]`)?.click();

/* lightbox */
const lb = $('[data-lb]');
if (lb) {
  const img = $<HTMLImageElement>('img', lb)!;
  const cap = $('[data-lb-cap]', lb)!;
  const count = $('[data-lb-count]', lb)!;
  let list: HTMLElement[] = [];
  let cur = 0;
  let last: HTMLElement | null = null;
  const best = (i: HTMLImageElement) => { const s = i.getAttribute('srcset'); return s ? s.split(',').pop()!.trim().split(' ')[0] : i.src; };
  const show = (n: number) => {
    cur = (n + list.length) % list.length;
    const t = $<HTMLImageElement>('img', list[cur])!;
    img.classList.remove('on');
    img.onload = () => img.classList.add('on');
    img.src = best(t);
    img.alt = t.alt;
    cap.textContent = list[cur].dataset.caption || '';
    count.textContent = `${cur + 1} / ${list.length}`;
  };
  const open = (el: HTMLElement) => {
    list = $$('[data-lb-item]').filter((x) => !x.closest('[hidden]'));
    last = document.activeElement as HTMLElement;
    show(list.indexOf(el));
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    lock(true);
    $<HTMLButtonElement>('[data-lb-close]', lb)?.focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; lock(false); last?.focus(); }, 450);
  };
  $$('[data-lb-item]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(el); }));
  $('[data-lb-close]', lb)!.addEventListener('click', close);
  $('[data-lb-prev]', lb)!.addEventListener('click', () => show(cur - 1));
  $('[data-lb-next]', lb)!.addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
}

/* contact form → WhatsApp */
const form = $<HTMLFormElement>('[data-wa-form]');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const name = String(d.get('name') || '').trim();
  const err = $('[data-form-err]', form)!;
  if (!name) { err.textContent = 'Please add your name.'; form.querySelector<HTMLInputElement>('[name="name"]')?.focus(); return; }
  err.textContent = '';
  const date = String(d.get('date') || '');
  const nice = date ? new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const lines = [
    `Hello Ybrain, I'm ${name}.`,
    `I'd like to book a ${String(d.get('type')).toLowerCase()} session${nice ? ` around ${nice}` : ''}${d.get('place') ? ` (${d.get('place')})` : ''}.`,
    d.get('message') ? `\n${d.get('message')}` : '',
  ].filter(Boolean);
  window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
});
