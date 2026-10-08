/**
 * Hero "dolly" — photos float in 3D depth inside a dark, ember-lit space.
 * Scrolling moves the camera forward through them until it arrives inside the
 * final photograph, which fills the screen. Planes always keep the photo's own
 * aspect ratio: nothing is ever stretched.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, ShaderMaterial, Texture,
  BufferGeometry, Float32BufferAttribute, Points, AdditiveBlending, LinearFilter, MathUtils,
} from 'three';
import { loadTextureSource } from './textures';

export interface TunnelPhoto { src: string; w: number; h: number }

const planeVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const planeFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uAlpha;
  uniform float uReady;
  uniform float uGlow;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    // thin lamp-light rim that brightens as the photo comes close
    vec2 e = min(vUv, 1.0 - vUv);
    float rim = 1.0 - smoothstep(0.0, 0.012, min(e.x, e.y));
    vec3 col = c.rgb + vec3(1.0, 0.32, 0.36) * rim * 0.55 * uGlow;
    gl_FragColor = vec4(col, uAlpha * uReady);
  }
`;
const emberVert = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uCamZ;
  uniform float uPx;
  varying float vSeed;
  varying float vTw;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.25 + aSeed * 0.55) + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.6 + aSeed * 40.0) * 0.25;
    p.z = mod(p.z - uCamZ + 40.0, 40.0) - 40.0 + uCamZ;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx * (6.0 / -mv.z);
    vSeed = aSeed;
    vTw = 0.55 + 0.45 * sin(uTime * 3.0 + aSeed * 60.0);
  }
`;
const emberFrag = /* glsl */ `
  varying float vSeed;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a;
    vec3 red = vec3(1.0, 0.25, 0.36);
    vec3 amber = vec3(1.0, 0.66, 0.36);
    vec3 col = mix(red, amber, step(0.55, vSeed));
    gl_FragColor = vec4(col * a * vTw, a * vTw);
  }
`;

export function createTunnel(canvas: HTMLCanvasElement, photos: TunnelPhoto[], finalPhoto: TunnelPhoto) {
  const mobile = window.innerWidth < 768;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.05, 120);
  const SPACING = mobile ? 3.6 : 3.0;
  const START = mobile ? -4.2 : -3.8;
  const geo = new PlaneGeometry(1, 1);

  type P = { mesh: Mesh; mat: ShaderMaterial; z: number };
  const planes: P[] = [];

  const makePlane = (ph: TunnelPhoto) => {
    const mat = new ShaderMaterial({
      uniforms: { uTex: { value: null }, uAlpha: { value: 0 }, uReady: { value: 0 }, uGlow: { value: 0 } },
      vertexShader: planeVert,
      fragmentShader: planeFrag,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new Mesh(geo, mat);
    loadTextureSource(ph.src, mobile ? 900 : 1400).then((src) => {
      const tex = new Texture(src as any);
      tex.minFilter = LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      mat.uniforms.uTex.value = tex;
      const t0 = performance.now();
      const fade = () => {
        const k = Math.min(1, (performance.now() - t0) / 700);
        mat.uniforms.uReady.value = k;
        if (k < 1) requestAnimationFrame(fade);
      };
      fade();
    });
    return { mesh, mat };
  };

  const list = photos.slice(0, mobile ? 11 : 16);
  list.forEach((ph, i) => {
    const { mesh, mat } = makePlane(ph);
    const z = START - i * SPACING;
    const ang = i * 2.39996 + 0.6; // golden angle → evenly scattered around the path
    const rad = (mobile ? 1.1 : 2.4) + (i % 3) * (mobile ? 0.25 : 0.5);
    const h = (mobile ? 1.3 : 2.0) + (i % 3) * (mobile ? 0.25 : 0.45);
    mesh.scale.set((h * ph.w) / ph.h, h, 1);
    mesh.position.set(Math.cos(ang) * rad * (mobile ? 1 : 1.35), Math.sin(ang) * rad * (mobile ? 1.3 : 0.72), z);
    mesh.renderOrder = z; // farther photos draw first
    scene.add(mesh);
    planes.push({ mesh, mat, z });
  });

  // the final photograph the camera arrives inside
  const fin = makePlane(finalPhoto);
  const zFinal = START - list.length * SPACING - 6;
  fin.mesh.position.set(0, 0, zFinal);
  fin.mesh.renderOrder = zFinal;
  scene.add(fin.mesh);
  const finP: P = { mesh: fin.mesh, mat: fin.mat, z: zFinal };
  const ARRIVE = 2.2; // final camera distance from the last photo

  // embers
  const N = mobile ? 160 : 480;
  const pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = MathUtils.randFloatSpread(mobile ? 6 : 12);
    pos[i * 3 + 1] = MathUtils.randFloatSpread(12);
    pos[i * 3 + 2] = -Math.random() * 40;
    size[i] = 0.6 + Math.random() * 2.2;
    seed[i] = Math.random();
  }
  const eg = new BufferGeometry();
  eg.setAttribute('position', new Float32BufferAttribute(pos, 3));
  eg.setAttribute('aSize', new Float32BufferAttribute(size, 1));
  eg.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
  const emat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCamZ: { value: 0 }, uPx: { value: renderer.getPixelRatio() * (mobile ? 4 : 5) } },
    vertexShader: emberVert,
    fragmentShader: emberFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(eg, emat);
  points.frustumCulled = false;
  points.renderOrder = 1000;
  scene.add(points);

  // state
  let progress = 0, smooth = 0, intro = 1, mx = 0, my = 0, sx = 0, sy = 0, visible = true;
  const camEnd = zFinal + ARRIVE;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // final photo covers the viewport at arrival (cropped, never stretched)
    const visH = 2 * ARRIVE * Math.tan(MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    const ar = finalPhoto.w / finalPhoto.h;
    const fh = Math.max(visH, visW / ar) * 1.02;
    fin.mesh.scale.set(fh * ar, fh, 1);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const t0 = performance.now();
  const render = () => {
    if (!visible) return;
    const time = (performance.now() - t0) / 1000;
    smooth += (progress - smooth) * 0.08;
    sx += (mx - sx) * 0.05;
    sy += (my - sy) * 0.05;
    const k = Math.min(1, smooth / 0.86); // arrive a little early, then hold on the final photo
    const ease = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const camZ = MathUtils.lerp(0, camEnd, ease) + intro * 7;
    const settle = 1 - ease;
    camera.position.set(sx * 0.55 * settle, sy * 0.35 * settle, camZ);
    camera.lookAt(sx * 0.2 * settle, sy * 0.12 * settle, camZ - 10);
    camera.rotation.z = Math.sin(time * 0.25) * 0.012 * settle;

    for (const p of [...planes, finP]) {
      const d = p.z - camZ; // negative = ahead of the camera
      const far = 1 - MathUtils.smoothstep(-d, 26, 48);
      const near = p === finP ? 1 : MathUtils.smoothstep(-d, 0.35, 2.4);
      p.mat.uniforms.uAlpha.value = far * near;
      p.mat.uniforms.uGlow.value = MathUtils.smoothstep(-d, 14, 3) * (p === finP ? 0 : 1);
      p.mesh.visible = p.mat.uniforms.uAlpha.value > 0.002;
      if (p !== finP) p.mesh.rotation.z = Math.sin(time * 0.3 + p.z) * 0.02;
    }
    emat.uniforms.uTime.value = time;
    emat.uniforms.uCamZ.value = camZ;
    points.visible = k < 0.98;
    renderer.render(scene, camera);
  };

  return {
    render,
    setProgress: (p: number) => (progress = MathUtils.clamp(p, 0, 1)),
    setMouse: (x: number, y: number) => { mx = x; my = y; },
    setIntro: (v: number) => (intro = v),
    setVisible: (v: boolean) => (visible = v),
    destroy: () => { ro.disconnect(); renderer.dispose(); },
  };
}
