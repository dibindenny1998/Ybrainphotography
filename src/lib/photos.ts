/**
 * Photo resolver
 * --------------
 * Every image on the site comes from ONE folder: src/photos/
 *
 * Files are matched by the start of their name ("slot"), e.g. the slot
 * `weddings-03` matches `weddings-03-nirapara.svg` OR `weddings-03.jpg`.
 * If two files share a slot, a jpg / png / webp / avif wins over an .svg.
 *
 * Gallery categories are read from the folder too: every file starting with
 * `weddings-`, `couples-`, `portraits-`, `maternity-`, `newborn-` or `celebrations-` appears in
 * that category, sorted by name. Add `weddings-08-anything.jpg` and it shows up.
 */
import { getImage } from 'astro:assets';

type Meta = { src: string; width: number; height: number; format: string };

const modules = import.meta.glob<{ default: Meta }>(
  '/src/photos/*.{svg,jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true },
);

export interface Photo {
  slot: string;
  file: string;
  src: string;
  srcset?: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  placeholder: boolean;
  orientation: 'portrait' | 'landscape' | 'square';
}

const CATEGORY_WORDS: Record<string, string> = {
  weddings: 'Wedding',
  couples: 'Couple portrait',
  portraits: 'Portrait',
  maternity: 'Maternity portrait',
  newborn: 'Newborn portrait',
  celebrations: 'Celebration',
};

const entries = Object.entries(modules).map(([path, mod]) => {
  const file = path.split('/').pop()!;
  const base = file.replace(/\.[^.]+$/, '');
  const parts = base.split('-');
  // slot = prefix + number (+ "cover"/"detail" for stories)
  const slotLen = parts[0] === 'story' ? 3 : 2;
  const slot = parts.slice(0, slotLen).join('-').toLowerCase();
  const words = parts.slice(slotLen).join(' ');
  return { path, file, base, slot, words, meta: mod.default };
});

const cache = new Map<string, Promise<Photo>>();

async function build(e: (typeof entries)[number]): Promise<Photo> {
  const { meta } = e;
  const placeholder = meta.format === 'svg';
  const cat = e.slot.split('-')[0];
  const caption = e.words ? e.words.charAt(0).toUpperCase() + e.words.slice(1) : CATEGORY_WORDS[cat] ?? 'Photograph';
  const alt = `${caption} — ${CATEGORY_WORDS[cat] ?? 'photograph'} by Ybrain Photography`;
  const ratio = meta.width / meta.height;
  const orientation = ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square';
  let src = meta.src;
  let srcset: string | undefined;
  if (!placeholder) {
    // Real photos: generate optimised WebP in several widths at build time.
    const widths = [360, 640, 960, 1400, 2000].filter((w) => w < meta.width);
    widths.push(meta.width);
    const img = await getImage({ src: meta as any, widths, format: 'webp', quality: 80 });
    src = img.src;
    srcset = img.srcSet.attribute;
  }
  return { slot: e.slot, file: e.file, src, srcset, width: meta.width, height: meta.height, alt, caption, placeholder, orientation };
}

function pick(slot: string) {
  const s = slot.toLowerCase();
  const matches = entries.filter((e) => e.slot === s || e.base.toLowerCase().startsWith(s));
  if (!matches.length) return undefined;
  return matches.find((m) => m.meta.format !== 'svg') ?? matches[0];
}

/** One fixed photo slot, e.g. photo('hero-01') */
export async function photo(slot: string): Promise<Photo> {
  const e = pick(slot);
  if (!e) throw new Error(`[photos] No file in src/photos/ starts with "${slot}"`);
  const key = e.path;
  if (!cache.has(key)) cache.set(key, build(e));
  return cache.get(key)!;
}

/** All photos of a gallery category, sorted by filename */
export async function category(prefix: string): Promise<Photo[]> {
  const slots = [...new Set(entries.filter((e) => e.slot.startsWith(prefix + '-')).map((e) => e.slot))].sort();
  return Promise.all(slots.map((s) => photo(s)));
}
