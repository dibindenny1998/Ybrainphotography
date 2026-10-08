/**
 * Ybrain Photography — motion.
 * GSAP for the hero, reveals and parallax (transform / opacity / clip-path only),
 * smooth scrolling on desktop, native scrolling on phones.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll(s)] as T[];
const E = 'expo.out';

/* ── smooth scroll (desktop) */
let lenis: Lenis | null = null;
if (fine && !reduce) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const lock = (on: boolean) => { if (lenis) on ? lenis.stop() : lenis.start(); document.body.style.overflow = on ? 'hidden' : ''; };

/* ── preloader → hero */
function preloader(): Promise<void> {
  return new Promise((resolve) => {
    const ld = $('[data-ld]');
    if (!ld) return resolve();
    let seen = false;
    try { seen = !!sessionStorage.getItem('yb-seen'); sessionStorage.setItem('yb-seen', '1'); } catch { /* ignore */ }
    if (reduce || seen) { ld.remove(); return resolve(); }
    lock(true);
    const shots = $$('[data-ld-shot]', ld);
    const frame = $('[data-ld-frame]', ld)!;
    const num = $('[data-ld-num]', ld)!;
    const step = 0.2;
    const c = { v: 0 };
    const tl = gsap.timeline({ onComplete: () => ld.remove() });
    tl.from(frame, { yPercent: 30, autoAlpha: 0, scale: 0.9, duration: 0.9, ease: E }, 0)
      .from('[data-ld-ui]', { autoAlpha: 0, y: 20, duration: 0.8, stagger: 0.1, ease: E }, 0.1);
    shots.forEach((s, i) => tl.set(shots, { autoAlpha: 0 }, 0.3 + i * step).set(s, { autoAlpha: 1 }, 0.3 + i * step));
    const end = 0.3 + shots.length * step;
    tl.to(c, { v: 100, duration: end, ease: 'power1.inOut', onUpdate: () => (num.textContent = String(Math.round(c.v))) }, 0);
    tl.add(() => {
      const target = $('[data-hero-frame]');
      gsap.to('[data-ld-ui]', { autoAlpha: 0, y: -20, duration: 0.5, stagger: 0.05 });
      if (target) Flip.fit(frame, target, { duration: 1.2, ease: 'expo.inOut', absolute: true });
      gsap.to('[data-ld-bg]', { autoAlpha: 0, duration: 0.7, delay: 0.6 });
    }, end + 0.1)
      .add(() => { lock(false); resolve(); }, end + 0.7)
      .to(frame, { autoAlpha: 0, duration: 0.3 }, end + 1.35);
  });
}

/* ── hero */
function heroIntro() {
  const title = $('[data-hero-title]');
  if (!title || reduce) return;
  gsap.timeline({ defaults: { ease: E } })
    .from('.hl > span', { yPercent: 110, rotate: 3, transformOrigin: '0 100%', duration: 1.5, stagger: 0.12 }, 0)
    .from('[data-hero-fade]', { y: 26, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.35)
    .from('.hdr', { yPercent: -100, autoAlpha: 0, duration: 1.1, clearProps: 'all' }, 0.2);
}

function heroSlides() {
  const slides = $$('[data-slide]');
  if (slides.length < 2) return;
  const n = $('[data-slide-n]'), cap = $('[data-slide-cap]'), bar = $('[data-slide-bar]');
  const HOLD = 4.6;
  let i = 0, visible = true;
  const prog = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none', paused: true, onComplete: () => next() });
  const next = () => {
    const cur = slides[i];
    i = (i + 1) % slides.length;
    const nx = slides[i];
    if (n) n.textContent = String(i + 1).padStart(2, '0');
    if (cap) gsap.fromTo(cap, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: E, onStart: () => (cap.textContent = nx.dataset.cap || '') });
    gsap.set(nx, { zIndex: 2 }); gsap.set(cur, { zIndex: 1 });
    gsap.timeline({ onComplete: () => { cur.classList.remove('is-on'); gsap.set(cur, { clipPath: 'inset(100% 0% 0% 0%)', zIndex: 0 }); nx.classList.add('is-on'); } })
      .fromTo(nx, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' })
      .fromTo($('img', nx), { scale: 1.2 }, { scale: 1, duration: 2, ease: E }, 0.1);
    prog.restart();
    if (!visible || document.hidden) prog.pause();
  };
  if (reduce) return;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? prog.play() : prog.pause(); }).observe(slides[0].parentElement!);
  document.addEventListener('visibilitychange', () => (document.hidden ? prog.pause() : visible && prog.play()));
  prog.play();
  gsap.to('[data-hero-frame] .img', { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('[data-hero-title]', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ── scroll reveals */
function reveals() {
  if (reduce) { gsap.set('[data-r]', { opacity: 1 }); gsap.set('[data-ri]', { clipPath: 'none' }); return; }
  // big headings: lines rise out of a mask
  $$('main .h1, main .h2, [data-split]').forEach((el) => {
    if (el.closest('[data-hero-title]')) return;
    el.removeAttribute('data-r');
    gsap.set(el, { opacity: 1 });
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (s) => gsap.from(s.lines, { yPercent: 110, duration: 1.4, stagger: 0.1, ease: E, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
    });
  });
  // text & small things: fade up
  ScrollTrigger.batch('[data-r]', {
    start: 'top 92%', once: true,
    onEnter: (b) => gsap.fromTo(b, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.3, ease: E, stagger: 0.08 }),
  });
  // images: wipe up + settle
  $$('[data-ri]').forEach((el) => {
    const img = $('img', el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: E, clearProps: 'transform' }, 0.1);
  });
  // parallax
  $$('[data-speed]').forEach((el) => {
    const k = (parseFloat(el.dataset.speed || '1') - 1) * 400;
    gsap.fromTo(el, { y: k }, { y: -k, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // the statement: words come into focus as you read
  const words = $$('[data-words] .w');
  if (words.length) gsap.fromTo(words, { opacity: 0.12, y: 8 }, { opacity: 1, y: 0, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: '[data-words]', start: 'top 82%', end: 'bottom 55%', scrub: true } });
  // footer wordmark rises
  const fw = $('[data-ftr-word]');
  if (fw) gsap.from(fw, { yPercent: 50, opacity: 0, duration: 1.6, ease: E, scrollTrigger: { trigger: fw, start: 'top 98%', once: true } });
}

/* ── header, menu, cursor, magnetic */
function chrome() {
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

  const menu = $('[data-menu]'), btn = $('[data-menu-btn]');
  btn?.addEventListener('click', () => {
    const open = menu!.hidden;
    menu!.hidden = !open;
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('span')!.textContent = open ? 'Close' : 'Menu';
    lock(open);
    if (open && !reduce) gsap.from($$('.menu__link', menu!), { yPercent: 60, opacity: 0, duration: 0.9, stagger: 0.05, ease: E });
  });

  if (!fine || reduce) return;
  root.classList.add('has-cur');
  const cur = $('[data-cur]')!;
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.4, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.4, ease: 'power3' });
  window.addEventListener('mousemove', (e) => {
    xTo(e.clientX); yTo(e.clientY);
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
    cur.classList.toggle('on', !!t && !(e.target as HTMLElement).closest('.lb'));
    if (t) cur.textContent = t.dataset.cursor || '';
  }, { passive: true });
  $$('[data-mag], .btn').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.3); });
    el.addEventListener('mouseleave', () => { x(0); y(0); });
  });
}

/* ── portfolio filter */
function filter() {
  const items = $$('[data-item]');
  if (!items.length) return;
  const grid = items[0].parentElement!;
  const set = (id: string, btn?: HTMLElement) => {
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === id)));
    const show = items.filter((it) => id === 'all' || it.dataset.cat === id);
    gsap.to(grid, { opacity: 0, y: 20, duration: reduce ? 0 : 0.35, ease: 'power2.in', onComplete: () => {
      items.forEach((it) => { it.hidden = !show.includes(it); gsap.set(it, { opacity: 1, y: 0 }); gsap.set($$('[data-ri]', it), { clipPath: 'none' }); });
      ScrollTrigger.refresh();
      gsap.to(grid, { opacity: 1, y: 0, duration: reduce ? 0 : 0.9, ease: E });
      if (!reduce) gsap.from(show.slice(0, 9), { y: 50, opacity: 0, duration: 1.1, stagger: 0.06, ease: E });
    } });
    history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`);
    void btn;
  };
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => set(b.dataset.filter!, b)));
  if (location.hash) { const id = location.hash.slice(1); if ($(`[data-filter="${id}"]`)) set(id); }
}

/* ── lightbox */
function lightbox() {
  const lb = $('[data-lb]');
  if (!lb) return;
  const img = $<HTMLImageElement>('img', lb)!;
  const cap = $('[data-lb-cap]', lb)!, count = $('[data-lb-count]', lb)!;
  let list: HTMLElement[] = [], cur = 0, last: HTMLElement | null = null;
  const best = (i: HTMLImageElement) => { const s = i.getAttribute('srcset'); return s ? s.split(',').pop()!.trim().split(' ')[0] : i.src; };
  const show = (n: number, dir = 0) => {
    cur = (n + list.length) % list.length;
    const t = $<HTMLImageElement>('img', list[cur])!;
    const swap = () => { img.src = best(t); img.alt = t.alt; cap.textContent = list[cur].dataset.caption || ''; count.textContent = `${cur + 1} / ${list.length}`; };
    if (!dir || reduce) { img.classList.add('on'); return swap(); }
    gsap.timeline().to(img, { x: -50 * dir, opacity: 0, duration: 0.3, ease: 'power2.in' }).add(swap).fromTo(img, { x: 50 * dir }, { x: 0, opacity: 1, duration: 0.8, ease: E });
  };
  const open = (el: HTMLElement) => {
    list = $$('[data-lb-item]').filter((x) => !x.closest('[hidden]'));
    last = document.activeElement as HTMLElement;
    show(list.indexOf(el));
    lb.hidden = false;
    lock(true);
    $('[data-cur]')?.classList.remove('on');
    if (!reduce) gsap.fromTo(img, { scale: 0.94, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.9, ease: E });
    requestAnimationFrame(() => lb.classList.add('is-open'));
    $<HTMLButtonElement>('[data-lb-close]', lb)?.focus();
  };
  const close = () => { lb.classList.remove('is-open'); setTimeout(() => { lb.hidden = true; lock(false); last?.focus(); }, 450); };
  $$('[data-lb-item]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(el); }));
  $('[data-lb-close]', lb)!.addEventListener('click', close);
  $('[data-lb-prev]', lb)!.addEventListener('click', () => show(cur - 1, -1));
  $('[data-lb-next]', lb)!.addEventListener('click', () => show(cur + 1, 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1, -1);
    if (e.key === 'ArrowRight') show(cur + 1, 1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
}

/* ── contact form → WhatsApp */
function form() {
  const f = $<HTMLFormElement>('[data-wa-form]');
  f?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const name = String(d.get('name') || '').trim();
    const err = $('[data-form-err]', f)!;
    if (!name) { err.textContent = 'Please add your name.'; f.querySelector<HTMLInputElement>('[name="name"]')?.focus(); return; }
    err.textContent = '';
    const date = String(d.get('date') || '');
    const nice = date ? new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const lines = [
      `Hello Ybrain, I'm ${name}.`,
      `I'd like to book a ${String(d.get('type')).toLowerCase()} session${nice ? ` around ${nice}` : ''}${d.get('place') ? ` (${d.get('place')})` : ''}.`,
      d.get('message') ? `\n${d.get('message')}` : '',
    ].filter(Boolean);
    window.open(`https://wa.me/${f.dataset.wa}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
}

/* ── boot */
async function boot() {
  const hasHero = !!$('[data-hero-title]');
  if (hasHero && !reduce) gsap.set('.hl > span', { yPercent: 110 });
  const intro = preloader();
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  chrome();
  heroSlides();
  reveals();
  filter();
  lightbox();
  form();
  await intro;
  if (hasHero && !reduce) { gsap.set('.hl > span', { clearProps: 'transform' }); heroIntro(); }
  ScrollTrigger.refresh();
}
boot();
window.addEventListener('load', () => ScrollTrigger.refresh());
