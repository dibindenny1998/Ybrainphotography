import type { APIRoute } from 'astro';
import { categories } from '../../data/site';
import { category } from '../../lib/photos';

// Every portfolio photo the site was built with, in the order the portfolio shows them.
// The admin panel uses this list so built-in photos can be reordered, re-categorised or hidden.
export const GET: APIRoute = async () => {
  const groups = await Promise.all(categories.map(async (c) => ({ ...c, photos: await category(c.id) })));
  const items: unknown[] = [];
  const max = Math.max(...groups.map((g) => g.photos.length));
  for (let i = 0; i < max; i++) for (const g of groups) {
    const p = g.photos[i];
    if (p) items.push({ slot: p.slot, cat: g.id, src: p.src, srcset: p.srcset ?? '', w: p.width, h: p.height, caption: p.caption });
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
};
