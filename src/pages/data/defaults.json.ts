import type { APIRoute } from 'astro';
import { site, packages, faqs, testimonials, categories } from '../../data/site';

// The content the site was built with. The admin panel starts from these values.
export const GET: APIRoute = () =>
  new Response(JSON.stringify({
    packages,
    faqs,
    testimonials,
    studio: { address: site.studio.address, hours: site.studio.hours, mapUrl: site.studio.mapUrl },
    categories,
  }), { headers: { 'Content-Type': 'application/json' } });
