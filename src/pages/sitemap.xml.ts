import type { APIRoute } from 'astro';
import { stories, nav } from '../data/site';

// A simple sitemap for Google — lists every page on the site.
export const GET: APIRoute = ({ site }) => {
  const paths = ['/', ...nav.map((n) => n.href), ...stories.map((s) => `/stories/${s.slug}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });
};
