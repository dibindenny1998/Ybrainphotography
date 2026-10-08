/**
 * Ybrain Photography — motion & interaction
 * GSAP (ScrollTrigger, SplitText, Flip) · Lenis · three.js · Web Audio
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import type { TunnelPhoto } from './gl/tunnel';
import { bestSrc } from './gl/textures';
import { embers } from './fx/embers';
import { bindScramble, scramble } from './fx/scramble';
import { imageTrail } from './fx/trail';
import { photoRing } from './fx/ring';
import { sound } from './fx/sound';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = window.innerWidth < 768;
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll(s)] as T[];
if (reduce) root.classList.add('no-motion');
const glOK = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();
if (!glOK) root.classList.add('no-gl');

/* ─────────────────────────────────────────── smooth scroll */
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
const startScroll = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));
function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.8 });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}

/* scroll velocity, shared by kinetic type, marquee and ring */
let velocity = 0;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (velocity = s.getVelocity()) });

/* ─────────────────────────────────────────── WebGL modules (three.js) load in parallel with the preloader */
type GLMods = [typeof import('./gl/tunnel'), typeof import('./gl/media')];
let media: ReturnType<GLMods[1]['createMediaGL']> | null = null;
const glItems = new Map<HTMLElement, { reveal: (d?: number) => unknown; show: () => unknown }>();
function setupMediaGL(mods: GLMods | null) {
  if (mods && !reduce) {
    try {
      media = mods[1].createMediaGL($<HTMLCanvasElement>('[data-gl-media]')!);
      $$('[data-gl]').forEach((el) => glItems.set(el, media!.add(el)));
      gsap.ticker.add(media.render);
      return;
    } catch { media = null; }
  }
  $('[data-gl-media]')?.remove();
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
    const fx = embers($<HTMLCanvasElement>('[data-loader-embers]', loader)!, { density: 1.4, origin: 'center' });
    fx.start();
    const shots = $$('[data-loader-shot]', loader);
    const frame = $('[data-loader-frame]', loader)!;
    const num = $('.loader__num', loader)!;
    const counter = { v: 0 };
    const step = quick ? 0.09 : 0.2;
    const iris = { r: 1, a: 0 };
    const hex = () => {
      const pts = Array.from({ length: 6 }, (_, k) => {
        const ang = ((k * 60 + iris.a) * Math.PI) / 180;
        return `${50 + Math.cos(ang) * 75 * iris.r}% ${50 + Math.sin(ang) * 75 * iris.r}%`;
      });
      frame.style.clipPath = `polygon(${pts.join(',')})`;
    };
    const tl = gsap.timeline({
      onComplete: () => {
        fx.destroy();
        loader.remove();
        try { sessionStorage.setItem('ybrain-seen', '1'); } catch { /* private mode */ }
      },
    });
    tl.from(frame, { scale: 0.6, autoAlpha: 0, duration: 0.9, ease: 'expo.out' }, 0);
    shots.forEach((s, i) => {
      tl.fromTo(s, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: step * 1.6, ease: 'expo.out' }, 0.2 + i * step)
        .fromTo($('img', s), { scale: 1.4 }, { scale: 1, duration: step * 3, ease: 'expo.out' }, 0.2 + i * step);
    });
    const shuffleEnd = 0.2 + shots.length * step;
    tl.to('.loader__logo .logo__word', { strokeDashoffset: 0, duration: shuffleEnd, ease: 'power2.inOut' }, 0.1)
      .to('.loader__logo .logo__swash', { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, shuffleEnd - 0.1)
      .fromTo('.loader__logo .logo__dot', { attr: { r: 0 } }, { attr: { r: 6.5 }, duration: 0.4, ease: 'back.out(3)' }, shuffleEnd)
      .to(counter, { v: 100, duration: shuffleEnd + 0.4, ease: 'power1.inOut', onUpdate: () => (num.textContent = String(Math.round(counter.v)).padStart(2, '0')) }, 0)
      // the shutter: six blades close…
      .add(hex, shuffleEnd + 0.35)
      .to(iris, { r: 0, a: 60, duration: 0.45, ease: 'power3.in', onUpdate: hex }, shuffleEnd + 0.35)
      // …flash
      .add(() => sound.shutter())
      .to('.loader__flash', { opacity: 1, duration: 0.07, ease: 'none' })
      .set('.loader__inner', { autoAlpha: 0 })
      .add(() => { startScroll(); resolve(); })
      .to('.loader__flash', { opacity: 0, duration: 0.9, ease: 'power2.out' });
  });
}

/* ─────────────────────────────────────────── hero (WebGL dolly) */
let tunnelApi: ReturnType<GLMods[0]['createTunnel']> | null = null;
function hero(mods: GLMods | null) {
  const canvas = $<HTMLCanvasElement>('[data-tunnel]');
  const data = $('[data-tunnel-photos]');
  if (!canvas || !data) return;
  const { photos, final } = JSON.parse(data.textContent || '{}') as { photos: TunnelPhoto[]; final: TunnelPhoto };
  if (mods) {
    try {
      tunnelApi = mods[0].createTunnel(canvas, photos, final);
      tunnelApi.setIntro(reduce ? 0 : 1);
      gsap.ticker.add(() => tunnelApi!.render());
      window.addEventListener('pointermove', (e) => tunnelApi!.setMouse((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)));
    } catch {
      root.classList.add('no-gl');
    }
  }
  if (reduce) return;

  const pin = $('[data-hero-pin]')!;
  const len = () => innerHeight * (mobile ? 2.6 : 3.2);
  // the headline flies past the camera; the caption lands on the final photo
  const tl = gsap.timeline({ paused: true });
  tl.to('[data-hero-title]', { scale: 2.8, autoAlpha: 0, filter: 'blur(14px)', ease: 'power2.in', duration: 0.32 }, 0)
    .to(['.hero__top', '.hero__foot'], { autoAlpha: 0, y: -30, duration: 0.12 }, 0)
    .fromTo('[data-hero-caption]', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.84)
    .to({}, { duration: 0.06 });
  ScrollTrigger.create({
    trigger: pin,
    start: 'top top',
    end: () => '+=' + len(),
    pin: true,
    scrub: true,
    anticipatePin: 1,
    animation: tl,
    onUpdate: (s) => {
      tunnelApi?.setProgress(s.progress);
      gsap.set('[data-hero-progress]', { scaleX: s.progress });
    },
    onToggle: (s) => tunnelApi?.setVisible(s.isActive || s.progress < 1),
  });
}

function heroIntro() {
  if (reduce) return;
  const chars = $$('[data-hero-chars]');
  const split = SplitText.create(chars, { type: 'chars', charsClass: 'hchar' });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (tunnelApi) {
    const o = { v: 1 };
    tl.to(o, { v: 0, duration: 3, ease: 'expo.out', onUpdate: () => tunnelApi!.setIntro(o.v) }, 0);
  }
  tl.from('.nav', { yPercent: -120, duration: 1.2, clearProps: 'transform' }, 0.3)
    .from(split.chars, { yPercent: 120, rotateX: -80, filter: 'blur(10px)', autoAlpha: 0, transformOrigin: '50% 100%', duration: 1.6, stagger: 0.035 }, 0.1)
    .from('[data-hero-fade]', { y: 20, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 0.8)
    .add(() => $$('.hero__top [data-scramble]').forEach((e) => scramble(e, { duration: 1100 })), 0.8);
}

/* ─────────────────────────────────────────── ambient: lamp glow, nav theme, kinetic type */
function lampGlow() {
  if (!finePointer || reduce) return;
  $$('[data-lamp]').forEach((lamp) => {
    const host = lamp.parentElement!;
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      lamp.style.setProperty('--mx', `${e.clientX - r.left}px`);
      lamp.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

function navTheme() {
  const active = new Set<Element>();
  $$('[data-theme="dark"]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 36px',
      end: 'bottom 36px',
      refreshPriority: -1,
      onToggle: (s) => {
        s.isActive ? active.add(sec) : active.delete(sec);
        root.classList.toggle('nav-dark', active.size > 0);
      },
    });
  });
}

function kineticType() {
  if (reduce) return;
  let kw = 400;
  gsap.ticker.add(() => {
    const target = 400 + Math.min(Math.abs(velocity) / 7, 380);
    kw += (target - kw) * 0.08;
    root.style.setProperty('--kw', kw.toFixed(0));
  });
}

/* ─────────────────────────────────────────── generic reveals */
function splitHeadings() {
  if (reduce) return;
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115, rotate: 3, transformOrigin: '0 100%', duration: 1.5, stagger: 0.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }),
    });
  });
  $$('[data-split-chars]').forEach((el) => {
    const s = SplitText.create(el, { type: 'chars' });
    gsap.from(s.chars, {
      yPercent: 110, rotate: 8, autoAlpha: 0, duration: 1.4, stagger: 0.03, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
  // labels scramble in as they appear
  $$('.eyebrow [data-scramble]').forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => scramble(el, { duration: 900 }) }),
  );
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

function revealMedia(el: HTMLElement, delay = 0) {
  const gl = glItems.get(el);
  if (gl) return gl.reveal(delay);
  const img = $('img', el);
  gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, delay, ease: 'expo.inOut' });
  if (img) gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2, delay: delay + 0.1, ease: 'expo.out' });
}

function studioReveals() {
  if (reduce) return;
  $$('[data-clip-reveal]').forEach((el) => {
    if (!glItems.has(el)) gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => revealMedia(el) });
  });
  const lamp = $('.manifesto__lamp');
  if (lamp && glItems.has(lamp)) ScrollTrigger.create({ trigger: lamp, start: 'top 90%', once: true, onEnter: () => revealMedia(lamp) });
}

function parallax() {
  if (reduce) return;
  $$('[data-speed]').forEach((el) => {
    const k = (parseFloat(el.dataset.speed || '1') - 1) * 260;
    gsap.fromTo(el, { y: k }, { y: -k, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.to('[data-spin] svg', { rotate: 360, ease: 'none', scrollTrigger: { trigger: '[data-spin]', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ─────────────────────────────────────────── marquee & manifesto */
function marquee() {
  const rows = $$('[data-marquee-row]');
  if (!rows.length || reduce) return;
  const tweens = rows.map((row) =>
    Number(row.dataset.marqueeRow) > 0
      ? gsap.to(row, { xPercent: -50, duration: 34, ease: 'none', repeat: -1 })
      : gsap.fromTo(row, { xPercent: -50 }, { xPercent: 0, duration: 40, ease: 'none', repeat: -1 }),
  );
  const skew = gsap.quickTo('.marquee__item', 'skewX', { duration: 0.6, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '[data-marquee]',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity();
      const boost = 1 + Math.min(Math.abs(v) / 220, 6);
      tweens.forEach((t) => gsap.to(t, { timeScale: boost * (self.direction < 0 ? -1 : 1), duration: 0.2, overwrite: true }));
      skew(gsap.utils.clamp(-14, 14, v / -160));
      gsap.delayedCall(0.25, () => tweens.forEach((t) => gsap.to(t, { timeScale: self.direction < 0 ? -1 : 1, duration: 1.2, overwrite: true })));
    },
  });
}

function manifesto() {
  const words = $$('[data-manifesto] .mword');
  if (!words.length || reduce) return;
  gsap.fromTo(words, { opacity: 0.12, y: 10, filter: 'blur(4px)' }, {
    opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '[data-manifesto]', start: 'top 80%', end: 'bottom 50%', scrub: true },
  });
}

/* ─────────────────────────────────────────── work: trail + index */
function work() {
  const trail = $('[data-trail]');
  if (trail && !reduce) imageTrail(trail, JSON.parse(trail.dataset.trailSrcs || '[]'));

  const rows = $$('[data-index-row]');
  if (!reduce && rows.length) {
    gsap.from(rows, { yPercent: 100, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '[data-index]', start: 'top 82%', once: true } });
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
  rows.forEach((row) => row.addEventListener('mouseenter', () => imgs.forEach((i) => i.classList.toggle('is-active', i.dataset.floatImg === row.dataset.indexRow))));
  list.addEventListener('mouseenter', (e) => {
    const { width, height } = float.getBoundingClientRect();
    gsap.set(float, { x: e.clientX - width / 2, y: e.clientY - height / 2 });
    gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  });
  list.addEventListener('mouseleave', () => gsap.to(float, { autoAlpha: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' }));
}

/* ─────────────────────────────────────────── 3D ring */
function ring() {
  const stage = $('[data-ring-stage]');
  if (!stage || reduce) return;
  const api = photoRing(stage, (i) => {
    const slot = $(`[data-ring-card="${i}"]`)?.dataset.ringSlot;
    const fig = $(`[data-gitem][data-slot="${slot}"]`);
    if (!fig) return;
    if (fig.classList.contains('is-hidden')) setFilter('all', true);
    openLightbox?.(fig);
  });
  ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onUpdate: (s) => api.kick(s.getVelocity() / 600) });
  gsap.from('[data-ring]', { scale: 0.6, autoAlpha: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 75%', once: true } });
}

/* ─────────────────────────────────────────── gallery */
function gallery() {
  const items = $$('[data-gitem]');
  if (!items.length) return;
  if (!reduce) {
    const medias = items.map((i) => $('[data-reveal-img]', i)!);
    if (!media) gsap.set(medias, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch(medias, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => batch.forEach((m, i) => revealMedia(m as HTMLElement, i * 0.12)),
    });
    gsap.from($$('.gitem__cap'), { autoAlpha: 0, y: 12, duration: 1, stagger: 0.03, scrollTrigger: { trigger: '[data-gallery]', start: 'top 85%', once: true } });
  }
  ScrollTrigger.create({ trigger: '#gallery', start: 'top top', end: 'bottom top', toggleClass: { targets: '[data-filter-bar]', className: 'is-stuck' } });
  $$('[data-filter]').forEach((chip) => chip.addEventListener('click', () => setFilter(chip.dataset.filter!)));
  $$('[data-filter-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setFilter(a.dataset.filterLink!, true);
      scrollToTarget('#gallery', -10);
    }),
  );
}

let revealedAll = false;
function revealAllGallery() {
  if (revealedAll) return;
  revealedAll = true;
  $$('[data-gitem] [data-reveal-img]').forEach((m) => {
    const gl = glItems.get(m);
    if (gl) gl.show();
    else { gsap.set(m, { clipPath: 'inset(0% 0% 0% 0%)' }); gsap.set($('img', m), { scale: 1 }); }
  });
}

function setFilter(id: string, instant = false) {
  const items = $$('[data-gitem]');
  revealAllGallery();
  $$('[data-filter]').forEach((c) => {
    const on = c.dataset.filter === id;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-selected', String(on));
    if (on) c.parentElement!.scrollTo({ left: c.offsetLeft - c.parentElement!.clientWidth / 2 + c.offsetWidth / 2, behavior: 'smooth' });
  });
  const grid = $('[data-gallery]')!;
  const h0 = grid.offsetHeight;
  const state = Flip.getState(items);
  items.forEach((it) => it.classList.toggle('is-hidden', id !== 'all' && it.dataset.cat !== id));
  if (reduce || instant) { ScrollTrigger.refresh(); return; }
  const h1 = grid.offsetHeight;
  gsap.fromTo(grid, { height: h0 }, { height: h1, duration: 0.9, ease: 'expo.inOut', clearProps: 'height' });
  Flip.from(state, {
    duration: 0.9,
    ease: 'expo.inOut',
    absolute: true,
    stagger: 0.02,
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.25 }),
    onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' }),
    onComplete: () => { ScrollTrigger.refresh(); media?.refresh(); },
  });
}

/* ─────────────────────────────────────────── lightbox (view transitions) */
let openLightbox: ((fig: HTMLElement) => void) | null = null;
function lightbox() {
  const lb = $('[data-lb]');
  if (!lb) return;
  const img = $<HTMLImageElement>('[data-lb-img]', lb)!;
  const frame = $('[data-lb-frame]', lb)!;
  const cap = $('[data-lb-cap]', lb)!;
  const cat = $('[data-lb-cat]', lb)!;
  const idx = $('[data-lb-index]', lb)!;
  const chrome = ['.lightbox__top', '.lightbox__cap', '.lightbox__nav'];
  const canVT = typeof (document as any).startViewTransition === 'function' && !reduce;
  let list: HTMLElement[] = [];
  let cur = 0;
  let lastFocus: HTMLElement | null = null;
  const thumbOf = (fig: HTMLElement) => $<HTMLImageElement>('img', fig)!;

  const fill = (n: number) => {
    cur = (n + list.length) % list.length;
    const fig = list[cur];
    const src = thumbOf(fig);
    img.src = bestSrc(src);
    img.width = Number(src.getAttribute('width'));
    img.height = Number(src.getAttribute('height'));
    img.alt = src.alt;
    cap.textContent = $('.gitem__cap .serif', fig)?.textContent ?? '';
    cat.textContent = $('.gitem__cap .label', fig)?.textContent ?? '';
    idx.textContent = String(cur + 1).padStart(2, '0');
  };
  const show = (n: number, dir: number) => {
    if (reduce) return fill(n);
    sound.shutter();
    gsap.timeline()
      .to(frame, { xPercent: -10 * dir, autoAlpha: 0, filter: 'blur(8px)', duration: 0.35, ease: 'power2.in' })
      .add(() => fill(n))
      .fromTo(frame, { xPercent: 10 * dir, autoAlpha: 0, filter: 'blur(8px)' }, { xPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' });
  };
  const setOpen = (v: boolean) => {
    lb.classList.toggle('is-open', v);
    lb.setAttribute('aria-hidden', String(!v));
  };

  openLightbox = (fig: HTMLElement) => {
    list = $$('[data-gitem]').filter((f) => !f.classList.contains('is-hidden'));
    $('[data-lb-total]', lb)!.textContent = String(list.length).padStart(2, '0');
    $('.cursor')?.classList.remove('is-label', 'is-link');
    lastFocus = document.activeElement as HTMLElement;
    fill(list.indexOf(fig));
    stopScroll();
    sound.shutter();
    const thumb = thumbOf(fig);
    if (canVT) {
      fig.classList.add('vt-src');
      thumb.style.viewTransitionName = 'lb-photo';
      const vt = (document as any).startViewTransition(() => {
        thumb.style.viewTransitionName = '';
        fig.classList.remove('vt-src');
        img.style.viewTransitionName = 'lb-photo';
        gsap.set('.lightbox__bg', { opacity: 0.98 });
        gsap.set(frame, { clipPath: 'none', autoAlpha: 1, xPercent: 0, filter: 'none' });
        gsap.set(chrome, { autoAlpha: 0 });
        setOpen(true);
      });
      vt.finished.finally(() => {
        img.style.viewTransitionName = '';
        gsap.fromTo(chrome, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05 });
      });
    } else {
      setOpen(true);
      gsap.timeline()
        .to('.lightbox__bg', { opacity: 0.98, duration: 0.6 })
        .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' }, 0.05)
        .fromTo(chrome, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05 }, 0.4);
    }
    $<HTMLButtonElement>('.lightbox__close', lb)?.focus({ preventScroll: true });
  };

  const close = () => {
    const fig = list[cur];
    const thumb = thumbOf(fig);
    const done = () => { startScroll(); lastFocus?.focus({ preventScroll: true }); };
    if (canVT && fig.getBoundingClientRect().bottom > 0 && fig.getBoundingClientRect().top < innerHeight) {
      img.style.viewTransitionName = 'lb-photo';
      gsap.set(chrome, { autoAlpha: 0 });
      const vt = (document as any).startViewTransition(() => {
        img.style.viewTransitionName = '';
        setOpen(false);
        gsap.set('.lightbox__bg', { opacity: 0 });
        fig.classList.add('vt-src');
        thumb.style.viewTransitionName = 'lb-photo';
      });
      vt.finished.finally(() => { thumb.style.viewTransitionName = ''; fig.classList.remove('vt-src'); done(); });
    } else {
      gsap.timeline({ onComplete: () => { setOpen(false); done(); } })
        .to(chrome, { autoAlpha: 0, duration: 0.25 })
        .to(frame, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, 0)
        .to('.lightbox__bg', { opacity: 0, duration: 0.5 }, 0.3);
    }
  };

  $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => openLightbox!(b.closest('[data-gitem]') as HTMLElement)));
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

/* ─────────────────────────────────────────── stacked story cards */
function stories() {
  const cards = $$('[data-scard]');
  if (!cards.length || reduce) return;
  cards.forEach((card, i) => {
    const inner = $('[data-scard-inner]', card)!;
    const next = cards[i + 1];
    if (next) {
      gsap.to(inner, {
        scale: 0.88,
        yPercent: -3,
        filter: mobile ? 'brightness(0.45)' : 'brightness(0.4) blur(4px)',
        borderRadius: '28px',
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
      });
    }
    gsap.fromTo($('[data-scard-bg]', card), { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo($('[data-scard-detail]', card), { yPercent: 40, rotate: 8 }, { yPercent: -20, rotate: -4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    const names = $('.scard__names', card)!;
    const split = SplitText.create(names, { type: 'chars,words' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 55%', once: true } });
    tl.from(split.chars, { yPercent: 100, rotateX: -90, autoAlpha: 0, duration: 1.2, stagger: 0.025, ease: 'expo.out', transformOrigin: '50% 100%' })
      .from($$('.scard__text > :not(.scard__names)', card), { y: 30, autoAlpha: 0, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.2)
      .from($('.scard__num', card), { xPercent: 30, autoAlpha: 0, duration: 1.6, ease: 'expo.out' }, 0);
  });
}

/* ─────────────────────────────────────────── enquiry */
function enquire() {
  const c = $<HTMLCanvasElement>('[data-embers]');
  if (c && !reduce) {
    const fx = embers(c, { density: mobile ? 0.7 : 1.1 });
    ScrollTrigger.create({ trigger: '#enquire', start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? fx.start() : fx.stop()) });
  }
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
    window.open(`https://wa.me/${form.dataset.waNumber}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
}

function footer() {
  const mark = $('[data-footer-mark]');
  if (!mark) return;
  const paths = $$('path', mark);
  const dot = $('circle', mark);
  if (reduce) { gsap.set(paths, { strokeDashoffset: 0 }); return; }
  const tl = gsap.timeline({ scrollTrigger: { trigger: mark, start: 'top 95%', end: 'bottom bottom', scrub: 1 } });
  tl.to(paths[0], { strokeDashoffset: 0, ease: 'none', duration: 1 })
    .to(paths[1], { strokeDashoffset: 0, ease: 'none', duration: 0.4 })
    .fromTo(dot, { attr: { r: 0 } }, { attr: { r: 6.5 }, ease: 'back.out(3)', duration: 0.1 }, 0.8);
}

/* ─────────────────────────────────────────── nav, menu, sound, fab */
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
    .from('.menu__word', { yPercent: 110, rotate: 4, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.35)
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
      setMenu(false);
      setTimeout(() => scrollToTarget(a.getAttribute('href')!), 350);
    }),
  );
  $$('a[href^="#"]:not([data-menu-link]):not([data-filter-link])').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href')!;
      e.preventDefault();
      if (href === '#top' || href === '#') lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      else scrollToTarget(href);
    }),
  );

  // sound
  const sb = $('[data-sound]');
  sb?.addEventListener('click', async () => {
    const on = await sound.toggle();
    sb.classList.toggle('is-on', on);
    sb.setAttribute('aria-pressed', String(on));
    sb.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    if (on) sound.shutter();
  });

  // floating WhatsApp
  const fab = $('[data-fab]');
  if (fab) {
    const showFab = gsap.to(fab, { scale: 1, duration: 0.8, ease: 'back.out(2)', paused: true });
    if (reduce) gsap.set(fab, { scale: 1 });
    else {
      ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', refreshPriority: -1, onEnter: () => showFab.play(), onLeaveBack: () => showFab.reverse() });
      ScrollTrigger.create({ trigger: '#enquire', start: 'top 70%', end: 'bottom 30%', refreshPriority: -1, onToggle: (s) => (s.isActive ? showFab.reverse() : showFab.play()) });
    }
  }
}

/* ─────────────────────────────────────────── cursor, magnetic, buttons */
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
    const isLab = !!lab && !(link && link !== lab && lab.contains(link) && !link.matches('[data-cursor]'));
    c.classList.toggle('is-label', isLab);
    c.classList.toggle('is-link', !isLab && !!link);
    c.classList.toggle('is-on-red', !!t.closest('[data-on-red], .menu, [data-theme="dark"]'));
    if (isLab) label.textContent = lab!.dataset.cursor || '';
  });
  document.addEventListener('mouseleave', () => gsap.to(c, { autoAlpha: 0, duration: 0.3 }));
  document.addEventListener('mouseenter', () => gsap.to(c, { autoAlpha: 1, duration: 0.3 }));
}

function magnetic() {
  // direction-aware button fill (all pointers)
  $$('.btn').forEach((b) =>
    b.addEventListener('pointerenter', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
      b.style.setProperty('--by', `${((e.clientY - r.top) / r.height) * 100}%`);
    }),
  );
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
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ─────────────────────────────────────────── boot */
async function boot() {
  const intro = preloader(); // starts at once; everything below sets up behind it
  const glMods: Promise<GLMods | null> = glOK
    ? Promise.all([import('./gl/tunnel'), import('./gl/media')]).catch(() => null)
    : Promise.resolve(null);
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  const mods = await glMods;
  if (!mods) root.classList.add('no-gl');
  setupMediaGL(mods);
  // order matters: pinned sections first, so later triggers measure the pin spacing
  hero(mods);
  nav();
  navTheme();
  cursor();
  magnetic();
  lampGlow();
  kineticType();
  marquee();
  manifesto();
  work();
  ring();
  gallery();
  lightbox();
  stories();
  splitHeadings();
  fadeUps();
  studioReveals();
  parallax();
  enquire();
  footer();
  bindScramble();
  await intro;
  heroIntro();
  ScrollTrigger.refresh();
}

boot();
window.addEventListener('load', () => ScrollTrigger.refresh());
