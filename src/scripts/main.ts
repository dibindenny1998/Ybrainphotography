/**
 * Ybrain Photography — motion & interaction.
 * Built for smoothness: only transform / opacity / clip-path animations,
 * smooth scrolling on desktop only (phones keep native scrolling),
 * and nothing runs while it is off screen.
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
const desktop = () => window.innerWidth >= 1024;
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll(s)] as T[];
if (reduce) root.classList.add('no-motion');
ScrollTrigger.config({ ignoreMobileResize: true });

/* ── smooth scroll: desktop pointers only */
let lenis: Lenis | null = null;
if (!reduce && fine) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
const startScroll = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));
const scrollTo = (target: string | HTMLElement | number) => {
  if (lenis) return lenis.scrollTo(target as any, { duration: 1.4 });
  if (typeof target === 'number') return window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
  const el = typeof target === 'string' ? $(target) : target;
  el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};

/* ── preloader: photos flick by, then the frame flies into the hero slideshow */
function preloader(): Promise<void> {
  return new Promise((resolve) => {
    const loader = $('.loader');
    if (!loader || reduce) { loader?.remove(); return resolve(); }
    stopScroll();
    const quick = (() => { try { return !!sessionStorage.getItem('ybrain-seen'); } catch { return false; } })();
    const shots = $$('[data-loader-shot]', loader);
    const frame = $('[data-loader-frame]', loader)!;
    const num = $('[data-loader-num]', loader)!;
    const step = quick ? 0.08 : 0.2;
    const count = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        try { sessionStorage.setItem('ybrain-seen', '1'); } catch { /* ignore */ }
      },
    });
    tl.from(frame, { yPercent: 20, autoAlpha: 0, duration: 0.7, ease: 'expo.out' }, 0);
    shots.forEach((s, i) => tl.set(shots, { autoAlpha: 0 }, 0.25 + i * step).set(s, { autoAlpha: 1 }, 0.25 + i * step));
    const flickEnd = 0.25 + shots.length * step;
    tl.to(count, { v: 100, duration: flickEnd, ease: 'power1.inOut', onUpdate: () => (num.textContent = String(Math.round(count.v))) }, 0)
      .to('[data-loader-bar]', { scaleX: 1, duration: flickEnd, ease: 'power1.inOut' }, 0)
      .to('.loader__logo .logo__word', { strokeDashoffset: 0, duration: flickEnd, ease: 'power2.inOut' }, 0)
      .to('.loader__logo .logo__swash', { strokeDashoffset: 0, duration: 0.4 }, flickEnd - 0.2)
      .fromTo('.loader__logo .logo__dot', { attr: { r: 0 } }, { attr: { r: 6.5 }, duration: 0.3 }, flickEnd);
    // fly the frame onto the hero slideshow
    tl.add(() => {
      const target = $('[data-hero-slides]');
      if (!target) return;
      Flip.fit(frame, target, { duration: 1.1, ease: 'expo.inOut', absolute: true });
      gsap.to(['.loader__count', '.loader__bar', '.loader__brand'], { autoAlpha: 0, duration: 0.4 });
      gsap.to('[data-loader-bg]', { autoAlpha: 0, duration: 0.6, delay: 0.55 });
    }, flickEnd + 0.15)
      .add(() => { startScroll(); resolve(); }, flickEnd + 0.75)
      .to({}, { duration: 1.35 });
  });
}

/* ── hero */
function heroIntro() {
  if (reduce) return;
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .fromTo('[data-hero-line]', { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.1 }, 0)
    .from('[data-hero-fade]', { y: 20, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.35)
    .from('.nav', { yPercent: -100, duration: 1, clearProps: 'transform' }, 0.2)
    .from('.hero__cap, .hero__progress', { autoAlpha: 0, duration: 0.8 }, 0.6);
}

function heroSlideshow() {
  const slides = $$('[data-hero-slide]');
  if (slides.length < 2) return;
  const capts = $$('[data-hero-capt]');
  const idx = $('[data-hero-index]')!;
  const bar = $('[data-hero-progress]')!;
  const HOLD = 4.2;
  let i = 0;
  let visible = true;
  const progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none', paused: true, onComplete: () => next() });
  const next = () => {
    const cur = slides[i];
    i = (i + 1) % slides.length;
    const nx = slides[i];
    capts.forEach((c, k) => c.classList.toggle('is-active', k === i));
    idx.textContent = String(i + 1).padStart(2, '0');
    gsap.set(nx, { zIndex: 2 });
    gsap.set(cur, { zIndex: 1 });
    gsap.timeline({ onComplete: () => { cur.classList.remove('is-active'); gsap.set(cur, { clipPath: 'inset(0% 0% 100% 0%)', zIndex: 0 }); nx.classList.add('is-active'); } })
      .fromTo(nx, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
      .fromTo($('img', nx), { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    progress.restart();
    if (!visible || document.hidden) progress.pause();
  };
  if (reduce) return;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? progress.play() : progress.pause(); }).observe($('[data-hero-show]')!);
  document.addEventListener('visibilitychange', () => (document.hidden ? progress.pause() : visible && progress.play()));
  $('[data-hero-show]')!.addEventListener('click', () => scrollTo('#gallery'));
  progress.play();
  // gentle depth on scroll
  gsap.to('[data-hero-slides] .img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ── reveals */
function splits() {
  if (reduce) return;
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (s) => gsap.from(s.lines, { yPercent: 105, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } }),
    });
  });
}

function fadeUps() {
  if (reduce) return;
  const els = $$('[data-fade-up]');
  gsap.set(els, { y: 30, autoAlpha: 0 });
  ScrollTrigger.batch(els, { start: 'top 90%', once: true, onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.06 }) });
}

function clipReveal(el: Element, delay = 0) {
  gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, delay, ease: 'expo.inOut' });
  const img = $('img', el);
  if (img) gsap.fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.6, delay: delay + 0.05, ease: 'expo.out' });
}

function statement() {
  if (reduce) return;
  const words = $$('[data-statement] .sw');
  gsap.fromTo(words, { opacity: 0.15 }, { opacity: 1, stagger: 0.04, ease: 'none', scrollTrigger: { trigger: '[data-statement]', start: 'top 80%', end: 'bottom 55%', scrub: true } });
  $$('[data-speed]').forEach((el) => {
    const k = (parseFloat(el.dataset.speed || '1') - 1) * 300;
    gsap.fromTo(el, { y: k }, { y: -k, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.statement__pic').forEach((p) => ScrollTrigger.create({ trigger: p, start: 'top 90%', once: true, onEnter: () => clipReveal(p) }));
}

/* ── services index */
function services() {
  const rows = $$('[data-srv]');
  if (!reduce) gsap.from(rows, { yPercent: 100, duration: 1.1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '[data-services]', start: 'top 85%', once: true } });
  const float = $('[data-srv-float]');
  if (!float || !fine || reduce) return;
  const imgs = $$('[data-srv-img]', float);
  const xTo = gsap.quickTo(float, 'x', { duration: 0.5, ease: 'power3' });
  const yTo = gsap.quickTo(float, 'y', { duration: 0.5, ease: 'power3' });
  const list = $('[data-services]')!;
  list.addEventListener('mousemove', (e) => { xTo(e.clientX + 30); yTo(e.clientY - 140); });
  list.addEventListener('mouseenter', (e) => { gsap.set(float, { x: e.clientX + 30, y: e.clientY - 140 }); gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' }); });
  list.addEventListener('mouseleave', () => gsap.to(float, { autoAlpha: 0, scale: 0.7, duration: 0.4, ease: 'expo.out' }));
  rows.forEach((r) => r.addEventListener('mouseenter', () => imgs.forEach((im) => im.classList.toggle('is-active', im.dataset.srvImg === r.dataset.srv))));
}

/* ── gallery + filter + lightbox */
let revealedAll = false;
function gallery() {
  const items = $$('[data-gitem]');
  if (!items.length) return;
  if (!reduce) {
    const media = items.map((i) => $('[data-reveal]', i)!);
    gsap.set(media, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch(media, { start: 'top 94%', once: true, onEnter: (b) => b.forEach((m, k) => clipReveal(m, k * 0.08)) });
  }
  $$('[data-filter]').forEach((c) => c.addEventListener('click', () => setFilter(c.dataset.filter!)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); setFilter(a.dataset.filterLink!, true); scrollTo('#gallery'); }));
}

function setFilter(id: string, instant = false) {
  const items = $$('[data-gitem]');
  if (!revealedAll) {
    revealedAll = true;
    items.forEach((it) => { const m = $('[data-reveal]', it)!; gsap.killTweensOf(m); gsap.set(m, { clipPath: 'none' }); gsap.set($('img', m), { scale: 1 }); });
  }
  $$('[data-filter]').forEach((c) => {
    const on = c.dataset.filter === id;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-selected', String(on));
    if (on) c.parentElement!.scrollTo({ left: c.offsetLeft - 20, behavior: 'smooth' });
  });
  const grid = $('[data-gallery]')!;
  const h0 = grid.offsetHeight;
  const state = Flip.getState(items);
  items.forEach((it) => it.classList.toggle('is-hidden', id !== 'all' && it.dataset.cat !== id));
  if (reduce || instant) { ScrollTrigger.refresh(); return; }
  gsap.fromTo(grid, { height: h0 }, { height: grid.offsetHeight, duration: 0.8, ease: 'expo.inOut', clearProps: 'height' });
  Flip.from(state, {
    duration: 0.8, ease: 'expo.inOut', absolute: true, stagger: 0.015,
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.04, delay: 0.2 }),
    onLeave: (els) => gsap.to(els, { autoAlpha: 0, duration: 0.3 }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}

function lightbox() {
  const lb = $('[data-lb]');
  if (!lb) return;
  const img = $<HTMLImageElement>('[data-lb-img]', lb)!;
  const frame = $('[data-lb-frame]', lb)!;
  let list: HTMLElement[] = [];
  let cur = 0;
  let lastFocus: HTMLElement | null = null;
  const best = (i: HTMLImageElement) => { const ss = i.getAttribute('srcset'); return ss ? ss.split(',').pop()!.trim().split(' ')[0] : i.currentSrc || i.src; };
  const fill = (n: number) => {
    cur = (n + list.length) % list.length;
    const fig = list[cur];
    const t = $<HTMLImageElement>('img', fig)!;
    img.src = best(t);
    img.width = Number(t.getAttribute('width'));
    img.height = Number(t.getAttribute('height'));
    img.alt = t.alt;
    $('[data-lb-cap]', lb)!.textContent = $('.gitem__cap span', fig)?.textContent ?? '';
    $('[data-lb-cat]', lb)!.textContent = $('.gitem__cap .muted', fig)?.textContent ?? '';
    $('[data-lb-index]', lb)!.textContent = String(cur + 1).padStart(2, '0');
  };
  const go = (d: number) => {
    if (reduce) return fill(cur + d);
    gsap.timeline()
      .to(frame, { x: -40 * d, autoAlpha: 0, duration: 0.25, ease: 'power2.in' })
      .add(() => fill(cur + d))
      .fromTo(frame, { x: 40 * d }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
  };
  const open = (fig: HTMLElement) => {
    list = $$('[data-gitem]').filter((f) => !f.classList.contains('is-hidden'));
    $('[data-lb-total]', lb)!.textContent = String(list.length).padStart(2, '0');
    lastFocus = document.activeElement as HTMLElement;
    fill(list.indexOf(fig));
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    stopScroll();
    hideCursor();
    gsap.timeline()
      .to('.lightbox__bg', { opacity: 1, duration: 0.4 })
      .fromTo(frame, { y: 40, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' }, 0.1)
      .fromTo(['.lightbox__top', '.lightbox__cap', '.lightbox__nav'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.3);
    $<HTMLButtonElement>('.lightbox__close', lb)?.focus({ preventScroll: true });
  };
  const close = () => {
    gsap.timeline({ onComplete: () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); startScroll(); lastFocus?.focus({ preventScroll: true }); } })
      .to([frame, '.lightbox__top', '.lightbox__cap', '.lightbox__nav'], { autoAlpha: 0, duration: 0.25 })
      .to('.lightbox__bg', { opacity: 0, duration: 0.35 }, 0.1);
  };
  $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => open(b.closest('[data-gitem]') as HTMLElement)));
  $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', close));
  $('[data-lb-next]', lb)!.addEventListener('click', () => go(1));
  $('[data-lb-prev]', lb)!.addEventListener('click', () => go(-1));
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90) close();
  });
}

/* ── stories: horizontal pin on desktop, native swipe on phones */
function stories() {
  const track = $('[data-stories-track]');
  const bar = $('[data-stories-progress]');
  if (!track || !bar) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '[data-stories-pin]', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, onUpdate: (s) => gsap.set(bar, { scaleX: s.progress }) },
    });
    $$('[data-story-main] img').forEach((im) => gsap.fromTo(im, { xPercent: -6, scale: 1.12 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: im.closest('[data-story]')!, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
  });
  mm.add('(max-width: 1023px)', () => {
    const vp = $('[data-stories-viewport]')!;
    const on = () => gsap.set(bar, { scaleX: vp.scrollLeft / Math.max(1, vp.scrollWidth - vp.clientWidth) });
    vp.addEventListener('scroll', on, { passive: true });
    return () => vp.removeEventListener('scroll', on);
  });
}

/* ── about, contact, footer */
function about() {
  if (reduce) return;
  $$('[data-reveal-clip]').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => clipReveal(el) }));
  gsap.fromTo('.about__badge', { rotate: -30 }, { rotate: 20, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.contact__pic', { yPercent: 30, autoAlpha: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 85%', once: true } });
  gsap.from('.footer__word', { yPercent: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '[data-footer-mark]', start: 'top 95%', once: true } });
  const sig = $$('.footer__sig path');
  gsap.to(sig, { strokeDashoffset: 0, duration: 2, stagger: 0.9, ease: 'power2.inOut', scrollTrigger: { trigger: '[data-footer-mark]', start: 'top 85%', once: true } });
}
function enquiryForm() {
  const form = $<HTMLFormElement>('[data-wa-form]');
  if (!form) return;
  const err = $('[data-form-err]', form)!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const name = String(d.get('name') || '').trim();
    if (!name) { err.textContent = 'May we have your name first?'; form.querySelector<HTMLInputElement>('[name="name"]')?.focus(); return; }
    err.textContent = '';
    const date = String(d.get('date') || '');
    const nice = date ? new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const lines = [
      `Hi Ybrain! I'm ${name}.`,
      `I'm looking for a *${d.get('type')}* shoot${nice ? ` on ${nice}` : ''}${d.get('place') ? ` in ${d.get('place')}` : ''}.`,
      d.get('message') ? `\n${d.get('message')}` : '',
      d.get('phone') ? `\nYou can also reach me on ${d.get('phone')}.` : '',
    ].filter(Boolean);
    window.open(`https://wa.me/${form.dataset.waNumber}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
}
if (reduce) $$('.logo--draw path').forEach((p) => (p.style.strokeDashoffset = '0'));

/* ── nav, menu, fab */
function nav() {
  const navEl = $('[data-nav]')!;
  root.style.setProperty('--navh', navEl.offsetHeight + 'px');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (s) => {
      const y = s.scroll();
      if (root.classList.contains('menu-open')) return;
      const hide = y > 160 && y > lastY;
      navEl.classList.toggle('is-hidden', hide);
      navEl.classList.toggle('is-solid', y > 60);
      root.classList.toggle('nav-shown', !hide && y > 60);
      $('[data-fab]')?.classList.toggle('is-on', y > window.innerHeight * 0.8);
      lastY = y;
    },
  });
  // nav colour follows the section beneath it
  const darks = $$('[data-theme="dark"]');
  const active = new Set<Element>();
  darks.forEach((sec) => ScrollTrigger.create({
    trigger: sec, start: 'top 30px', end: 'bottom 30px', refreshPriority: -1,
    onToggle: (s) => { s.isActive ? active.add(sec) : active.delete(sec); root.classList.toggle('nav-light', active.size === 0); },
  }));

  const menu = $('[data-menu]')!;
  const toggle = $('[data-menu-toggle]')!;
  let open = false;
  const tl = gsap.timeline({ paused: true })
    .to('.menu__bg', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' })
    .from('.menu__word', { yPercent: 110, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, 0.35)
    .from('.menu__n, .menu__foot > *', { autoAlpha: 0, duration: 0.5, stagger: 0.04 }, 0.5);
  const set = (v: boolean) => {
    open = v;
    root.classList.toggle('menu-open', v);
    menu.classList.toggle('is-open', v);
    menu.setAttribute('aria-hidden', String(!v));
    toggle.setAttribute('aria-expanded', String(v));
    toggle.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    navEl.classList.remove('is-hidden');
    if (v) { stopScroll(); tl.timeScale(1).play(); } else { startScroll(); tl.timeScale(1.5).reverse(); }
  };
  toggle.addEventListener('click', () => set(!open));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && open && set(false));
  $$('[data-menu-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); set(false); setTimeout(() => scrollTo(a.getAttribute('href')!), 300); }));
  $$('a[href^="#"]:not([data-menu-link]):not([data-filter-link])').forEach((a) => a.addEventListener('click', (e) => {
    const h = a.getAttribute('href')!;
    e.preventDefault();
    scrollTo(h === '#top' ? 0 : h);
  }));
}

/* ── cursor label + magnetic buttons */
let hideCursor = () => {};
function cursor() {
  if (!fine || reduce) return;
  const c = $('.cursor');
  if (!c) return;
  root.classList.add('has-cursor');
  const label = $('.cursor__label', c)!;
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  hideCursor = () => c.classList.remove('is-on');
  window.addEventListener('mousemove', (e) => {
    xTo(e.clientX); yTo(e.clientY);
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
    c.classList.toggle('is-on', !!t && !(e.target as HTMLElement).closest('.lightbox'));
    if (t) label.textContent = t.dataset.cursor || '';
  }, { passive: true });
}
function buttons() {
  $$('.btn').forEach((b) => b.addEventListener('pointerenter', (e) => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
    b.style.setProperty('--by', `${((e.clientY - r.top) / r.height) * 100}%`);
  }));
  if (!fine || reduce) return;
  $$('[data-magnetic]').forEach((el) => {
    const s = parseFloat(el.dataset.magnetic || '0.25');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * s); yTo((e.clientY - r.top - r.height / 2) * s); });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* ── boot */
async function boot() {
  const intro = preloader();
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  stories(); // pinned section first
  nav();
  cursor();
  buttons();
  heroSlideshow();
  statement();
  services();
  gallery();
  lightbox();
  splits();
  fadeUps();
  about();
  enquiryForm();
  if (!reduce) gsap.set('[data-hero-line]', { yPercent: 110 });
  await intro;
  heroIntro();
  ScrollTrigger.refresh();
}
boot();
window.addEventListener('load', () => ScrollTrigger.refresh());
