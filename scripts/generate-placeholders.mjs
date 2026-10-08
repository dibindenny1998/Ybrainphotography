/**
 * Ybrain Photography — illustrated placeholder generator
 * -------------------------------------------------------
 * Draws every placeholder "photo" used on the site as fine red line-art SVG
 * (Kerala wedding motifs on ivory & blush) and writes them to src/photos/.
 *
 *   npm run placeholders
 *
 * You never need to run this again once you have real photos: simply drop
 * your photo into src/photos/ using the same name (any extension) and delete
 * the .svg. See src/photos/README.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'photos');
mkdirSync(OUT, { recursive: true });

const RED = '#9E1B32';
const BG = {
  ivory: ['#F7F1E7', '#F1E6D7'],
  blush: ['#F5E6DE', '#EBD2C7'],
  sand: ['#F4EBDD', '#E9DAC4'],
  rose: ['#F6ECE6', '#EFD9D2'],
  dusk: ['#F3E3DA', '#E4C3B8'],
};

/* ------------------------------------------------------------------ utils */
const r = (n) => Math.round(n * 10) / 10;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rand() * (b - a);

// line path (drawn), thin path, fill path
const L = (d, extra = '') => `<path class="l" pathLength="1" d="${d}"${extra}/>`;
const T = (d, extra = '') => `<path class="l t" pathLength="1" d="${d}"${extra}/>`;
const F = (d, op = 1) => `<path class="f" d="${d}" opacity="${op}"/>`;
const C = (cx, cy, rad, cls = 'l') =>
  `<circle class="${cls}" pathLength="1" cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}"/>`;
const E = (cx, cy, rx, ry, cls = 'l', rot = 0) =>
  `<ellipse class="${cls}" pathLength="1" cx="${r(cx)}" cy="${r(cy)}" rx="${r(rx)}" ry="${r(ry)}"${rot ? ` transform="rotate(${r(rot)} ${r(cx)} ${r(cy)})"` : ''}/>`;
const Dot = (cx, cy, rad) => `<circle class="f" cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}"/>`;
const G = (x, y, s, inner, extra = '') =>
  `<g transform="translate(${r(x)} ${r(y)}) scale(${s})"${extra}>${inner}</g>`;
const mirror = (inner) => `<g transform="scale(-1 1)">${inner}</g>`;
const mirrorD = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${r(-x)},${y}`);
const sym = (d, cls = L) => cls(d) + cls(mirrorD(d));

/* quadratic bezier sampling */
const qPoint = (a, c, b, t) => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
const qTan = (a, c, b, t) => [
  2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]),
  2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]),
];

/* ---------------------------------------------------------------- motifs */

// jasmine flower: five pointed petals in a single path
function flowerD(x, y, s, rot = 0) {
  let d = '';
  for (let k = 0; k < 5; k++) {
    const a = ((rot + k * 72) * Math.PI) / 180;
    const p = (px, py) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)];
    const [x1, y1] = p(0.4 * s, -0.3 * s);
    const [x2, y2] = p(0.3 * s, -0.95 * s);
    const [x3, y3] = p(0, -1.05 * s);
    const [x4, y4] = p(-0.3 * s, -0.95 * s);
    const [x5, y5] = p(-0.4 * s, -0.3 * s);
    d += `M${r(x)},${r(y)} C${r(x1)},${r(y1)} ${r(x2)},${r(y2)} ${r(x3)},${r(y3)} C${r(x4)},${r(y4)} ${r(x5)},${r(y5)} ${r(x)},${r(y)} `;
  }
  return d;
}
const flower = (x, y, s, rot = 0) => L(flowerD(x, y, s, rot)) + Dot(x, y, s * 0.13);

// jasmine bud: slender teardrop pointing at angle (deg, 0 = up)
function budD(x, y, s, ang) {
  const a = (ang * Math.PI) / 180;
  const p = (px, py) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)];
  const pts = [p(0.3 * s, -0.35 * s), p(0.18 * s, -0.9 * s), p(0, -s), p(-0.18 * s, -0.9 * s), p(-0.3 * s, -0.35 * s)];
  const f = (q) => `${r(q[0])},${r(q[1])}`;
  return `M${r(x)},${r(y)} C${f(pts[0])} ${f(pts[1])} ${f(pts[2])} C${f(pts[3])} ${f(pts[4])} ${r(x)},${r(y)} `;
}

// a strand of jasmine buds along a quadratic curve
function jasmineStrand(a, c, b, { step = 0.04, size = 14, flowers = 7, thread = true } = {}) {
  let out = thread ? T(`M${r(a[0])},${r(a[1])} Q${r(c[0])},${r(c[1])} ${r(b[0])},${r(b[1])}`) : '';
  let d = '';
  let i = 0;
  for (let t = step / 2; t < 1; t += step, i++) {
    const [x, y] = qPoint(a, c, b, t);
    const [tx, ty] = qTan(a, c, b, t);
    const base = (Math.atan2(ty, tx) * 180) / Math.PI;
    if (flowers && i % flowers === flowers - 1) {
      out += flower(x, y, size * 0.75, base);
    } else {
      d += budD(x, y, size, base - 90 + (i % 2 ? 55 : -55));
    }
  }
  return out + L(d);
}

// thick bridal garland hanging as a U (varamala)
function varamala(w, h, s = 11) {
  const a = [-w / 2, 0], c = [0, h * 1.6], b = [w / 2, 0];
  let out = '';
  let d = '';
  const n = Math.round(w / (s * 1.25));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = qPoint(a, c, b, t);
    const [tx, ty] = qTan(a, c, b, t);
    const len = Math.hypot(tx, ty);
    const nx = -ty / len, ny = tx / len;
    d += flowerD(x + nx * s * 0.6, y + ny * s * 0.6, s * 0.8, i * 31);
    if (i % 2) d += budD(x - nx * s * 0.7, y - ny * s * 0.7, s * 0.9, (Math.atan2(ty, tx) * 180) / Math.PI + 90);
  }
  out += L(d);
  const [bx, by] = qPoint(a, c, b, 0.5);
  // tassel
  out += T(`M${r(bx)},${r(by + s)} L${r(bx)},${r(by + s * 4)}`);
  out += L(budD(bx, by + s * 4, s * 1.5, 180) + budD(bx - s * 0.6, by + s * 3.6, s * 1.2, 200) + budD(bx + s * 0.6, by + s * 3.6, s * 1.2, 160));
  return out;
}

// nilavilakku — traditional Kerala brass lamp (height ≈ 610, base at y=300)
function lamp({ flames = true } = {}) {
  const half =
    'M0,-300 C6,-292 10,-284 8,-276 C14,-270 16,-262 10,-256 C16,-250 16,-244 8,-240 ' +
    'L8,-232 C30,-230 62,-226 76,-218 C82,-214 80,-208 72,-206 C56,-198 30,-194 12,-192 ' +
    'L12,-176 C20,-174 22,-166 14,-164 L12,-164 L12,-70 C24,-66 26,-54 14,-50 C26,-46 26,-34 14,-30 L12,-30 ' +
    'L12,70 C22,76 30,92 22,106 C18,114 12,116 12,122 L12,190 C24,200 50,214 96,232 ' +
    'C120,242 132,252 128,262 C124,268 118,270 120,276 C126,282 132,290 132,300';
  let out = '';
  if (flames) out += `<circle cx="0" cy="-232" r="150" fill="url(#glow)"/>`;
  out += sym(half);
  out += L('M-72,-210 C-40,-198 40,-198 72,-210');
  out += T('M-124,262 C-60,274 60,274 124,262');
  out += L('M-132,300 C-70,314 70,314 132,300');
  out += T('M-12,-120 L12,-120 M-12,10 L12,10');
  out += T('M-60,244 C-30,252 30,252 60,244');
  if (flames) {
    for (const [fx, fy, fs] of [[-72, -216, 1], [-38, -206, 0.85], [38, -206, 0.85], [72, -216, 1]]) {
      out += `<g transform="translate(${fx} ${fy}) scale(${fs})"><g class="fl" style="animation-delay:${r(rand())}s">` +
        L('M0,0 C-11,-6 -12,-22 0,-42 C12,-22 11,-6 0,0 Z') +
        T('M0,-6 C-5,-10 -5,-18 0,-27 C5,-18 5,-10 0,-6') + '</g></g>';
    }
  }
  return out;
}

// small clay diya with flame (≈ 120 wide)
function diya() {
  return (
    `<circle cx="0" cy="-40" r="60" fill="url(#glow)"/>` +
    L('M-60,0 C-40,30 40,30 60,0 C70,-8 76,-14 80,-16 C60,-6 -40,-6 -60,0 Z') +
    T('M-40,4 C-20,14 20,14 40,4') +
    `<g transform="translate(66 -14) scale(.8)"><g class="fl" style="animation-delay:${r(rand())}s">` +
    L('M0,0 C-11,-6 -12,-22 0,-42 C12,-22 11,-6 0,0 Z') +
    T('M0,-6 C-5,-10 -5,-18 0,-27 C5,-18 5,-10 0,-6') + '</g></g>'
  );
}

// face in profile, facing right. type: 'bride' | 'groom'
function profile(type = 'bride') {
  let out = '';
  out += L(
    'M-20,-130 C20,-138 52,-118 60,-84 C64,-70 62,-58 66,-50 C70,-42 74,-34 84,-20 C88,-14 84,-8 76,-8 ' +
      'C76,-2 80,2 78,6 C82,10 78,14 74,15 C78,19 76,26 70,30 C70,38 66,46 54,50 C44,54 34,54 28,58 ' +
      'C28,80 32,100 40,120 C50,136 80,144 130,154'
  );
  out += L('M-20,-130 C-70,-124 -100,-80 -96,-30 C-94,0 -76,24 -60,44 C-52,60 -50,80 -54,100 C-62,122 -96,136 -160,150');
  out += T('M-4,-36 C-22,-42 -30,-18 -18,-4 C-12,4 -6,2 -4,-2'); // ear
  out += T('M32,-46 C38,-40 48,-40 54,-46'); // closed eye
  out += T('M36,-42 L33,-36 M42,-40 L41,-34 M48,-41 L49,-35');
  out += T('M28,-64 C38,-71 50,-70 58,-63'); // brow
  out += T('M54,-100 C30,-126 -10,-130 -40,-118 M40,-116 C10,-134 -40,-130 -66,-108 M-40,-126 C-74,-110 -90,-80 -92,-50 M20,-128 C-20,-140 -60,-124 -80,-96');
  if (type === 'bride') {
    out += T('M60,-84 C34,-102 2,-98 -18,-82 C-30,-64 -26,-46 -14,-38'); // hair framing
    out += T('M50,-104 C20,-118 -20,-118 -50,-100');
    out += C(-104, -18, 34) + T('M-104,-38 C-90,-34 -86,-14 -100,-6 C-112,0 -120,-14 -110,-22');
    // jasmine wrapped around the bun
    let d = '';
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      d += budD(-104 + Math.cos(a) * 36, -18 + Math.sin(a) * 36, 13, (a * 180) / Math.PI + 90);
    }
    out += L(d);
    out += jasmineStrand([-118, 14], [-150, 90], [-136, 210], { step: 0.07, size: 11, flowers: 5 });
    out += jasmineStrand([-96, 16], [-110, 80], [-98, 150], { step: 0.09, size: 10, flowers: 4 });
    // jhumka
    out += T('M-10,2 L-10,16') + L('M-24,36 C-22,18 2,18 4,36 Z') + T('M-24,36 L4,36');
    out += Dot(-20, 42, 2.4) + Dot(-10, 44, 2.4) + Dot(0, 42, 2.4);
    out += C(80, -12, 5); // nose ring
    out += Dot(62, -74, 3.2); // bindi
  } else {
    out += T('M60,-84 C50,-112 10,-124 -24,-118 C-60,-110 -82,-80 -86,-46');
    out += T('M56,-96 C40,-108 20,-110 0,-104 M40,-110 C20,-122 -10,-120 -30,-112');
    out += L('M62,-80 C70,-100 66,-126 40,-140 C10,-156 -50,-150 -80,-120 C-100,-98 -104,-64 -90,-40');
    out += T('M-86,-46 C-80,-34 -70,-30 -60,-36'); // sideburn line
    out += L('M58,2 C64,-4 74,-4 80,0 C76,4 66,6 58,2'); // moustache
  }
  return out;
}

// pair of profiles leaning in, foreheads almost touching
function couple({ garlands = true } = {}) {
  let out = G(-84, 0, 1, profile('bride'));
  out += `<g transform="translate(84 0) scale(-1 1)">${profile('groom')}</g>`;
  if (garlands) {
    out += G(-58, 152, 1, varamala(130, 70, 9));
    out += G(58, 152, 1, varamala(130, 70, 9));
  }
  return out;
}

// bride seen from behind: bun crowned with jasmine, strands down the back
function brideBack() {
  let out = '';
  out += L('M-82,-40 C-92,-150 92,-150 82,-40 C78,0 58,26 40,40');
  out += L('M-82,-40 C-78,0 -58,26 -40,40');
  out += T('M0,-146 C2,-110 0,-70 2,-40');
  out += T('M-64,-110 C-40,-80 -24,-50 -20,-24 M64,-110 C40,-80 24,-50 20,-24 M-80,-70 C-60,-40 -40,-20 -30,-4 M80,-70 C60,-40 40,-20 30,-4');
  out += E(0, 0, 48, 38);
  out += T('M-30,-6 C-10,-24 20,-20 30,0 C20,16 -16,18 -26,6');
  let d = '';
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2;
    d += budD(Math.cos(a) * 52, Math.sin(a) * 42, 16, (a * 180) / Math.PI + 90);
  }
  out += L(d);
  // rose tucked at side
  out += L('M66,-34 C78,-40 86,-30 80,-22 C74,-14 62,-20 66,-30 C70,-36 78,-32 76,-26 M60,-36 C64,-52 92,-50 92,-28 C92,-10 66,-6 58,-20');
  out += jasmineStrand([-26, 36], [-34, 180], [-40, 330], { step: 0.05, size: 13, flowers: 5 });
  out += jasmineStrand([0, 40], [6, 200], [0, 360], { step: 0.045, size: 13, flowers: 6 });
  out += jasmineStrand([26, 36], [36, 180], [40, 320], { step: 0.05, size: 13, flowers: 5 });
  // neck & shoulders
  out += L('M-38,40 C-40,70 -42,96 -46,112 C-60,130 -150,146 -240,176');
  out += L('M38,40 C40,70 42,96 46,112 C60,130 150,146 240,176');
  out += L('M-150,162 C-130,300 130,300 150,162'); // blouse back
  out += T('M-160,170 C-140,320 140,320 160,170');
  // saree drape over left shoulder with kasavu border
  out += L('M-240,176 C-210,260 -190,340 -186,420');
  out += L('M-120,150 C-150,250 -176,340 -184,420');
  out += T('M-128,152 C-158,252 -184,342 -192,420 M-136,154 C-166,254 -192,344 -200,420');
  // jhumkas peeking
  out += T('M-86,-24 L-90,-4') + L('M-104,16 C-102,-2 -78,-2 -76,16 Z');
  out += T('M86,-24 L90,-4') + L('M76,16 C78,-2 102,-2 104,16 Z');
  return out;
}

// vintage SLR camera (≈ 370 wide)
function camera() {
  let out = '';
  out += L('M-170,-60 L170,-60 Q182,-60 182,-48 L182,96 Q182,108 170,108 L-170,108 Q-182,108 -182,96 L-182,-48 Q-182,-60 -170,-60 Z');
  out += L('M-140,-60 L-140,-78 L-60,-78 L-44,-110 L44,-110 L60,-78 L140,-78 L140,-60');
  out += T('M-36,-96 L36,-96 M-182,-34 L-96,-34 M96,-34 L182,-34 M-182,84 L-96,84 M96,84 L182,84');
  out += C(0, 24, 88) + C(0, 24, 74) + C(0, 24, 54) + C(0, 24, 32, 'l t') + C(0, 24, 14, 'l t');
  let d = '';
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    d += `M${r(Math.cos(a) * 74)},${r(24 + Math.sin(a) * 74)} L${r(Math.cos(a) * 82)},${r(24 + Math.sin(a) * 82)} `;
  }
  out += T(d);
  out += T('M-26,4 C-18,-6 -6,-10 6,-8');
  out += L('M92,-78 L92,-92 Q92,-96 96,-96 L118,-96 Q122,-96 122,-92 L122,-78');
  out += E(-104, -88, 26, 8) + T('M-126,-86 L-126,-78 M-114,-82 L-114,-74 M-102,-80 L-102,-72 M-90,-82 L-90,-74');
  out += L('M-150,-48 L-112,-48 L-112,-24 L-150,-24 Z');
  out += C(150, -36, 7, 'l t');
  out += `<text x="0" y="-84" class="tx" text-anchor="middle" font-size="11" letter-spacing="3">YBRAIN</text>`;
  return out;
}

// nirapara — brimming paddy measure with coconut-flower spray
function nirapara() {
  let out = '';
  // coconut flower spray
  for (let k = -7; k <= 7; k++) {
    const ex = k * 26 + rr(-6, 6);
    const ey = -300 + Math.abs(k) * 14 + rr(-10, 10);
    const cx = k * 8;
    const cy = -200;
    out += T(`M0,-70 Q${r(cx)},${r(cy)} ${r(ex)},${r(ey)}`);
    let dd = '';
    for (let t = 0.35; t < 1; t += 0.11) {
      const [x, y] = qPoint([0, -70], [cx, cy], [ex, ey], t);
      dd += `M${r(x - 3)},${r(y)} a3,2 0 1,0 6,0 a3,2 0 1,0 -6,0 `;
    }
    out += L(dd);
  }
  out += L('M-90,-42 C-60,-92 60,-92 90,-42');
  let g = '';
  for (let k = 0; k < 34; k++) {
    const x = rr(-74, 74);
    const top = -42 - (1 - (x / 90) ** 2) * 44;
    const y = rr(top + 6, -44);
    g += `M${r(x - 5)},${r(y)} Q${r(x)},${r(y - 4)} ${r(x + 5)},${r(y)} Q${r(x)},${r(y + 4)} ${r(x - 5)},${r(y)} `;
  }
  out += T(g);
  out += E(0, -40, 92, 18);
  out += sym('M90,-40 C72,0 70,40 82,64 C92,86 102,110 106,132');
  out += L('M-106,132 C-60,154 60,154 106,132');
  out += T('M-80,0 C-40,14 40,14 80,0 M-84,62 C-40,78 40,78 84,62 M-98,104 C-50,122 50,122 98,104');
  return out;
}

// uruli — wide brass bowl with floating flowers & a diya
function uruli() {
  let out = '';
  out += E(0, 0, 230, 46) + E(0, 6, 200, 34, 'l t');
  out += L('M-230,0 C-214,130 214,130 230,0');
  out += L('M-70,104 C-60,124 60,124 70,104 M-90,130 C-40,142 40,142 90,130');
  out += T('M-80,112 L-90,130 M80,112 L90,130');
  for (const [x, y, s] of [[-120, 4, 22], [-50, -10, 18], [40, 12, 24], [120, -4, 18], [-10, 18, 14], [160, 12, 14], [-160, 8, 14]]) {
    out += `<g transform="translate(${x} ${y}) scale(1 .5)">${flower(0, 0, s, x)}</g>`;
  }
  out += G(-2, -6, 0.55, diya());
  return out;
}

// Kerala temple mandapam with tiered roof, pillars, hanging lamps
function mandapam() {
  let out = '';
  out += sym('M0,-250 C6,-246 8,-238 6,-232 C14,-228 14,-218 6,-214 C12,-210 12,-202 4,-198 L4,-190');
  out += sym('M0,-190 L90,-150 C110,-140 140,-120 150,-100 C156,-92 164,-90 172,-94');
  out += sym('M100,-100 L170,-100 C210,-60 270,-10 360,30 C370,34 380,32 386,24');
  out += T('M-140,-96 L140,-96');
  let h = '';
  for (let k = -9; k <= 9; k++) h += `M${k * 18},-104 L${k * 22},-60 `;
  out += T(h);
  out += T('M-180,-60 L180,-60 M-330,30 L330,30');
  for (const x of [-260, -130, 130, 260]) {
    out += L(`M${x - 10},40 L${x - 10},270 M${x + 10},40 L${x + 10},270`);
    out += T(`M${x - 16},40 L${x + 16},40 L${x + 16},52 L${x - 16},52 Z M${x - 16},258 L${x + 16},258 L${x + 16},270 L${x - 16},270 Z`);
  }
  out += L('M-380,270 L380,270 M-400,290 L400,290 M-420,310 L420,310');
  for (const x of [-195, 195]) {
    out += T(`M${x},44 L${x},104`) + G(x, 134, 0.5, lamp());
  }
  out += jasmineStrand([-250, 56], [-195, 110], [-140, 56], { step: 0.08, size: 9, flowers: 4 });
  out += jasmineStrand([140, 56], [195, 110], [250, 56], { step: 0.08, size: 9, flowers: 4 });
  out += jasmineStrand([-120, 56], [0, 120], [120, 56], { step: 0.05, size: 10, flowers: 5 });
  return out;
}

// coconut palm, base at (0,0)
function palm(lean = 1, height = 420) {
  const tx = 60 * lean, ty = -height;
  let out = '';
  out += L(`M-12,0 C${10 * lean - 8},${-height * 0.35} ${30 * lean - 8},${-height * 0.7} ${tx - 8},${ty}`);
  out += L(`M12,0 C${26 * lean + 8},${-height * 0.35} ${44 * lean + 8},${-height * 0.7} ${tx + 8},${ty + 2}`);
  let rings = '';
  for (let t = 0.08; t < 0.96; t += 0.07) {
    const y = -height * t;
    const x = 60 * lean * t * t;
    rings += `M${r(x - 10)},${r(y)} Q${r(x)},${r(y + 4)} ${r(x + 10)},${r(y)} `;
  }
  out += T(rings);
  const angles = [-170, -140, -110, -70, -40, -10, 20, 200];
  for (const a0 of angles) {
    const a = (a0 * Math.PI) / 180;
    const len = rr(150, 210);
    const end = [tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.6 + 60];
    const ctrl = [tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.6 - 30];
    out += L(`M${r(tx)},${r(ty)} Q${r(ctrl[0])},${r(ctrl[1])} ${r(end[0])},${r(end[1])}`);
    let lf = '';
    for (let t = 0.15; t < 0.98; t += 0.07) {
      const [x, y] = qPoint([tx, ty], ctrl, end, t);
      const [dx, dy] = qTan([tx, ty], ctrl, end, t);
      const l = Math.hypot(dx, dy);
      const ux = dx / l, uy = dy / l;
      const k = 34 * (1 - t * 0.6);
      lf += `M${r(x)},${r(y)} l${r(ux * k * 0.5 - uy * k)},${r(uy * k * 0.5 + ux * k + 6)} `;
      lf += `M${r(x)},${r(y)} l${r(ux * k * 0.5 + uy * k)},${r(uy * k * 0.5 - ux * k + 12)} `;
    }
    out += T(lf);
  }
  out += C(tx - 10, ty + 14, 9) + C(tx + 8, ty + 16, 9) + C(tx, ty + 26, 9);
  return out;
}

// kettuvallam houseboat (≈ 660 wide), waterline at y=0
function boat() {
  let out = '';
  out += L('M-320,-24 C-200,14 200,14 320,-24 C326,-34 334,-40 340,-38');
  out += L('M-320,-24 C-328,-34 -334,-42 -342,-40');
  out += L('M-310,-14 C-200,40 200,40 310,-14');
  out += L('M-190,-8 C-190,-120 190,-120 190,-8');
  out += T('M-150,-10 C-150,-96 150,-96 150,-10');
  let ribs = '';
  for (let x = -150; x <= 150; x += 30) ribs += `M${x},-8 L${x},${r(-100 + (x / 190) ** 2 * 60)} `;
  out += T(ribs);
  out += T('M-120,-40 L-60,-40 L-60,-10 M60,-40 L120,-40 L120,-10');
  out += T('M230,-20 L250,-90 M250,-90 L270,-14');
  return out;
}
function ripples(w, y0, rows = 5) {
  let d = '';
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * 22;
    let x = -w / 2 + rr(0, 60);
    while (x < w / 2) {
      const len = rr(40, 140);
      d += `M${r(x)},${r(y)} Q${r(x + len / 2)},${r(y + 5)} ${r(Math.min(x + len, w / 2))},${r(y)} `;
      x += len + rr(30, 90);
    }
  }
  return T(d);
}
function birds(n, w, h) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = rr(-w / 2, w / 2), y = rr(-h / 2, h / 2), s = rr(8, 14);
    d += `M${r(x - s)},${r(y)} Q${r(x - s / 2)},${r(y - s / 2)} ${r(x)},${r(y)} Q${r(x + s / 2)},${r(y - s / 2)} ${r(x + s)},${r(y)} `;
  }
  return T(d);
}

// umbrella with rain (couple optional underneath)
function umbrella() {
  let out = '';
  let d = 'M-200,0 C-190,-150 190,-150 200,0 ';
  for (let k = 0; k < 8; k++) {
    const x0 = 200 - k * 50;
    d += `Q${x0 - 25},${-26} ${x0 - 50},0 `;
  }
  out += L(d);
  let ribs = '';
  for (let k = 1; k < 8; k++) {
    const x = -200 + k * 50;
    ribs += `M0,-136 Q${r(x * 0.6)},-100 ${x},0 `;
  }
  out += T(ribs);
  out += L('M0,-136 L0,-160 M0,0 L0,250 C0,286 -50,286 -50,252');
  return out;
}
function rain(w, h, n = 60) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = rr(-w / 2, w / 2), y = rr(-h / 2, h / 2), l = rr(14, 34);
    d += `M${r(x)},${r(y)} l${r(-l * 0.25)},${r(l)} `;
  }
  return T(d);
}

// swaddled newborn asleep (≈ 300 wide)
function swaddle() {
  let out = '';
  out += L('M-130,10 C-140,-40 -60,-60 20,-50 C80,-44 120,-20 120,10 C120,44 60,58 -10,56 C-80,54 -124,44 -130,10 Z');
  out += T('M-100,-30 C-40,0 20,10 90,-30 M-60,52 C-30,10 10,-20 60,-46 M20,54 C30,20 60,0 110,-6');
  out += C(150, -6, 46);
  out += L('M118,-36 C130,-62 176,-62 192,-28 C170,-40 140,-44 118,-36 Z');
  out += C(150, -66, 7, 'l t');
  out += T('M150,8 C156,14 166,14 172,8 M152,10 L150,15 M160,12 L160,17 M168,10 L170,15');
  out += T('M180,22 C186,26 190,24 192,20');
  out += T('M124,24 C130,30 136,32 142,32');
  return out;
}
function crescent(R = 260) {
  return L(`M0,${-R} A${R},${R} 0 1,0 0,${R} A${R * 0.78},${R * 0.78} 0 1,1 0,${-R} Z`);
}
function sparkle(x, y, s) {
  return L(`M${x},${y - s} Q${x + s * 0.12},${y - s * 0.12} ${x + s},${y} Q${x + s * 0.12},${y + s * 0.12} ${x},${y + s} Q${x - s * 0.12},${y + s * 0.12} ${x - s},${y} Q${x - s * 0.12},${y - s * 0.12} ${x},${y - s} Z`);
}
function foot(mirrorIt = false) {
  let out = L('M0,0 C-34,0 -44,-60 -36,-110 C-30,-150 30,-158 36,-118 C42,-80 32,-30 26,-12 C20,0 10,0 0,0 Z');
  out += C(-24, -160, 13) + C(2, -172, 10) + C(22, -168, 8) + C(36, -156, 7) + C(44, -140, 6);
  out += T('M-20,-40 C-6,-30 10,-32 20,-44');
  return mirrorIt ? mirror(out) : out;
}
function heart(s = 1) {
  return L(`M0,${30 * s} C${-60 * s},${-10 * s} ${-40 * s},${-60 * s} 0,${-30 * s} C${40 * s},${-60 * s} ${60 * s},${-10 * s} 0,${30 * s} Z`);
}

// thottil — Kerala cloth cradle hanging from a spring
function thottil() {
  let out = '';
  out += L('M0,-360 L0,-330');
  let sp = 'M0,-330 ';
  for (let k = 0; k < 8; k++) sp += `C14,${-326 + k * 9} 14,${-320 + k * 9} 0,${-318 + k * 9} C-14,${-316 + k * 9} -14,${-310 + k * 9} 0,${-308 + k * 9} `;
  out += T(sp);
  out += L('M0,-254 L-190,0 M0,-254 L190,0 M0,-254 L-120,10 M0,-254 L120,10');
  out += L('M-200,0 C-160,150 160,150 200,0');
  out += L('M-200,0 C-100,30 100,30 200,0');
  out += T('M-170,30 C-110,110 110,110 170,30 M-120,70 C-60,100 60,100 120,70');
  out += G(10, -10, 0.55, swaddle());
  for (const [x, l] of [[-60, 90], [60, 70]]) out += T(`M${x},-200 L${x},${-200 + l}`) + sparkle(x, -200 + l + 12, 12);
  return out;
}

// chenda drum with sticks
function chenda() {
  let out = '';
  out += E(0, -170, 90, 22) + E(0, -170, 76, 16, 'l t');
  out += L('M-90,-170 L-90,170 M90,-170 L90,170');
  out += L('M-90,170 C-60,194 60,194 90,170');
  out += T('M-90,-140 C-50,-120 50,-120 90,-140 M-90,140 C-50,160 50,160 90,140');
  let z = '';
  const xs = [-80, -54, -24, 8, 40, 70];
  xs.forEach((x, i) => {
    z += `M${x},${r(-134 + (x / 90) ** 2 * -8 + 16)} L${xs[i + 1] ?? 86},${r(146 + (x / 90) ** 2 * -10 + 10)} `;
    z += `M${x},${r(146 + (x / 90) ** 2 * -10 + 10)} L${xs[i + 1] ?? 86},${r(-134 + (x / 90) ** 2 * -8 + 16)} `;
  });
  out += T(z);
  out += L('M60,-220 L200,-330 M196,-334 a7,7 0 1,1 8,8');
  out += L('M-40,-230 C-120,-260 -170,-320 -150,-370');
  out += T('M130,-210 C150,-190 152,-160 140,-140 M150,-230 C180,-200 184,-150 164,-120 M-130,-200 C-160,-180 -164,-150 -150,-120');
  return out;
}

// strings of festoon lights across a width
function festoon(w, y, sag, n) {
  let out = T(`M${-w / 2},${y} Q0,${y + sag * 2} ${w / 2},${y}`);
  let d = '';
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const [x, yy] = qPoint([-w / 2, y], [0, y + sag * 2], [w / 2, y], t);
    out += `<circle cx="${r(x)}" cy="${r(yy + 22)}" r="26" fill="url(#glow)"/>`;
    d += `M${r(x)},${r(yy)} L${r(x)},${r(yy + 8)} M${r(x - 7)},${r(yy + 12)} C${r(x - 9)},${r(yy + 26)} ${r(x - 4)},${r(yy + 34)} ${r(x)},${r(yy + 34)} C${r(x + 4)},${r(yy + 34)} ${r(x + 9)},${r(yy + 26)} ${r(x + 7)},${r(yy + 12)} Z `;
  }
  return out + L(d);
}

// rangoli mandala
function mandala(R = 260) {
  let out = C(0, 0, 18) + Dot(0, 0, 5);
  let d = '';
  for (let k = 0; k < 8; k++) d += budD(0, 0, R * 0.3, k * 45);
  out += L(d);
  out += C(0, 0, R * 0.38, 'l t');
  d = '';
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 360;
    const rad = (a * Math.PI) / 180;
    d += budD(Math.cos(rad - Math.PI / 2) * R * 0.4, Math.sin(rad - Math.PI / 2) * R * 0.4, R * 0.26, a);
  }
  out += L(d);
  let dots = '';
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    dots += Dot(Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74, 3.4);
  }
  out += dots;
  d = '';
  for (let k = 0; k < 24; k++) {
    const a1 = (k / 24) * Math.PI * 2, a2 = ((k + 1) / 24) * Math.PI * 2, am = (a1 + a2) / 2;
    d += `M${r(Math.cos(a1) * R * 0.82)},${r(Math.sin(a1) * R * 0.82)} Q${r(Math.cos(am) * R * 1.08)},${r(Math.sin(am) * R * 1.08)} ${r(Math.cos(a2) * R * 0.82)},${r(Math.sin(a2) * R * 0.82)} `;
  }
  out += L(d);
  out += C(0, 0, R * 0.82, 'l t') + C(0, 0, R * 1.12, 'l t');
  let outer = '';
  for (let k = 0; k < 24; k++) {
    const a = ((k + 0.5) / 24) * Math.PI * 2;
    outer += flowerD(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, R * 0.07, (a * 180) / Math.PI + 90);
  }
  out += L(outer);
  return out;
}

// pair of rings
function rings() {
  let out = '';
  out += C(-50, 20, 80) + C(-50, 20, 68, 'l t');
  out += C(50, -10, 80) + C(50, -10, 68, 'l t');
  out += L('M34,-90 L50,-112 L66,-90 L50,-80 Z M34,-90 L66,-90 M42,-90 L50,-80 L58,-90 M42,-90 L50,-112 L58,-90');
  out += sparkle(96, -126, 14) + sparkle(-120, -60, 9);
  return out;
}

// studio: arched window with light, softbox, stool
function studio() {
  let out = '';
  out += L('M-120,200 L-120,-60 A120,120 0 0,1 120,-60 L120,200 Z');
  out += T('M-100,200 L-100,-60 A100,100 0 0,1 100,-60 L100,200 M0,-160 L0,200 M-100,-20 L100,-20 M-100,80 L100,80');
  out += T('M-140,200 L140,200 M-150,214 L150,214');
  let rays = '';
  for (let k = 0; k < 6; k++) rays += `M${-90 + k * 36},${-20 + k * 4} L${180 + k * 60},420 `;
  out += `<g opacity=".5">${T(rays)}</g>`;
  // softbox
  out += G(-330, 40, 1,
    L('M-70,-120 L70,-120 L100,-40 L70,40 L-70,40 L-100,-40 Z') + T('M-100,-40 L100,-40 M0,-120 L0,40 M-70,-120 L-30,-40 L-70,40 M70,-120 L30,-40 L70,40') +
    L('M0,40 L0,380 M0,380 L-60,440 M0,380 L60,440 M0,380 L0,440') + T('M-14,120 L14,120'));
  // stool
  out += G(260, 300, 1, E(0, 0, 70, 16) + L('M-56,8 L-70,150 M56,8 L70,150 M-20,14 L-26,150 M20,14 L26,150') + T('M-64,90 L64,90'));
  return out;
}
function tripodCamera() {
  return G(0, -120, 0.42, camera()) + L('M0,-60 L0,40 M0,40 L-110,330 M0,40 L110,330 M0,40 L10,340') + T('M-40,150 L40,150');
}
// soft hand-drawn ground line
const ground = (w, y) => T(`M${-w / 2},${y} C${-w / 4},${y - 6} ${w / 4},${y + 6} ${w / 2},${y}`);
function jasmineScatter(w, h, n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = rr(-w / 2, w / 2), y = rr(-h / 2, h / 2);
    out += i % 3 ? L(budD(x, y, rr(10, 16), rr(0, 360))) : flower(x, y, rr(10, 15), rr(0, 70));
  }
  return out;
}

/* ------------------------------------------------------------- framing */
function svgDoc({ name, w, h, bg = 'ivory', title, scene, disc, frame = true }) {
  const W = 1200, H = Math.round((1200 * h) / w);
  const [b1, b2] = BG[bg];
  const label = name.toUpperCase().replace(/-/g, ' ');
  title = title.replace(/&/g, '&amp;');
  const pad = W * 0.045;
  let body = '';
  if (disc) body += `<circle cx="${r(W * disc[0])}" cy="${r(H * disc[1])}" r="${r(W * disc[2])}" fill="url(#disc)"/>`;
  body += scene(W, H);
  // stagger draw-in animation
  let i = 0;
  body = body.replace(/class="l( t)?"/g, (m) => `${m} style="animation-delay:${Math.min(1.6, 0.15 + i++ * 0.035).toFixed(2)}s"`);
  const fr = frame
    ? `<rect x="${r(pad)}" y="${r(pad)}" width="${r(W - pad * 2)}" height="${r(H - pad * 2)}" fill="none" stroke="${RED}" stroke-opacity=".28" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
      `<g fill="${RED}" font-family="Georgia, 'Times New Roman', serif">` +
      `<text x="${r(pad + W * 0.02)}" y="${r(H - pad - W * 0.022)}" font-size="${r(W * 0.026)}" font-style="italic" opacity=".85">${title}</text>` +
      `<text x="${r(W - pad - W * 0.02)}" y="${r(H - pad - W * 0.022)}" font-size="${r(W * 0.014)}" letter-spacing="${r(W * 0.004)}" text-anchor="end" opacity=".6" font-family="Helvetica, Arial, sans-serif">${label}</text>` +
      `</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>${title} — placeholder (${name})</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
<radialGradient id="disc"><stop offset="0" stop-color="#E7C3B6" stop-opacity=".75"/><stop offset=".7" stop-color="#EDD3C8" stop-opacity=".45"/><stop offset="1" stop-color="#EDD3C8" stop-opacity="0"/></radialGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#F2B9A3" stop-opacity=".75"/><stop offset=".5" stop-color="#F3CDBE" stop-opacity=".35"/><stop offset="1" stop-color="#F6E3D8" stop-opacity="0"/></radialGradient>
<style>
.l{fill:none;stroke:${RED};stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;animation:draw 2.8s cubic-bezier(.65,0,.25,1) both}
.t{stroke-width:.9;stroke-opacity:.75}
.f{fill:${RED}}
.tx{fill:${RED};font-family:Helvetica,Arial,sans-serif}
.fl{transform-box:fill-box;transform-origin:50% 100%;animation:flick 2.4s ease-in-out infinite alternate}
@keyframes draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}
@keyframes flick{0%{transform:scale(1,1)}35%{transform:scale(.94,1.08)}70%{transform:scale(1.04,.95)}100%{transform:scale(.97,1.05)}}
@media (prefers-reduced-motion:reduce){.l,.fl{animation:none}}
</style>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${body}
${fr}
</svg>
`;
}

/* --------------------------------------------------------- compositions */
// [w, h] aspect, then a scene(W,H) function
const S = (x, y, s, inner) => (W, H) => G(W * x, H * y, s * (W / 1200), inner);
const all = (...fns) => (W, H) => fns.map((f) => f(W, H)).join('');

const placeholders = [
  // HERO
  { name: 'hero-01-temple-wedding', w: 3, h: 2, bg: 'blush', title: 'The temple mandapam, Guruvayur', disc: [0.5, 0.42, 0.42],
    scene: all(S(0.5, 0.48, 0.86, mandapam()), S(0.5, 0.57, 0.57, couple()), S(0.5, 0.16, 1, birds(5, 300, 60))) },
  { name: 'hero-02-bride-jasmine', w: 2, h: 3, bg: 'rose', title: 'Mullappoo', disc: [0.5, 0.36, 0.5],
    scene: S(0.5, 0.4, 1.35, brideBack()) },
  { name: 'hero-03-nilavilakku', w: 4, h: 5, bg: 'sand', title: 'The first flame', disc: [0.5, 0.3, 0.38],
    scene: all(S(0.5, 0.52, 1.25, lamp()), S(0.5, 0.86, 1, jasmineScatter(700, 60, 9))) },
  { name: 'hero-04-couple', w: 1, h: 1, bg: 'dusk', title: 'Foreheads, touching', disc: [0.5, 0.45, 0.4],
    scene: S(0.5, 0.42, 1.55, couple()) },

  // GALLERY — WEDDINGS
  { name: 'weddings-01-garland-exchange', w: 4, h: 5, bg: 'blush', title: 'The garland exchange', disc: [0.5, 0.36, 0.42],
    scene: S(0.5, 0.38, 1.6, couple()) },
  { name: 'weddings-02-nilavilakku', w: 2, h: 3, bg: 'sand', title: 'Nilavilakku', disc: [0.5, 0.3, 0.45],
    scene: all(S(0.5, 0.5, 1.45, lamp()), S(0.5, 0.88, 1, jasmineScatter(800, 80, 12))) },
  { name: 'weddings-03-nirapara', w: 1, h: 1, bg: 'ivory', title: 'Nirapara & nilavilakku', disc: [0.42, 0.38, 0.36],
    scene: all(S(0.4, 0.62, 1.15, nirapara()), S(0.74, 0.55, 0.9, lamp())) },
  { name: 'weddings-04-mandapam', w: 3, h: 2, bg: 'rose', title: 'Before the muhurtham', disc: [0.5, 0.4, 0.35],
    scene: S(0.5, 0.52, 1.05, mandapam()) },
  { name: 'weddings-05-bride-jasmine', w: 2, h: 3, bg: 'blush', title: 'Jasmine, braided in', disc: [0.5, 0.3, 0.48],
    scene: S(0.5, 0.38, 1.4, brideBack()) },
  { name: 'weddings-06-rings', w: 4, h: 3, bg: 'ivory', title: 'Two rings, one promise', disc: [0.5, 0.5, 0.3],
    scene: all(S(0.5, 0.5, 1.4, rings()), S(0.5, 0.5, 1, jasmineScatter(1000, 600, 10))) },
  { name: 'weddings-07-uruli', w: 3, h: 2, bg: 'sand', title: 'Uruli of petals', disc: [0.5, 0.48, 0.32],
    scene: S(0.5, 0.52, 1.6, uruli()) },

  // COUPLES
  { name: 'couples-01-foreheads', w: 4, h: 5, bg: 'dusk', title: 'Quiet, after the vows', disc: [0.5, 0.4, 0.42],
    scene: S(0.5, 0.42, 1.75, couple({ garlands: false })) },
  { name: 'couples-02-backwaters', w: 3, h: 2, bg: 'blush', title: 'Kumarakom backwaters', disc: [0.5, 0.38, 0.2],
    scene: all(S(0.5, 0.62, 1.1, boat()), S(0.5, 0.7, 1, ripples(1100, 0, 6)), S(0.12, 0.66, 0.9, palm(1, 440)), S(0.9, 0.68, 0.8, palm(-1, 400)), S(0.62, 0.22, 1, birds(6, 300, 80))) },
  { name: 'couples-03-monsoon', w: 2, h: 3, bg: 'rose', title: 'Monsoon, shared', disc: [0.5, 0.3, 0.4],
    scene: all(S(0.5, 0.5, 1, rain(1100, 1700, 90)), S(0.5, 0.32, 1.4, umbrella()), S(0.5, 0.62, 0.85, couple({ garlands: false }))) },
  { name: 'couples-04-palms-sunset', w: 4, h: 3, bg: 'dusk', title: 'Varkala, golden hour', disc: [0.56, 0.48, 0.26],
    scene: all(S(0.24, 0.86, 1.25, palm(1, 480)), S(0.84, 0.86, 1, palm(-1, 420)), S(0.5, 0.8, 1, ripples(1050, 0, 3)), S(0.5, 0.2, 1, birds(5, 260, 60))) },
  { name: 'couples-05-hearts', w: 1, h: 1, bg: 'blush', title: 'A small yes', disc: [0.5, 0.5, 0.32],
    scene: all(S(0.5, 0.5, 2.6, heart(1)), S(0.5, 0.5, 1, jasmineScatter(900, 900, 14))) },

  // NEWBORN
  { name: 'newborn-01-moon', w: 4, h: 5, bg: 'rose', title: 'Moon-soft', disc: [0.5, 0.42, 0.42],
    scene: all(S(0.42, 0.44, 1.35, crescent(260)), S(0.52, 0.66, 1.15, swaddle()), S(0.5, 0.5, 1, sparkle(320, -420, 22) + sparkle(-360, -300, 14) + sparkle(380, 80, 12) + sparkle(-300, 420, 16))) },
  { name: 'newborn-02-tiny-feet', w: 1, h: 1, bg: 'blush', title: 'Ten tiny toes', disc: [0.5, 0.5, 0.34],
    scene: all(S(0.42, 0.66, 1.6, `<g transform="rotate(-12)">${foot()}</g>`), S(0.6, 0.62, 1.6, `<g transform="rotate(14)">${foot(true)}</g>`), S(0.5, 0.22, 1, heart(0.6))) },
  { name: 'newborn-03-thottil', w: 2, h: 3, bg: 'sand', title: 'The thottil', disc: [0.5, 0.56, 0.4],
    scene: S(0.5, 0.54, 1.8, thottil()) },
  { name: 'newborn-04-first-sleep', w: 3, h: 2, bg: 'ivory', title: 'First sleep', disc: [0.5, 0.5, 0.26],
    scene: all(S(0.48, 0.56, 1.7, swaddle()), S(0.5, 0.5, 1, sparkle(-420, -180, 18) + sparkle(400, -220, 12) + sparkle(460, 160, 16))) },

  // PORTRAITS
  { name: 'portraits-01-bride-back', w: 2, h: 3, bg: 'dusk', title: 'Portrait in jasmine', disc: [0.5, 0.3, 0.46],
    scene: S(0.5, 0.36, 1.5, brideBack()) },
  { name: 'portraits-02-jhumka', w: 4, h: 5, bg: 'rose', title: 'Jhumka & light', disc: [0.56, 0.4, 0.4],
    scene: S(0.54, 0.42, 2.6, profile('bride')) },
  { name: 'portraits-03-camera', w: 3, h: 2, bg: 'sand', title: 'The ybrain camera', disc: [0.5, 0.46, 0.3],
    scene: S(0.5, 0.5, 1.8, camera()) },
  { name: 'portraits-04-groom', w: 4, h: 5, bg: 'ivory', title: 'The groom, waiting', disc: [0.46, 0.4, 0.4],
    scene: (W, H) => `<g transform="translate(${W * 0.46} ${H * 0.42}) scale(${-2.6 * (W / 1200)} ${2.6 * (W / 1200)})">${profile('groom')}${G(30, 160, 1, varamala(170, 80, 11))}</g>` },

  // EVENTS
  { name: 'events-01-chenda', w: 2, h: 3, bg: 'blush', title: 'Chenda melam', disc: [0.5, 0.42, 0.42],
    scene: S(0.5, 0.56, 1.75, chenda()) },
  { name: 'events-02-festoon', w: 3, h: 2, bg: 'dusk', title: 'Reception lights', disc: [0.5, 0.75, 0.28],
    scene: all(S(0.5, 0, 1, festoon(1400, 60, 130, 14) + festoon(1400, 260, 120, 12) + festoon(1400, 480, 90, 16))) },
  { name: 'events-03-diyas', w: 16, h: 9, bg: 'sand', title: 'A thousand small flames', disc: [0.5, 0.6, 0.2],
    scene: (W, H) => [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88].map((x, i) => G(W * x, H * (0.62 + Math.sin(i * 0.9) * 0.06), (W / 1200) * (0.95 + (i % 2) * 0.25), diya())).join('') + G(W / 2, H * 0.74, W / 1200, ripples(1050, 0, 2)) },
  { name: 'events-04-rangoli', w: 1, h: 1, bg: 'ivory', title: 'Rangoli at the door', disc: [0.5, 0.5, 0.4],
    scene: S(0.5, 0.5, 1.55, mandala(260)) },

  // FEATURED STORIES
  { name: 'story-01-cover', w: 3, h: 2, bg: 'rose', title: 'Anjali & Rahul — Guruvayur', disc: [0.5, 0.4, 0.4],
    scene: all(S(0.5, 0.48, 0.84, mandapam()), S(0.5, 0.57, 0.55, couple())) },
  { name: 'story-01-detail', w: 4, h: 5, bg: 'blush', title: 'The thali', disc: [0.5, 0.42, 0.36],
    scene: all(S(0.5, 0.36, 1.2, varamala(560, 280, 22)), S(0.5, 0.75, 1, jasmineScatter(800, 160, 8))) },
  { name: 'story-02-cover', w: 3, h: 2, bg: 'dusk', title: 'Meera & Joseph — Kumarakom', disc: [0.7, 0.36, 0.18],
    scene: all(S(0.42, 0.64, 1.05, boat()), S(0.5, 0.72, 1, ripples(1150, 0, 5)), S(0.86, 0.7, 0.95, palm(-1, 460)), S(0.3, 0.2, 1, birds(7, 340, 90))) },
  { name: 'story-02-detail', w: 4, h: 5, bg: 'ivory', title: 'Rings at the altar', disc: [0.5, 0.44, 0.36],
    scene: S(0.5, 0.46, 1.8, rings()) },
  { name: 'story-03-cover', w: 3, h: 2, bg: 'blush', title: 'Fathima & Aslam — Kozhikode', disc: [0.5, 0.8, 0.3],
    scene: all(S(0.5, 0, 1, festoon(1400, 40, 120, 12) + festoon(1400, 230, 130, 15)), S(0.5, 0.78, 1, [-320, -160, 0, 160, 320].map((x) => G(x, 0, 0.9, diya())).join(''))) },
  { name: 'story-03-detail', w: 4, h: 5, bg: 'rose', title: 'Mehendi night', disc: [0.5, 0.46, 0.4],
    scene: S(0.5, 0.46, 1.5, mandala(250)) },
  { name: 'story-04-cover', w: 3, h: 2, bg: 'sand', title: 'Baby Ishaan — first thirty days', disc: [0.5, 0.5, 0.3],
    scene: all(S(0.5, 0.58, 1.05, thottil()), S(0.5, 0.5, 1, sparkle(-420, -200, 16) + sparkle(400, -160, 12))) },
  { name: 'story-04-detail', w: 4, h: 5, bg: 'blush', title: 'Little feet', disc: [0.5, 0.48, 0.36],
    scene: all(S(0.4, 0.68, 1.7, `<g transform="rotate(-10)">${foot()}</g>`), S(0.62, 0.64, 1.7, `<g transform="rotate(12)">${foot(true)}</g>`)) },

  // STUDIO
  { name: 'studio-01-still-life', w: 4, h: 5, bg: 'sand', title: 'Lamp & lens', disc: [0.38, 0.36, 0.4],
    scene: all(S(0.32, 0.5, 1.15, lamp()), S(0.68, 0.72, 0.85, camera()), S(0.5, 0.88, 1, ground(900, 0))) },
  { name: 'studio-02-the-studio', w: 3, h: 2, bg: 'ivory', title: 'The new studio', disc: [0.5, 0.4, 0.3],
    scene: S(0.56, 0.42, 0.92, studio()) },
  { name: 'studio-03-photographer', w: 2, h: 3, bg: 'rose', title: 'Behind the lens', disc: [0.5, 0.34, 0.42],
    scene: all(S(0.5, 0.5, 1.7, tripodCamera()), S(0.5, 0.86, 1, ground(800, 0))) },
];

let count = 0;
for (const p of placeholders) {
  seed = [...p.name].reduce((a, c) => a + c.charCodeAt(0), 7) * 97;
  const scene = typeof p.scene === 'function' ? p.scene : () => p.scene;
  writeFileSync(join(OUT, `${p.name}.svg`), svgDoc({ ...p, scene }));
  count++;
}
console.log(`✓ wrote ${count} placeholders to src/photos/`);
