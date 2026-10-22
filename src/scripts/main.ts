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
/* Phones with "Remove animations" / reduced motion turned on still get the gentle motion
   (fades, reveals, the moving strips); only scroll-jacking and parallax are switched off. */
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduce = false;
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

/* ── home: the 5-second opening — prints fly in, fan out, then become the hero */
function heroOpening(): Promise<void> {
  return new Promise((resolve) => {
    const intro = $('[data-intro]');
    const hero = $('[data-hero]');
    if (!intro || !hero) return resolve();
    if (reduce) { intro.remove(); return resolve(); }
    let seen = false;
    try { seen = !!sessionStorage.getItem('yb-seen'); sessionStorage.setItem('yb-seen', '1'); } catch { /* ignore */ }
    lock(true);
    window.scrollTo(0, 0);
    const cards = $$('[data-card]', intro);
    const panels = $$('[data-panel]').filter((p) => p.offsetWidth > 0);
    const num = $('[data-intro-num]', intro)!;
    const vw = innerWidth, vh = innerHeight;
    const cw = cards[0].offsetWidth;
    const count = { v: 0 };
    gsap.set('[data-panels]', { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: () => { intro.remove(); },
    });
    if (seen) tl.timeScale(1.7);

    // 1 · prints fly in from every side and land as a loose stack
    cards.forEach((c, i) => {
      const ang = (i / cards.length) * Math.PI * 2 + 0.6;
      tl.fromTo(c,
        { x: Math.cos(ang) * vw * 0.75, y: Math.sin(ang) * vh * 0.75, rotate: gsap.utils.random(-50, 50), scale: 0.7, autoAlpha: 0 },
        { x: gsap.utils.random(-14, 14), y: gsap.utils.random(-10, 10), rotate: gsap.utils.random(-9, 9), scale: 1, autoAlpha: 1, duration: 1.2 },
        0.15 + i * 0.12);
    });
    tl.from('[data-intro-ui]', { autoAlpha: 0, y: 20, duration: 1, stagger: 0.1 }, 0.1)
      .to(count, { v: 100, duration: 2.5, ease: 'power1.inOut', onUpdate: () => (num.textContent = String(Math.round(count.v))) }, 0);

    // 2 · the stack fans out into a spread
    const spread = Math.min(vw * 0.13, 150);
    const mid = (cards.length - 1) / 2;
    cards.forEach((c, i) => {
      const k = i <= 2 ? [0, -1, 1][i] : (i % 2 ? -2 : 2) + (i > 4 ? (i % 2 ? -1 : 1) : 0);
      tl.to(c, { x: k * spread, y: Math.abs(k) * 18, rotate: k * 5, duration: 1, ease: 'expo.inOut' }, 1.75);
    });
    void mid;

    // 3 · three prints (one on phones) grow into the full-height panels; the rest fly away
    tl.add(() => {
      gsap.to('[data-intro-ui]', { autoAlpha: 0, y: -20, duration: 0.5, stagger: 0.05 });
      gsap.to('[data-intro-bg]', { autoAlpha: 0, duration: 0.8, delay: 0.25 });
      cards.forEach((c, i) => {
        const target = panels[i];
        if (target) {
          gsap.to(c, { borderWidth: 0, borderRadius: 0, duration: 0.9, ease: 'expo.inOut' });
          Flip.fit(c, target, { duration: 1.25, ease: 'expo.inOut', absolute: true, rotate: 0 } as any);
          gsap.to(c, { rotate: 0, duration: 1.25, ease: 'expo.inOut' });
        } else {
          gsap.to(c, { y: vh * 1.1, rotate: gsap.utils.random(-40, 40), autoAlpha: 0, duration: 1.1, ease: 'expo.in', delay: i * 0.03 });
        }
      });
    }, 2.85);

    // 4 · hand over to the real hero, headline rises
    tl.add(() => {
      gsap.set('[data-panels]', { autoAlpha: 1 });
      lock(false);
      resolve();
    }, 4.15)
      .to(intro, { autoAlpha: 0, duration: 0.35, ease: 'none' }, 4.2);

    // impatient visitors: any scroll / tap speeds it up
    const hurry = () => tl.timeScale(4);
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, hurry, { once: true, passive: true }));
  });
}

function heroIntro() {
  const title = $('[data-hero-title]');
  if (!title || reduce) return;
  gsap.timeline({ defaults: { ease: E } })
    .fromTo('.hl > span', { yPercent: 115 }, { yPercent: 0, duration: 1.5, stagger: 0.14 }, 0)
    .from('[data-hero-fade]', { y: 26, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.4)
    .from('.hdr', { yPercent: -100, autoAlpha: 0, duration: 1.1, clearProps: 'all' }, 0.2)
    .from('.hero__shade', { autoAlpha: 0, duration: 1.2, ease: 'power2.out' }, 0);
}

/* panels change photo one after another (staggered wipe) */
function heroPanels(): () => void {
  const panels = $$('[data-panel]');
  if (!panels.length) return () => {};
  const bar = $('[data-hero-bar]'), cap = $('[data-hero-cap]');
  const HOLD = 4.8;
  let step = 0, visible = true;
  const advance = () => {
    step++;
    const shown = panels.filter((p) => p.offsetWidth > 0);
    shown.forEach((p, pi) => {
      const s = $$('[data-ps]', p);
      const cur = s.find((x) => x.classList.contains('is-on'))!;
      const nx = s[step % s.length];
      gsap.set(nx, { zIndex: 2 }); gsap.set(cur, { zIndex: 1 });
      gsap.timeline({ delay: pi * 0.18, onComplete: () => { cur.classList.remove('is-on'); gsap.set(cur, { clipPath: 'inset(100% 0% 0% 0%)', zIndex: 0 }); nx.classList.add('is-on'); } })
        .fromTo(nx, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
        .fromTo($('img', nx), { scale: 1.18 }, { scale: 1, duration: 2.2, ease: E }, 0.1);
      if (pi === 0 && cap) gsap.fromTo(cap, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: E, onStart: () => (cap.textContent = nx.dataset.cap || '') });
    });
    prog.restart();
    if (!visible || document.hidden) prog.pause();
  };
  const prog = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none', paused: true, onComplete: advance });
  if (reduce) return () => {};
  let started = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; started && visible && !document.hidden ? prog.play() : prog.pause(); }).observe($('[data-hero]')!);
  document.addEventListener('visibilitychange', () => (document.hidden ? prog.pause() : started && visible && prog.play()));
  // scroll: panels drift at different speeds, headline lifts away
  const st = { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true };
  if (!still) panels.forEach((p) => gsap.to(p, { yPercent: parseFloat(p.dataset.speedP || '0'), ease: 'none', scrollTrigger: st }));
  gsap.to('.hero__ui', { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { ...st, end: '70% top' } });
  return () => { started = true; if (visible) prog.play(); };
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
      onSplit: (s) => gsap.from(s.lines, { yPercent: 110, duration: 1.4, stagger: 0.1, ease: E, scrollTrigger: { trigger: el, start: 'top 96%', once: true } }),
    });
  });
  // text & small things: fade up
  ScrollTrigger.batch('[data-r]', {
    start: 'top 97%', once: true,
    onEnter: (b) => gsap.fromTo(b, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.3, ease: E, stagger: 0.08 }),
  });
  // images: wipe up + settle
  $$('[data-ri]').forEach((el) => {
    const img = $('img', el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 98%', once: true } });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out' });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: E, clearProps: 'transform' }, 0.1);
  });
  // parallax
  if (!still) $$('[data-speed]').forEach((el) => {
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

/* ── home: category rows, studio pull-back, story strip, rolling photos, card tilt */
function homeExtras() {
  // category rows: a photo follows the cursor
  const float = $('[data-shoot-float]');
  const list = $('[data-shoots]');
  if (float && list && fine) {
    const imgs = $$('[data-shoot-img]', float);
    const xTo = gsap.quickTo(float, 'x', { duration: 0.55, ease: 'power3' });
    const yTo = gsap.quickTo(float, 'y', { duration: 0.55, ease: 'power3' });
    const rTo = gsap.quickTo(float, 'rotate', { duration: 0.8, ease: 'power3' });
    let lx = 0;
    list.addEventListener('mousemove', (e) => { xTo(e.clientX + 24); yTo(e.clientY - 160); rTo(gsap.utils.clamp(-10, 10, (e.clientX - lx) * 0.6)); lx = e.clientX; });
    list.addEventListener('mouseenter', (e) => { gsap.set(float, { x: e.clientX + 24, y: e.clientY - 160 }); gsap.to(float, { opacity: 1, scale: 1, duration: 0.5, ease: E }); });
    list.addEventListener('mouseleave', () => gsap.to(float, { opacity: 0, scale: 0.6, duration: 0.4, ease: E }));
    $$('[data-shoot]').forEach((r) => r.addEventListener('mouseenter', () => imgs.forEach((im) => im.classList.toggle('on', im.dataset.shootImg === r.dataset.shoot))));
  }
  if (list && !reduce) gsap.from($$('.sh-row', list), { yPercent: 100, opacity: 0, duration: 1.2, stagger: 0.07, ease: E, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
  if (reduce) return;

  // studio photo pulls back like a camera
  $$('[data-zoomout]').forEach((el) => {
    const img = $('img', el);
    if (img) gsap.fromTo(img, { scale: 1.35, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // stories strip: drifts sideways as the page scrolls past (never holds the page); swipe on phones
  const track = $('[data-strip-track]');
  const bar = $('[data-strip-bar]');
  if (track && bar) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.fromTo(track, { x: 0 }, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '[data-strip]', start: 'top 85%', end: 'bottom 15%', scrub: 0.6, invalidateOnRefresh: true, onUpdate: (st) => gsap.set(bar, { scaleX: st.progress }) },
      });
    });
    mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
      const vp = $('[data-strip-vp]')!;
      const on = () => gsap.set(bar, { scaleX: vp.scrollLeft / Math.max(1, vp.scrollWidth - vp.clientWidth) });
      vp.addEventListener('scroll', on, { passive: true });
      return () => vp.removeEventListener('scroll', on);
    });
  }

  // FAQ: smooth open
  $$('details.qa').forEach((d) => d.addEventListener('toggle', () => { if (d.open) gsap.from($('.qa__a', d), { height: 0, opacity: 0, duration: 0.6, ease: E, clearProps: 'all' }); }));

  // price cards tilt toward the cursor
  if (fine) $$('[data-tilt]').forEach((c) => {
    const rx = gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(c, { transformPerspective: 900 });
    c.addEventListener('mousemove', (e) => { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 10); rx(-((e.clientY - r.top) / r.height - 0.5) * 10); });
    c.addEventListener('mouseleave', () => { rx(0); ry(0); });
  });
}

/* ── story pages: the title rises, then the cover opens like a camera shutter and settles into a frame on scroll */
function storyOpening() {
  const sx = $('[data-sx]');
  if (!sx) return;
  const media = $('[data-sx-media]', sx)!, frame = $('[data-sx-frame]', sx)!, ui = $('[data-sx-ui]', sx)!;
  const title = $('[data-sx-title]', sx)!, fades = $$('[data-sx-fade]', sx), cue = $('[data-sx-cue]', sx);
  const img = $('img', media)!;
  const split = SplitText.create(title, { type: 'chars,words', mask: 'chars' });
  gsap.set(cue, { autoAlpha: 0 });
  gsap.set(ui, { opacity: 1 });
  gsap.timeline({ defaults: { ease: E } })
    .from(split.chars, { yPercent: 110, duration: 1.1, stagger: 0.035 }, 0.1)
    .from(fades, { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.1 }, 0.35)
    // the shutter: a slit through the middle opens to the full photograph
    .fromTo(media, { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' }, 1.15)
    .fromTo(img, { scale: 1.4 }, { scale: 1, duration: 2.4 }, 1.15)
    .to([title, ...fades], { color: '#fff', duration: 0.6, ease: 'power1.out' }, 1.55)
    .to(title, { textShadow: '0 10px 50px rgba(20,10,10,0.25)', duration: 0.6 }, 1.55)
    .fromTo('.hdr', { yPercent: -100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, clearProps: 'all' }, 2.1)
    .to(cue, { autoAlpha: 1, duration: 0.8 }, 2.3);
  // on scroll the photograph pulls back into a rounded frame, the title drifts away
  const st = { trigger: sx, start: 'top top', end: 'bottom top', scrub: true };
  if (!still) {
    gsap.to(frame, { scale: 0.86, borderRadius: 18, ease: 'none', scrollTrigger: st });
    gsap.to(ui, { yPercent: -35, autoAlpha: 0, ease: 'none', scrollTrigger: { ...st, end: '60% top' } });
  }
}

/* ── home: scattered prints gather into a stack, then the founder's print steps forward */
function founderGather() {
  const sec = $('[data-gather]');
  if (!sec) return;
  const pin = $('[data-gather-pin]', sec)!;
  const prints = $$('[data-gp]', sec);
  const main = $('[data-gp-main]', sec)!;
  const lead = $('[data-gather-lead]', sec)!;
  const txt = $$('[data-gt]', sec);
  if (still) { $('[data-gather-stage]', sec)?.remove(); lead.remove(); return; }
  // where each print lies on the "table" (fractions of the screen) + its tilt
  const narrow = innerWidth < 700;
  const spots = narrow
    ? [[-0.32, -0.36, -12], [0.3, -0.34, 9], [-0.45, -0.23, 7], [0.45, 0.25, -8], [0.02, -0.44, 5], [0.02, 0.44, -6], [-0.3, 0.36, 11], [0.3, 0.37, -10]]
    : [[-0.37, -0.3, -12], [0.36, -0.33, 9], [-0.42, 0.06, 7], [0.41, 0.02, -8], [-0.12, -0.41, 5], [0.12, 0.4, -6], [-0.3, 0.37, 11], [0.3, 0.36, -10]];
  const jit = prints.map(() => [gsap.utils.random(-14, 14), gsap.utils.random(-10, 10), gsap.utils.random(-9, 9)]);
  const W = () => pin.clientWidth, H = () => pin.clientHeight;
  // offset from the founder photo's final place to the centre of the screen, and its size as a print
  const geo = () => {
    const p = pin.getBoundingClientRect(), s = main.parentElement!.getBoundingClientRect();
    return { dx: p.left + p.width / 2 - (s.left + s.width / 2), dy: p.top + p.height / 2 - (s.top + s.height / 2), sc: prints[0].offsetWidth / s.width };
  };
  const mid = (prints.length - 1) / 2;
  const spread = () => Math.min(W() * 0.08, 100);
  gsap.set(lead, { xPercent: -50, yPercent: -50 });
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: { trigger: pin, start: 'top top', end: '+=230%', pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
  });
  // 1 · the prints slide together into one stack, the line lifts away
  prints.forEach((p, i) => {
    const [fx, fy, r] = spots[i % spots.length];
    tl.fromTo(p, { x: () => fx * W(), y: () => fy * H(), rotate: r }, { x: jit[i][0], y: jit[i][1], rotate: jit[i][2], duration: 1 }, i * 0.04);
  });
  tl.to(lead, { y: -70, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 0.12);
  // 2 · the founder's print drops onto the stack
  tl.fromTo(main, { x: () => geo().dx, y: () => geo().dy - H(), scale: () => geo().sc, rotate: -16 }, { y: () => geo().dy, rotate: -4, duration: 0.7, ease: 'power3.out' }, 1.05);
  // 3 · the stack fans out behind it…
  prints.forEach((p, i) => tl.to(p, { x: () => (i - mid) * spread(), y: Math.abs(i - mid) * 14, rotate: (i - mid) * 5, duration: 0.6 }, 1.75));
  // 4 · …the founder steps forward into place, the rest of the prints fall away
  tl.to(main, { x: 0, y: 0, scale: 1, rotate: 0, duration: 1, ease: 'power3.inOut' }, 2.35)
    .to(prints, { y: () => H() * 0.95, rotate: () => gsap.utils.random(-30, 30), autoAlpha: 0, duration: 0.8, stagger: 0.04, ease: 'power2.in' }, 2.45)
    .fromTo(txt, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 2.95)
    .to({}, { duration: 0.5 });
}

/* ── portfolio: the header deck fans out, photos are dealt onto the page, filters reshuffle */
function portfolio() {
  const deck = $('[data-pf-deck]');
  if (deck && !reduce) {
    const fan = $('[data-pf-fan]', deck)!;
    const cards = $$('[data-pf-card]', deck);
    const mid = (cards.length - 1) / 2;
    const sp = () => Math.min(innerWidth * 0.13, 80);
    gsap.set(cards, { transform: 'none' });
    let ready = false;
    gsap.timeline({ delay: 0.2, onComplete: () => { ready = true; } })
      .fromTo(cards, { y: () => innerHeight, x: 0, rotate: () => gsap.utils.random(-40, 40), autoAlpha: 0 },
        { y: () => gsap.utils.random(-8, 8), rotate: () => gsap.utils.random(-7, 7), autoAlpha: 1, duration: 1.1, stagger: 0.1, ease: E })
      .to(cards, { x: (i) => (i - mid) * sp(), y: (i) => Math.abs(i - mid) * 12, rotate: (i) => (i - mid) * 7, duration: 1.1, ease: 'expo.inOut' }, '-=0.3');
    // hover: the fan opens wider; scroll: it drifts up and tilts
    if (fine) {
      deck.addEventListener('mouseenter', () => ready && gsap.to(cards, { x: (i) => (i - mid) * sp() * 1.6, y: (i) => Math.abs(i - mid) * 20 - 10, rotate: (i) => (i - mid) * 11, duration: 0.9, ease: E, overwrite: 'auto' }));
      deck.addEventListener('mouseleave', () => ready && gsap.to(cards, { x: (i) => (i - mid) * sp(), y: (i) => Math.abs(i - mid) * 12, rotate: (i) => (i - mid) * 7, duration: 0.9, ease: E, overwrite: 'auto' }));
    }
    gsap.to(fan, { y: -90, rotate: -5, ease: 'none', scrollTrigger: { trigger: deck, start: 'top 40%', end: 'bottom top', scrub: true } });
  }

  const items = $$('[data-item]');
  if (!items.length) return;
  if (reduce) { gsap.set(items, { opacity: 1 }); return; }
  const deal = (els: Element[]) => {
    const fresh = els.filter((e) => !e.hasAttribute('data-dealt') && !(e as HTMLElement).hidden);
    fresh.forEach((e) => e.setAttribute('data-dealt', ''));
    if (!fresh.length) return;
    gsap.fromTo(fresh, { y: 130, rotate: () => gsap.utils.random(-8, 8), scale: 0.9, opacity: 0 },
      { y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.4, ease: E, stagger: 0.1, clearProps: 'transform' });
    fresh.forEach((e) => { const im = $('img', e); if (im) gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: 2, ease: E, clearProps: 'transform' }); });
  };
  ScrollTrigger.batch(items, { start: 'top 95%', onEnter: deal });
}

/* ── rolling photo strip: a real swipeable scroller that drifts on its own,
   pauses while touched/dragged, and rushes ahead when the page is scrolled */
function photoRoll() {
  const vp = $('[data-roll-vp]');
  if (!vp) return;
  const track = vp.firstElementChild as HTMLElement;
  const half = () => track.scrollWidth / 2;
  let pos = 1, held = false, inView = false, boost = 0, timer = 0, lastY = scrollY;
  const hold = () => { held = true; clearTimeout(timer); };
  const release = () => { clearTimeout(timer); timer = window.setTimeout(() => { pos = vp.scrollLeft; held = false; }, 900); };
  vp.addEventListener('touchstart', hold, { passive: true });
  vp.addEventListener('touchend', release, { passive: true });
  vp.addEventListener('wheel', () => { hold(); release(); }, { passive: true });
  // desktop: drag with the mouse
  let dragX = 0, dragL = 0, dragging = false, moved = false;
  vp.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; dragging = true; moved = false; dragX = e.clientX; dragL = vp.scrollLeft; hold(); vp.classList.add('is-drag'); });
  window.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - dragX; if (Math.abs(dx) > 4) moved = true; vp.scrollLeft = dragL - dx; });
  window.addEventListener('pointerup', () => { if (!dragging) return; dragging = false; vp.classList.remove('is-drag'); release(); });
  vp.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  // endless: jump by one set when either end is reached
  vp.addEventListener('scroll', () => {
    const h = half();
    if (vp.scrollLeft >= h) { vp.scrollLeft -= h; dragL -= h; pos -= h; }
    else if (vp.scrollLeft <= 0) { vp.scrollLeft += h; dragL += h; pos += h; }
  }, { passive: true });
  new IntersectionObserver(([e]) => (inView = e.isIntersecting)).observe(vp);
  window.addEventListener('scroll', () => { const y = scrollY; boost = Math.min(boost + Math.abs(y - lastY) * 0.35, 28); lastY = y; }, { passive: true });
  gsap.ticker.add((_t, dt) => {
    if (!inView || held || document.hidden) return;
    pos += Math.min(dt, 50) * 0.045 + boost; // ~45px a second, more while the page scrolls
    boost *= 0.9;
    const h = half();
    if (pos >= h) pos -= h;
    vp.scrollLeft = pos;
  });
}

/* ── stories list: cards stack on top of each other; the one underneath shrinks and dims */
function storyStack() {
  const items = $$('[data-stack-item]');
  if (!items.length) return;
  items.forEach((item, i) => {
    const card = $('[data-stack-card]', item)!, img = $('[data-stack-img] img', item), dim = $('[data-stack-dim]', item)!;
    const title = $('[data-stack-title]', item)!;
    // title rises letter by letter when the card arrives
    const split = SplitText.create(title, { type: 'chars,words', mask: 'chars' });
    gsap.from(split.chars, { yPercent: 110, duration: 1.1, stagger: 0.03, ease: E, scrollTrigger: { trigger: item, start: 'top 65%', once: true } });
    gsap.from($$('.sk__k, .sk__intro, .sk__go, .sk__n', item), { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08, ease: E, scrollTrigger: { trigger: item, start: 'top 60%', once: true } });
    if (still) return;
    // the photo settles as the card slides up
    if (img) gsap.fromTo(img, { scale: 1.25, yPercent: -4 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: item, start: 'top bottom', end: 'top top', scrub: true } });
    // when the next card slides over, this one shrinks back and darkens
    const next = items[i + 1];
    if (next) {
      const st = { trigger: next, start: 'top bottom', end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`, scrub: true, invalidateOnRefresh: true };
      gsap.to(card, { scale: 0.9, ease: 'none', scrollTrigger: st });
      gsap.to(dim, { opacity: 0.55, ease: 'none', scrollTrigger: st });
    }
  });
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

/* ── portfolio filter: photos glide into their new places */
function filter() {
  const items = $$('[data-item]');
  if (!items.length) return;
  const set = (id: string, animate = true) => {
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === id)));
    const state = Flip.getState(items, { props: 'opacity' });
    items.forEach((it) => (it.hidden = !(id === 'all' || it.dataset.cat === id)));
    history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`);
    if (reduce || !animate) { gsap.set(items, { opacity: 1 }); ScrollTrigger.refresh(); return; }
    Flip.from(state, {
      duration: 0.9, ease: 'expo.inOut', absolute: true, stagger: 0.012, scale: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.8, y: 60 }, { opacity: 1, scale: 1, y: 0, duration: 1, ease: E, stagger: 0.04, delay: 0.1 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.8, duration: 0.45, ease: 'power2.in' }),
      onComplete: () => { const shown = items.filter((i) => !i.hidden); shown.forEach((i) => i.setAttribute('data-dealt', '')); gsap.set(shown, { opacity: 1, clearProps: 'transform' }); ScrollTrigger.refresh(); },
    });
  };
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => set(b.dataset.filter!)));
  if (location.hash) { const id = location.hash.slice(1); if ($(`[data-filter="${id}"]`)) set(id, false); }
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

/* ── anonymous visitor counts for the admin "Visitors" page (no cookies; see /api/hit.php).
   Skipped for "Do Not Track" / Global Privacy Control, and in the owner's browser once they've opened the admin. */
const quiet = (() => {
  try { if (localStorage.getItem('yb-nohit')) return true; } catch { /* ignore */ }
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return location.protocol === 'file:' || n.doNotTrack === '1' || n.globalPrivacyControl === true;
})();
function track(k: 'view' | 'whatsapp' | 'call' | 'email') {
  if (quiet) return;
  const d = new URLSearchParams({ k, p: location.pathname });
  if (k === 'view') d.set('r', new URLSearchParams(location.search).get('utm_source') || document.referrer);
  try { if (!navigator.sendBeacon?.('/api/hit.php', d)) fetch('/api/hit.php', { method: 'POST', body: d, keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}
function counts() {
  track('view');
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a');
    const h = a?.getAttribute('href') || '';
    if (h.startsWith('https://wa.me/')) track('whatsapp');
    else if (h.startsWith('tel:')) track('call');
    else if (h.startsWith('mailto:')) track('email');
  }, { capture: true });
}

/* ── contact form → WhatsApp (with a live preview of the message), or saved without WhatsApp */
function form() {
  const f = $<HTMLFormElement>('[data-wa-form]');
  if (!f) return;
  const preview = $('[data-wa-preview]');
  const text = () => {
    const d = new FormData(f);
    const name = String(d.get('name') || '').trim();
    const date = String(d.get('date') || '');
    const place = String(d.get('place') || '').trim();
    const msg = String(d.get('message') || '').trim();
    const nice = date ? new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return [
      `Hello Ybrain, I'm ${name || '…'}.`,
      `I'd like to book ${d.get('type') || 'a photo session'}${nice ? ` around ${nice}` : ''}${place ? ` (${place})` : ''}.`,
      msg ? `\n${msg}` : '',
    ].filter(Boolean).join('\n');
  };
  const upd = () => { if (preview) preview.textContent = text(); };
  f.addEventListener('input', upd);
  f.addEventListener('change', upd);
  upd();
  let busy = false, clicked = '';
  // older Safari doesn't tell which button submitted the form, so remember the last one tapped
  f.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((b) => b.addEventListener('click', () => (clicked = b.value)));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = $('[data-form-err]', f)!;
    const field = (n: string) => f.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
    const name = field('name'), phone = field('phone'), email = field('email');
    const viaForm = ((e as SubmitEvent).submitter?.getAttribute('value') ?? clicked) === 'form';
    clicked = '';
    if (!name.value.trim()) { err.textContent = 'Please add your name first.'; name.focus(); return; }
    if (email.value.trim() && !email.checkValidity()) { err.textContent = 'That email address doesn’t look right.'; email.focus(); return; }
    if (viaForm && !phone.value.trim() && !email.value.trim()) { err.textContent = 'Please add a phone number or email so we can reply.'; phone.focus(); return; }
    err.textContent = '';
    const fd = new FormData(f);
    fd.append('page', location.pathname);
    fd.append('via', viaForm ? 'form' : 'whatsapp');

    if (!viaForm) {
      // save the enquiry to the admin inbox (fire-and-forget), then open WhatsApp with the message ready
      try { if (!navigator.sendBeacon?.('/api/enquiry.php', fd)) fetch('/api/enquiry.php', { method: 'POST', body: fd, keepalive: true }).catch(() => {}); } catch { /* WhatsApp still opens */ }
      track('whatsapp');
      window.open(`https://wa.me/${f.dataset.wa}?text=${encodeURIComponent(text())}`, '_blank', 'noopener');
      return;
    }

    // no WhatsApp: send it to us and show a thank-you
    busy = true;
    f.classList.add('is-busy');
    try {
      const r = await fetch('/api/enquiry.php', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!j.ok) throw new Error(j.error || 'Something went wrong.');
      const done = $('[data-form-done]');
      if (done) {
        txt($('[data-done-name]', done), name.value.trim().split(' ')[0]);
        const conf = $('[data-done-mail]', done); if (conf) conf.hidden = !email.value.trim();
        f.hidden = true; done.hidden = false;
        done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    } catch (x) {
      err.textContent = `${(x as Error).message} You can also WhatsApp or call us on ${f.dataset.phone || ''}.`.replace(' on .', '.');
    } finally {
      busy = false;
      f.classList.remove('is-busy');
    }
  });
}

/* ── content edited in the admin panel (/api/content.php). Sections not edited keep what the page was built with.
   New elements are cloned from the built ones so they keep the page's scoped styles. */
type Pack = { name: string; note: string; from: string; includes: string[]; featured?: boolean };
type Content = { packages?: Pack[]; faqs?: { q: string; a: string }[]; testimonials?: { quote: string; name: string; kind: string }[];
  studio?: { address: string[]; hours: [string, string][]; mapUrl: string };
  portfolio?: { id: number; cat: string; src: string; srcset: string; w: number; h: number; caption: string }[] };
function loadContent(): Promise<Content | null> {
  if (location.protocol === 'file:') return Promise.resolve(null);
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 2500);
  return fetch('/api/content.php', { cache: 'no-store', signal: ctl.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}
const txt = (el: Element | null, v: string) => { if (el) el.textContent = v; };
/** "from" above a price, nothing above text like "On request" (same rule as priceLead in site.ts) */
const price = (el: Element | null, from: string) => { if (!el) return; txt($('span', el), /\d/.test(from) ? 'from' : ''); txt($('b', el), from); };
function fillList(ul: Element | null, items: string[]) {
  if (!ul) return;
  const tpl = ul.firstElementChild;
  if (!tpl) return;
  ul.replaceChildren(...items.map((x) => { const li = tpl.cloneNode(true) as Element; li.textContent = x; return li; }));
}
function applyContent(c: Content) {
  const wa = $('[data-wa-form]')?.dataset.wa || '919562914467';
  if (c.packages?.length) {
    // pricing page cards
    const full = $('[data-packages="full"]');
    if (full) {
      const tpl = $('.pk__card', full)!, badge = $('.pk__badge', full);
      full.replaceChildren(...c.packages.map((pk) => {
        const el = tpl.cloneNode(true) as HTMLElement;
        el.classList.toggle('pk__card--f', !!pk.featured);
        $('.pk__badge', el)?.remove();
        if (pk.featured && badge) el.prepend(badge.cloneNode(true));
        txt($('.pk__note', el), pk.note); txt($('.pk__name', el), pk.name); price($('.pk__from', el), pk.from);
        fillList($('.pk__list', el), pk.includes);
        const a = $<HTMLAnchorElement>('a.btn', el);
        if (a) { a.href = `https://wa.me/${wa}?text=${encodeURIComponent(`Hello Ybrain, I'd like to know more about the ${pk.name} package.`)}`; a.classList.toggle('btn--line', !pk.featured); }
        return el;
      }));
    }
    // home page teaser cards
    const teaser = $('[data-packages="teaser"]');
    if (teaser) {
      const tpl = $('.pcard', teaser)!;
      teaser.replaceChildren(...c.packages.slice(0, 3).map((pk) => {
        const el = tpl.cloneNode(true) as HTMLElement;
        el.classList.toggle('pcard--f', !!pk.featured);
        txt($('.pcard__note', el), pk.note); txt($('.pcard__name', el), pk.name); price($('.pcard__from', el), pk.from);
        fillList($('.pcard__inc', el), pk.includes);
        return el;
      }));
    }
  }
  if (c.faqs?.length) {
    const list = $('[data-faqs]');
    const tpl = list && $('details.qa', list);
    if (list && tpl) list.replaceChildren(...c.faqs.map((f, i) => {
      const el = tpl.cloneNode(true) as HTMLDetailsElement;
      el.open = i === 0;
      txt($('summary span', el), f.q); txt($('.qa__a p', el), f.a);
      return el;
    }));
  }
  if (c.testimonials) {
    const sec = $('[data-reviews]'), list = $('[data-reviews-list]');
    const tpl = list && ($('.words__item', list) || $<HTMLTemplateElement>('template', sec!)?.content.firstElementChild);
    if (sec && list && tpl) {
      sec.hidden = c.testimonials.length === 0;
      list.replaceChildren(...c.testimonials.map((t) => {
        const el = tpl.cloneNode(true) as HTMLElement;
        txt($('.words__q', el), `“${t.quote}”`);
        txt($('.cap span', el), t.kind ? `${t.name} · ${t.kind}` : t.name);
        return el;
      }));
    }
  }
  if (c.studio) {
    const s = c.studio;
    const lines = (arr: string[]) => { const f = document.createDocumentFragment(); arr.forEach((l) => { f.append(l, document.createElement('br')); }); return f; };
    $$('[data-studio-address]').forEach((el) => el.replaceChildren(lines(s.address)));
    $$('[data-studio-address-inline]').forEach((el) => (el.textContent = s.address.join(', ')));
    $$('[data-studio-hours-inline]').forEach((el) => (el.textContent = s.hours.map(([d, t]) => `${d}: ${t}`).join(' · ')));
    $$('[data-studio-hours]').forEach((el) => {
      const muted = $('span', el);
      el.replaceChildren(...s.hours.flatMap(([d, t]) => { const m = (muted?.cloneNode(false) as HTMLElement) || document.createElement('span'); m.className = 'muted'; m.textContent = ` · ${t}`; return [d, m, document.createElement('br')]; }));
    });
    if (s.mapUrl) $$<HTMLAnchorElement>('[data-studio-map]').forEach((a) => (a.href = s.mapUrl));
  }
  if (c.portfolio?.length) {
    const grid = $('[data-pf-grid]');
    const tpl = grid && $('[data-item]', grid);
    if (grid && tpl) {
      const names: Record<string, string> = {};
      $$('[data-filter]').forEach((b) => (names[b.dataset.filter!] = b.firstChild?.textContent?.trim() || ''));
      grid.replaceChildren(...c.portfolio.map((p) => {
        const el = tpl.cloneNode(true) as HTMLAnchorElement;
        const name = names[p.cat] || p.cat;
        el.href = p.src; el.dataset.cat = p.cat; el.dataset.caption = `${p.caption} — ${name}`;
        el.removeAttribute('data-dealt'); el.hidden = false;
        const img = $<HTMLImageElement>('img', el)!;
        img.removeAttribute('srcset');
        img.src = p.src; if (p.srcset) img.srcset = p.srcset;
        img.width = p.w; img.height = p.h; img.alt = `${p.caption} — ${name} by Ybrain Photography`;
        const caps = $$('.cap span', el); txt(caps[0], p.caption); txt(caps[1], name);
        return el;
      }));
      $$('[data-filter]').forEach((b) => {
        const id = b.dataset.filter!, sup = $('sup', b);
        if (sup) sup.textContent = String(id === 'all' ? c.portfolio!.length : c.portfolio!.filter((p) => p.cat === id).length);
      });
      const k = $('.pfh .kicker'); if (k) k.textContent = `Portfolio · ${c.portfolio.length} photographs`;
    }
  }
}

/* ── boot */
async function boot() {
  const hasHero = !!$('[data-hero-title]');
  if (hasHero && !reduce) gsap.set('.hl > span', { yPercent: 115 });
  const intro = heroOpening();
  const content = loadContent();
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1200))]);
  const c = await Promise.race([content, new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
  if (c) try { applyContent(c); } catch { /* keep the built content */ }
  chrome();
  storyOpening();
  const startPanels = heroPanels();
  founderGather();
  homeExtras();
  photoRoll();
  storyStack();
  reveals();
  filter();
  portfolio();
  lightbox();
  form();
  counts();
  await intro;
  if (hasHero && !reduce) { heroIntro(); gsap.delayedCall(1.2, startPanels); }
  ScrollTrigger.refresh();
}
boot();
window.addEventListener('load', () => ScrollTrigger.refresh());
