/**
 * Ybrain Photography — motion & interaction
 * GSAP (ScrollTrigger, SplitText, Flip) + Lenis smooth scrolling
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll(s)] as T[];
if (reduce) root.classList.add('no-motion');

/* ─────────────────────────────────────────── smooth scroll */
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
const startScroll = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));
function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.6 });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}

/* ─────────────────────────────────────────── preloader */
function preloader(): Promise<void> {
  return new Promise((resolve) => {
    const loader = $('.loader');
    if (!loader || reduce) {
      loader?.remove();
      return resolve();
    }
    stopScroll();
    const quick = root.classList.contains('is-return');
    const word = $('.logo__word', loader)!;
    const swash = $('.logo__swash', loader)!;
    const dot = $('.logo__dot', loader)!;
    const num = $('.loader__num', loader)!;
    const counter = { v: 0 };
    const d = quick ? 0.9 : 2;
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        try { sessionStorage.setItem('ybrain-seen', '1'); } catch (e) { /* private mode */ }
      },
    });
    tl.to(word, { strokeDashoffset: 0, duration: d, ease: 'power2.inOut' })
      .to(swash, { strokeDashoffset: 0, duration: d * 0.42, ease: 'power2.out' }, '-=0.12')
      .to(dot, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, '-=0.45')
      .to(counter, { v: 100, duration: tl.duration(), ease: 'power1.inOut', onUpdate: () => (num.textContent = String(Math.round(counter.v)).padStart(2, '0')) }, 0)
      .to('.loader__curtain', { scaleY: 1, duration: 0.85, ease: 'expo.inOut' }, '+=0.1')
      .set('.loader__inner', { autoAlpha: 0 })
      .to('.loader__curtain', { scaleY: 0, transformOrigin: 'top', duration: 0.95, ease: 'expo.inOut' })
      .add(() => { startScroll(); resolve(); }, '-=0.75');
  });
}

/* ─────────────────────────────────────────── hero */
function heroIntro() {
  const lines = $$('[data-hero-line]');
  const pills = $$('[data-hero-pill]');
  const fades = $$('[data-hero-fade]');
  if (reduce) return;
  const widths = pills.map((p) => p.getBoundingClientRect().width);
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.nav', { yPercent: -120, duration: 1.2, clearProps: 'transform' }, 0)
    .from(lines, { yPercent: 115, rotate: 3, transformOrigin: '0 100%', duration: 1.6, stagger: 0.11 }, 0)
    .from(pills, { width: 0, marginInline: 0, duration: 1.6, stagger: 0.12, ease: 'expo.inOut', clearProps: 'width,marginInline' }, 0.15)
    .from($$('img', $('.hero')!).filter((i) => i.closest('[data-hero-pill]')), { scale: 1.6, duration: 2, ease: 'expo.out' }, 0.3)
    .from(fades, { y: 24, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 0.5)
    .from('.hero__flower', { scale: 0, rotate: -120, duration: 1.6, stagger: 0.2 }, 0.8);
  void widths;
}

function heroScroll() {
  if (reduce) return;
  const hero = $('.hero')!;
  const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  tl.to('.hero__row--1', { xPercent: -10, ease: 'none' }, 0)
    .to('.hero__row--2', { xPercent: 6, ease: 'none' }, 0)
    .to('.hero__row--3', { xPercent: -6, ease: 'none' }, 0)
    .to('.hero__title', { yPercent: -18, ease: 'none' }, 0)
    .to('.hero__foot', { autoAlpha: 0, y: -40, ease: 'none' }, 0);
}

function reel() {
  const frame = $('[data-reel-frame]');
  if (!frame || reduce) return;
  const mm = gsap.matchMedia();
  mm.add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, (ctx) => {
    const { mobile } = ctx.conditions as { mobile: boolean };
    const start = mobile ? 'inset(22% 12% 20% 12% round 50vw 50vw 0vw 0vw)' : 'inset(16% 22% 16% 22% round 50vw 50vw 0vw 0vw)';
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.reel', start: 'top top', end: '+=160%', pin: true, scrub: 1, anticipatePin: 1 },
    });
    tl.fromTo(frame, { clipPath: start }, { clipPath: 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)', ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('[data-reel-media]', { scale: 1.3 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .to('.reel__w--l', { xPercent: -70, autoAlpha: 0, ease: 'power2.in', duration: 0.6 }, 0)
      .to('.reel__w--r', { xPercent: 70, autoAlpha: 0, ease: 'power2.in', duration: 0.6 }, 0)
      .to('.reel__ticker', { autoAlpha: 0, duration: 0.3 }, 0)
      .to('.reel__shade', { opacity: 1, duration: 0.4 }, 0.6)
      .fromTo('[data-reel-caption]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.75)
      .to({}, { duration: 0.25 });
    // arch gently rises as you approach it
    gsap.from(frame, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'top top', scrub: true } });
  });
}

/* ─────────────────────────────────────────── generic reveals */
function splitHeadings() {
  if (reduce) return;
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          rotate: 2.5,
          transformOrigin: '0 100%',
          duration: 1.4,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }),
    });
  });
}

function fadeUps() {
  if (reduce) return;
  const els = $$('[data-fade-up]');
  gsap.set(els, { y: 40, autoAlpha: 0 });
  ScrollTrigger.batch(els, {
    start: 'top 88%',
    once: true,
    onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08 }),
  });
}

function clipReveals() {
  if (reduce) return;
  $$('[data-clip-reveal]').forEach((el) => {
    const img = $('img', el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0.2);
  });
}

function parallax() {
  if (reduce) return;
  $$('[data-speed]').forEach((el) => {
    const s = parseFloat(el.dataset.speed || '1');
    const k = (s - 1) * 260;
    gsap.fromTo(el, { y: k }, { y: -k, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.to('[data-spin] svg', { rotate: 360, ease: 'none', scrollTrigger: { trigger: '[data-spin]', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ─────────────────────────────────────────── marquee */
function marquee() {
  const rows = $$('[data-marquee-row]');
  if (!rows.length || reduce) return;
  const tweens = rows.map((row) => {
    const dir = Number(row.dataset.marqueeRow);
    return dir > 0
      ? gsap.to(row, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
      : gsap.fromTo(row, { xPercent: -50 }, { xPercent: 0, duration: 44, ease: 'none', repeat: -1 });
  });
  const skew = gsap.quickTo('.marquee__item', 'skewX', { duration: 0.6, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '[data-marquee]',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity();
      const boost = 1 + Math.min(Math.abs(v) / 250, 5);
      tweens.forEach((t) => gsap.to(t, { timeScale: boost * (self.direction < 0 ? -1 : 1), duration: 0.2, overwrite: true }));
      skew(gsap.utils.clamp(-12, 12, v / -180));
      gsap.delayedCall(0.25, () => tweens.forEach((t) => gsap.to(t, { timeScale: self.direction < 0 ? -1 : 1, duration: 1.2, overwrite: true })));
    },
  });
}

/* ─────────────────────────────────────────── manifesto */
function manifesto() {
  const words = $$('[data-manifesto] .mword');
  if (!words.length || reduce) return;
  gsap.to(words, {
    opacity: 1,
    stagger: 0.05,
    ease: 'none',
    scrollTrigger: { trigger: '[data-manifesto]', start: 'top 80%', end: 'bottom 50%', scrub: true },
  });
}

/* ─────────────────────────────────────────── category index */
function categoryIndex() {
  const rows = $$('[data-index-row]');
  if (!rows.length) return;
  if (!reduce) {
    gsap.from(rows, { yPercent: 100, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '[data-index]', start: 'top 80%', once: true } });
  }
  const float = $('[data-index-float]');
  if (!float || !finePointer) return;
  const imgs = $$('[data-float-img]', float);
  const xTo = gsap.quickTo(float, 'x', { duration: 0.7, ease: 'power3' });
  const yTo = gsap.quickTo(float, 'y', { duration: 0.7, ease: 'power3' });
  const rTo = gsap.quickTo(float, 'rotate', { duration: 0.9, ease: 'power3' });
  let lastX = 0;
  const list = $('[data-index]')!;
  list.addEventListener('mousemove', (e) => {
    const { width, height } = float.getBoundingClientRect();
    xTo(e.clientX - width / 2);
    yTo(e.clientY - height / 2);
    rTo(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.8));
    lastX = e.clientX;
  });
  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      imgs.forEach((i) => i.classList.toggle('is-active', i.dataset.floatImg === row.dataset.indexRow));
    });
  });
  list.addEventListener('mouseenter', (e) => {
    const { width, height } = float.getBoundingClientRect();
    gsap.set(float, { x: e.clientX - width / 2, y: e.clientY - height / 2 });
    gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  });
  list.addEventListener('mouseleave', () => gsap.to(float, { autoAlpha: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' }));
}

/* ─────────────────────────────────────────── gallery */
let revealedAll = false;
function revealAllGallery() {
  if (revealedAll) return;
  revealedAll = true;
  $$('[data-gitem] [data-reveal-img]').forEach((m) => {
    gsap.set(m, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set($('img', m), { scale: 1 });
  });
}

function gallery() {
  const items = $$('[data-gitem]');
  if (!items.length) return;

  if (!reduce) {
    const medias = items.map((i) => $('[data-reveal-img]', i)!);
    gsap.set(medias, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(medias.map((m) => $('img', m)), { scale: 1.3 });
    ScrollTrigger.batch(medias, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', stagger: 0.12 });
        gsap.to(batch.map((m) => $('img', m)), { scale: 1, duration: 2, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
      },
    });
    gsap.from($$('.gitem__cap'), { autoAlpha: 0, y: 12, duration: 1, stagger: 0.03, scrollTrigger: { trigger: '[data-gallery]', start: 'top 85%', once: true } });
  }

  // sticky filter bar state
  ScrollTrigger.create({
    trigger: '#gallery',
    start: 'top top',
    end: 'bottom top',
    toggleClass: { targets: '[data-filter-bar]', className: 'is-stuck' },
  });

  const chips = $$('[data-filter]');
  chips.forEach((chip) => chip.addEventListener('click', () => setFilter(chip.dataset.filter!)));
  $$('[data-filter-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setFilter(a.dataset.filterLink!, true);
      scrollToTarget('#gallery', -10);
    }),
  );
}

function setFilter(id: string, instant = false) {
  const items = $$('[data-gitem]');
  revealAllGallery();
  $$('[data-filter]').forEach((c) => {
    const on = c.dataset.filter === id;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-selected', String(on));
    if (on) c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
  const grid = $('[data-gallery]')!;
  const h0 = grid.offsetHeight;
  const state = Flip.getState(items);
  items.forEach((it) => it.classList.toggle('is-hidden', id !== 'all' && it.dataset.cat !== id));
  if (reduce || instant) {
    ScrollTrigger.refresh();
    return;
  }
  const h1 = grid.offsetHeight;
  gsap.fromTo(grid, { height: h0 }, { height: h1, duration: 0.9, ease: 'expo.inOut', clearProps: 'height' });
  Flip.from(state, {
    duration: 0.9,
    ease: 'expo.inOut',
    absolute: true,
    stagger: 0.02,
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.25 }),
    onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}

/* ─────────────────────────────────────────── lightbox */
function lightbox() {
  const lb = $('[data-lb]');
  if (!lb) return;
  const img = $<HTMLImageElement>('[data-lb-img]', lb)!;
  const frame = $('[data-lb-frame]', lb)!;
  const cap = $('[data-lb-cap]', lb)!;
  const cat = $('[data-lb-cat]', lb)!;
  const idx = $('[data-lb-index]', lb)!;
  let list: HTMLElement[] = [];
  let cur = 0;
  let lastFocus: HTMLElement | null = null;

  const full = (i: HTMLImageElement) => {
    const ss = i.getAttribute('srcset');
    if (ss) return ss.split(',').pop()!.trim().split(' ')[0];
    return i.currentSrc || i.src;
  };
  const show = (n: number, dir = 0) => {
    cur = (n + list.length) % list.length;
    const fig = list[cur];
    const src = $<HTMLImageElement>('img', fig)!;
    const swap = () => {
      img.src = full(src);
      img.width = src.width ? Number(src.getAttribute('width')) : 0;
      img.height = Number(src.getAttribute('height'));
      img.alt = src.alt;
      cap.textContent = $('.gitem__cap .serif', fig)?.textContent ?? '';
      cat.textContent = $('.gitem__cap .label', fig)?.textContent ?? '';
      idx.textContent = String(cur + 1).padStart(2, '0');
    };
    if (!dir || reduce) return swap();
    gsap.timeline()
      .to(frame, { xPercent: -8 * dir, autoAlpha: 0, duration: 0.35, ease: 'power2.in' })
      .add(swap)
      .fromTo(frame, { xPercent: 8 * dir, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out' });
  };
  const open = (fig: HTMLElement) => {
    list = $$('[data-gitem]').filter((f) => !f.classList.contains('is-hidden'));
    $('[data-lb-total]', lb)!.textContent = String(list.length).padStart(2, '0');
    $('.cursor')?.classList.remove('is-label', 'is-link');
    lastFocus = document.activeElement as HTMLElement;
    show(list.indexOf(fig));
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    stopScroll();
    gsap.timeline()
      .to('.lightbox__bg', { opacity: 0.98, duration: 0.6, ease: 'power2.out' })
      .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' }, 0.05)
      .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.2)
      .fromTo(['.lightbox__top', '.lightbox__cap', '.lightbox__nav'], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05 }, 0.4);
    $<HTMLButtonElement>('.lightbox__close', lb)?.focus({ preventScroll: true });
  };
  const close = () => {
    gsap.timeline({
      onComplete: () => {
        lb.classList.remove('is-open');
        lb.setAttribute('aria-hidden', 'true');
        startScroll();
        lastFocus?.focus({ preventScroll: true });
      },
    })
      .to(['.lightbox__top', '.lightbox__cap', '.lightbox__nav'], { autoAlpha: 0, duration: 0.25 })
      .to(frame, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, 0)
      .to('.lightbox__bg', { opacity: 0, duration: 0.5 }, 0.3);
  };

  $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => open(b.closest('[data-gitem]') as HTMLElement)));
  $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', close));
  $('[data-lb-next]', lb)!.addEventListener('click', () => show(cur + 1, 1));
  $('[data-lb-prev]', lb)!.addEventListener('click', () => show(cur - 1, -1));
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(cur + 1, 1);
    if (e.key === 'ArrowLeft') show(cur - 1, -1);
  });
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  });
}

/* ─────────────────────────────────────────── featured stories */
function stories() {
  const track = $('[data-stories-track]');
  if (!track) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const pin = $('[data-stories-pin]')!;
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => gsap.set('[data-stories-progress]', { scaleX: self.progress }),
      },
    });
    $$('[data-story]').forEach((story) => {
      const st = { trigger: story, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true };
      gsap.fromTo($('[data-story-parallax]', story), { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: st });
      gsap.fromTo($('[data-story-detail]', story), { yPercent: 30, rotate: 6 }, { yPercent: -20, rotate: -3, ease: 'none', scrollTrigger: st });
      gsap.from($$('.story__text > *', story), {
        x: 80, autoAlpha: 0, stagger: 0.06, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: story, containerAnimation: tween, start: 'left 70%', once: true },
      });
      gsap.fromTo($('[data-story-cover]', story), { clipPath: 'inset(0% 0% 0% 100%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut',
        scrollTrigger: { trigger: story, containerAnimation: tween, start: 'left 85%', once: true },
      });
    });
  });
  mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
    $$('[data-story]').forEach((story) => {
      gsap.fromTo($('[data-story-cover]', story), { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: story, start: 'top 85%', once: true },
      });
      gsap.fromTo($('[data-story-parallax]', story), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo($('[data-story-detail]', story), { yPercent: 25 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from($$('.story__text > *', story), { y: 30, autoAlpha: 0, stagger: 0.07, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: $('.story__text', story), start: 'top 88%', once: true } });
    });
  });
}

/* ─────────────────────────────────────────── enquiry form */
function waForm() {
  const form = $<HTMLFormElement>('[data-wa-form]');
  if (!form) return;
  const err = $('[data-form-err]', form)!;
  $$('[data-enquire-type]').forEach((a) =>
    a.addEventListener('click', () => {
      const r = form.querySelector<HTMLInputElement>(`input[name="type"][value="${a.dataset.enquireType}"]`);
      if (r) r.checked = true;
    }),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const name = String(d.get('name') || '').trim();
    if (!name) {
      err.textContent = 'May we have your name first?';
      form.querySelector<HTMLInputElement>('[name="name"]')?.focus();
      return;
    }
    err.textContent = '';
    const date = String(d.get('date') || '');
    const nice = date ? new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const lines = [
      `Hi Ybrain! I'm ${name}.`,
      `I'm planning a *${d.get('type')}*${nice ? ` on ${nice}` : ''}${d.get('place') ? ` at ${d.get('place')}` : ''}.`,
      d.get('message') ? `\n${d.get('message')}` : '',
      d.get('phone') ? `\nYou can also reach me on ${d.get('phone')}.` : '',
    ].filter(Boolean);
    const url = `https://wa.me/${form.dataset.waNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}

/* ─────────────────────────────────────────── footer */
function footer() {
  const mark = $('[data-footer-mark]');
  if (!mark) return;
  const paths = $$('path', mark);
  const dot = $('circle', mark);
  if (reduce) {
    gsap.set(paths, { strokeDashoffset: 0 });
    gsap.set(dot, { scale: 1 });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: mark, start: 'top 95%', end: 'bottom bottom', scrub: 1 } });
  tl.to(paths[0], { strokeDashoffset: 0, ease: 'none', duration: 1 })
    .to(paths[1], { strokeDashoffset: 0, ease: 'none', duration: 0.4 })
    .to(dot, { scale: 1, ease: 'back.out(3)', duration: 0.1 }, 0.8);
}

/* ─────────────────────────────────────────── nav, menu, fab */
function nav() {
  const navEl = $('[data-nav]')!;
  let lastY = 0;
  const setNavH = () => root.style.setProperty('--navh', navEl.offsetHeight + 'px');
  setNavH();
  window.addEventListener('resize', setNavH);
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      if (root.classList.contains('menu-open')) return;
      navEl.classList.toggle('is-scrolled', y > 40);
      const hide = y > 200 && y > lastY;
      navEl.classList.toggle('is-hidden', hide);
      root.classList.toggle('nav-hidden', hide);
      lastY = y;
    },
  });

  const menu = $('[data-menu]')!;
  const toggle = $('[data-menu-toggle]')!;
  let open = false;
  const tlMenu = gsap.timeline({ paused: true })
    .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 40px) 36px)', duration: 1, ease: 'expo.inOut' })
    .from('.menu__word', { yPercent: 110, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.35)
    .from('.menu__n', { autoAlpha: 0, duration: 0.6, stagger: 0.07 }, 0.5)
    .from('.menu__foot > *', { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.06 }, 0.6);
  const setMenu = (v: boolean) => {
    open = v;
    root.classList.toggle('menu-open', v);
    menu.classList.toggle('is-open', v);
    menu.setAttribute('aria-hidden', String(!v));
    toggle.setAttribute('aria-expanded', String(v));
    toggle.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    $('.nav__burger-label')!.textContent = v ? 'Close' : 'Menu';
    navEl.classList.remove('is-hidden');
    if (v) { stopScroll(); tlMenu.timeScale(1).play(); }
    else { startScroll(); tlMenu.timeScale(1.6).reverse(); }
  };
  toggle.addEventListener('click', () => setMenu(!open));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && open && setMenu(false));
  $$('[data-menu-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href')!;
      setMenu(false);
      setTimeout(() => scrollToTarget(href), 350);
    }),
  );

  // in-page anchors
  $$('a[href^="#"]:not([data-menu-link]):not([data-filter-link])').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')!;
      if (href.length < 2 && href !== '#') return;
      e.preventDefault();
      if (href === '#top' || href === '#') {
        lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      } else scrollToTarget(href);
    }),
  );

  // floating WhatsApp
  const fab = $('[data-fab]');
  if (fab) {
    const show = gsap.to(fab, { scale: 1, duration: 0.8, ease: 'back.out(2)', paused: true });
    if (reduce) gsap.set(fab, { scale: 1 });
    else {
      ScrollTrigger.create({ trigger: '.reel', start: 'top 40%', refreshPriority: -1, onEnter: () => show.play(), onLeaveBack: () => show.reverse() });
      ScrollTrigger.create({ trigger: '#enquire', start: 'top 70%', end: 'bottom 30%', refreshPriority: -1, onToggle: (s) => (s.isActive ? show.reverse() : show.play()) });
    }
  }
}

/* ─────────────────────────────────────────── cursor & magnetic */
function cursor() {
  if (!finePointer || reduce) return;
  const c = $('.cursor');
  if (!c) return;
  root.classList.add('has-cursor');
  const dot = $('.cursor__dot', c)!, ring = $('.cursor__ring', c)!, label = $('.cursor__label', c)!;
  gsap.set([dot, ring], { x: innerWidth / 2, y: innerHeight / 2 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  window.addEventListener('mousemove', (e) => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    const t = e.target as HTMLElement;
    const lab = t.closest<HTMLElement>('[data-cursor]');
    const link = t.closest('a, button, label, input, textarea');
    c.classList.toggle('is-label', !!lab);
    c.classList.toggle('is-link', !lab && !!link);
    c.classList.toggle('is-on-red', !!t.closest('[data-on-red], .menu, .index__row:hover'));
    if (lab) label.textContent = lab.dataset.cursor || '';
  });
  document.addEventListener('mouseleave', () => gsap.to(c, { autoAlpha: 0, duration: 0.3 }));
  document.addEventListener('mouseenter', () => gsap.to(c, { autoAlpha: 1, duration: 0.3 }));
}

function magnetic() {
  if (!finePointer || reduce) return;
  $$('[data-magnetic]').forEach((el) => {
    const s = parseFloat(el.dataset.magnetic || '0.3');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * s);
      yTo((e.clientY - (r.top + r.height / 2)) * s);
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ─────────────────────────────────────────── boot */
async function boot() {
  // wait for webfonts so split lines measure correctly (but never hang)
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  gsap.set('[data-hero-line]', { yPercent: reduce ? 0 : 115 });
  nav();
  cursor();
  magnetic();
  heroScroll();
  reel();
  marquee();
  manifesto();
  categoryIndex();
  gallery();
  lightbox();
  stories();
  splitHeadings();
  fadeUps();
  clipReveals();
  parallax();
  waForm();
  footer();
  await preloader();
  gsap.set('[data-hero-line]', { clearProps: 'transform' });
  heroIntro();
  ScrollTrigger.refresh();
}

boot();
window.addEventListener('load', () => ScrollTrigger.refresh());
