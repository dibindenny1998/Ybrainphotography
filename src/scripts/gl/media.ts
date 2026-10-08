/**
 * WebGL image layer. One fixed, click-through canvas draws the gallery and
 * studio photographs exactly where their <img> sits in the page, adding:
 *  • a "lamp-light burn" reveal: the photo appears through a noisy, glowing ember edge
 *  • a warm lamp glow that follows the cursor on hover
 * Photos are cover-fitted in the shader: cropped like CSS object-fit, never stretched.
 */
import {
  WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial, Texture,
  LinearFilter, Vector2, Vector4,
} from 'three';
import gsap from 'gsap';
import { loadTextureSource, bestSrc } from './textures';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform vec4 uRadius;   // top-right, bottom-right, top-left, bottom-left (px)
  uniform vec2 uMouse;
  uniform float uProgress;
  uniform float uHover;
  uniform float uOpacity;
  uniform float uSeed;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  float sdRoundBox(vec2 p, vec2 b, vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x = (p.y > 0.0) ? r.x : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
  }
  vec2 coverUv(vec2 uv, vec2 res, vec2 img) {
    vec2 s = res / img;
    float k = max(s.x, s.y);
    vec2 sz = img * k;
    return (uv * res + (sz - res) * 0.5) / sz;
  }

  void main() {
    vec2 uv = coverUv(vUv, uRes, uImg);
    // uniform zoom only (no warping): settles in on reveal, leans in on hover
    float zoom = 1.0 - 0.045 * uHover - 0.12 * (1.0 - uProgress);
    uv = (uv - 0.5) * zoom + 0.5;
    vec3 col = texture2D(uTex, uv).rgb;

    // lamp-light burn reveal
    float n = fbm(vUv * vec2(uRes.x / uRes.y, 1.0) * 3.2 + uSeed * 10.0);
    float t = (1.0 - vUv.y) * 0.55 + n * 0.5;
    float thr = uProgress * 1.3 - 0.12;
    float shown = 1.0 - smoothstep(thr - 0.035, thr, t);
    float edge = smoothstep(thr - 0.11, thr - 0.03, t) * (1.0 - smoothstep(thr - 0.01, thr + 0.03, t));
    vec3 ember = mix(vec3(0.75, 0.04, 0.16), vec3(1.0, 0.42, 0.26), smoothstep(0.35, 1.0, edge));
    col = col * shown + ember * edge * 1.25;

    // warm lamp glow under the cursor
    float md = distance(vUv * uRes, uMouse * uRes) / max(uRes.x, uRes.y);
    col += vec3(1.0, 0.55, 0.32) * 0.2 * uHover * smoothstep(0.6, 0.0, md);

    // rounded / arched corners matching the CSS border-radius
    float d = sdRoundBox((vUv - 0.5) * uRes, uRes * 0.5, uRadius);
    float shape = 1.0 - smoothstep(-0.75, 0.75, d);

    gl_FragColor = vec4(col, max(shown, edge) * shape * uOpacity);
  }
`;

interface Item {
  el: HTMLElement;
  img: HTMLImageElement;
  fig: HTMLElement;
  mesh: Mesh;
  mat: ShaderMaterial;
  ready: boolean;
  radii: Vector4;
}

export function createMediaGL(canvas: HTMLCanvasElement) {
  const mobile = window.innerWidth < 768;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const geo = new PlaneGeometry(1, 1);
  const items: Item[] = [];
  let W = 0, H = 0, drewLast = true;

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    items.forEach(readRadii);
  };
  const readRadii = (it: Item) => {
    const cs = getComputedStyle(it.el);
    const r = it.el.getBoundingClientRect();
    const cap = Math.min(r.width, r.height) / 2;
    const px = (v: string) => Math.min(cap, parseFloat(v) || 0);
    it.radii.set(px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderTopLeftRadius), px(cs.borderBottomLeftRadius));
  };
  window.addEventListener('resize', resize);
  resize();

  function add(el: HTMLElement, opts: { revealed?: boolean } = {}) {
    const img = el.querySelector('img')!;
    const mat = new ShaderMaterial({
      uniforms: {
        uTex: { value: null },
        uRes: { value: new Vector2(1, 1) },
        uImg: { value: new Vector2(Number(img.getAttribute('width')) || 1, Number(img.getAttribute('height')) || 1) },
        uRadius: { value: new Vector4() },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uProgress: { value: opts.revealed ? 1 : 0 },
        uHover: { value: 0 },
        uOpacity: { value: 1 },
        uSeed: { value: Math.random() },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    const it: Item = { el, img, fig: (el.closest('[data-gitem]') as HTMLElement) ?? el, mesh, mat, ready: false, radii: mat.uniforms.uRadius.value };
    readRadii(it);
    items.push(it);

    loadTextureSource(bestSrc(img), mobile ? 1000 : 1600).then((src) => {
      const tex = new Texture(src as any);
      tex.minFilter = LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      mat.uniforms.uTex.value = tex;
      const s = src as HTMLCanvasElement | HTMLImageElement;
      const w = (s as HTMLImageElement).naturalWidth || s.width, h = (s as HTMLImageElement).naturalHeight || s.height;
      mat.uniforms.uImg.value.set(w, h);
      it.ready = true;
      el.classList.add('gl-ready');
    }).catch(() => { /* keep the plain <img> */ });

    // hover lamp-light
    el.addEventListener('pointerenter', () => gsap.to(mat.uniforms.uHover, { value: 1, duration: 0.8, ease: 'power3.out' }));
    el.addEventListener('pointerleave', () => gsap.to(mat.uniforms.uHover, { value: 0, duration: 0.9, ease: 'power3.out' }));
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(mat.uniforms.uMouse.value, { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, duration: 0.5, ease: 'power3.out' });
    });

    return {
      reveal: (delay = 0) => gsap.to(mat.uniforms.uProgress, { value: 1, duration: 2.2, delay, ease: 'power2.inOut' }),
      show: () => (mat.uniforms.uProgress.value = 1),
    };
  }

  function render() {
    let any = false;
    for (const it of items) {
      if (!it.ready) { it.mesh.visible = false; continue; }
      const r = it.el.getBoundingClientRect();
      const fs = it.fig.style;
      const op = fs.visibility === 'hidden' ? 0 : fs.opacity === '' ? 1 : Number(fs.opacity);
      const on = r.width > 1 && r.bottom > -50 && r.top < H + 50 && op > 0.001;
      it.mesh.visible = on;
      if (!on) continue;
      any = true;
      it.mesh.position.set(r.left + r.width / 2 - W / 2, H / 2 - (r.top + r.height / 2), 0);
      it.mesh.scale.set(r.width, r.height, 1);
      it.mat.uniforms.uRes.value.set(r.width, r.height);
      it.mat.uniforms.uOpacity.value = op;
    }
    if (any || drewLast) renderer.render(scene, camera);
    drewLast = any;
  }

  return { add, render, refresh: () => items.forEach(readRadii) };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
