# Ybrain Photography — website

A calm, multi-page portfolio site for **Ybrain Photography** and the new Ybrain studio.
Static site built with [Astro](https://astro.build). Upload it to any host (Hostinger etc.).

## Pages

| Page | URL |
|---|---|
| Home | `/` |
| Portfolio (filterable gallery + full-screen viewer) | `/portfolio/` |
| Stories (index + one page per story) | `/stories/`, `/stories/<name>/` |
| The Studio (opened 3 Oct 2026) | `/studio/` |
| About & process | `/about/` |
| Contact (WhatsApp enquiry form) | `/contact/` |

## Quick start

```bash
npm install        # once
npm run dev        # preview at http://localhost:4321
npm run build      # finished site in /dist
```

## Editing

- **All text, phone, studio details, stories, testimonials:** `src/data/site.ts`
  Look for `TODO` — studio street address, Google Maps link, Instagram, email.
  Testimonials stay hidden until you add real quotes there.
- **Photos:** `src/photos/` — see [`src/photos/README.md`](src/photos/README.md).
- **Colours & type:** top of `src/styles/global.css`.

## Upload to Hostinger

1. `npm run build`
2. hPanel → File Manager → `public_html` → delete the old files.
3. Upload the **contents** of `dist` (a zip of them, then Extract), including `.htaccess`.

## Design notes

"Window light on paper": warm paper, linen and sand tones, umber text and a single bronze
accent, so the photographs carry all the colour. Newsreader (serif) + Manrope (sans).
Motion is deliberately quiet — soft fades and image reveals, smooth scrolling on desktop,
native scrolling on phones, and smooth cross-page transitions in supporting browsers.
