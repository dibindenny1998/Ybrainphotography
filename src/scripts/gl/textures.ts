/**
 * Loads any image (real photo or SVG placeholder) into a canvas that WebGL can
 * use as a texture. SVG placeholders have their draw-in CSS animation switched
 * off first so the texture captures the finished drawing.
 */
const cache = new Map<string, Promise<HTMLCanvasElement | HTMLImageElement>>();

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function svgToCanvas(src: string, maxSide: number) {
  const text = await (await fetch(src)).text();
  const fixed = text.replace('</style>', '.l,.fl{animation:none!important}</style>');
  const url = URL.createObjectURL(new Blob([fixed], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 1500;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadTextureSource(src: string, maxSide = 1400) {
  const key = src + '|' + maxSide;
  if (!cache.has(key)) cache.set(key, /\.svg(\?|$)/i.test(src) ? svgToCanvas(src, maxSide) : loadImage(src));
  return cache.get(key)!;
}

/** Best (largest) URL for an <img>, from its srcset if it has one */
export function bestSrc(img: HTMLImageElement) {
  const ss = img.getAttribute('srcset');
  if (ss) return ss.split(',').pop()!.trim().split(' ')[0];
  return img.currentSrc || img.src;
}
