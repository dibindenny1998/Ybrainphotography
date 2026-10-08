# Ybrain Photography — website

Cinematic portfolio for **Ybrain Photography**, Kerala wedding & portrait studio.
It's a static site built with [Astro](https://astro.build), with
[GSAP](https://gsap.com) for animation and [Lenis](https://lenis.darkroom.engineering) for smooth scrolling.

## Quick start

```bash
npm install        # once
npm run dev        # live preview at http://localhost:4321
npm run build      # makes the finished site in /dist
```

## Things you'll want to change

| What | Where |
|---|---|
| **WhatsApp number**, phone, email, Instagram, address, hours | `src/data/site.ts` (top of file) |
| Category names and blurbs, featured stories, the 4-step process | `src/data/site.ts` |
| **Photos** | `src/photos/`. See [`src/photos/README.md`](src/photos/README.md) |
| Domain (for share links / SEO) | `site:` in `astro.config.mjs` |
| Share image | `public/og-image.png` (1200×630) |

⚠️ The WhatsApp number is a placeholder (`919000000000`). Set yours before going live.

## Upload to Hostinger

1. Run `npm run build`.
2. In Hostinger **hPanel → Files → File Manager**, open `public_html`.
3. Upload **everything inside** the `dist` folder (not the folder itself), including the hidden
   `.htaccess` file. Easiest: zip the *contents* of `dist`, upload the zip, then right-click → Extract.
4. Visit your domain. Done.

Whenever you change photos or text, run `npm run build` again and re-upload `dist`.

## What's inside

- **Preloader**: the handwritten *ybrain* signature draws itself, then a royal-red curtain lifts.
- **Hero**: oversized Bodoni headline with live photo "pills" that grow inside the words.
- **The arch**: a temple-arch window that opens into a full-screen frame as you scroll.
- **Marquee**: category names that speed up and lean with your scroll.
- **Manifesto**: words light up one by one as you read.
- **Category index**: hover a row on desktop and a photo follows your cursor.
- **Gallery**: masonry portfolio with animated category filters and a swipeable lightbox.
- **Featured stories**: a horizontal, pinned film-strip on desktop and stacked cards on phones.
- **Studio**: parallax collage, rotating "now open" stamp, the 4-step process.
- **Enquire**: a form that writes a ready-to-send WhatsApp message.
- **Footer**: the signature draws itself again as you reach the end.

Accessibility: honours *reduced motion* (no smooth scroll, pinning or reveals), works without
JavaScript, keyboard-navigable menu and lightbox (Esc / ← →), and real alt text for every image.

## Project map

```
src/
  photos/            ← ALL images (placeholders + your photos)
  data/site.ts       ← all text & contact details
  components/        ← page sections
  scripts/main.ts    ← every animation & interaction
  styles/global.css  ← colours, type, buttons
  lib/photos.ts      ← finds photos by name, optimises real ones
scripts/generate-placeholders.mjs  ← draws the SVG placeholders
public/              ← favicon, share image, .htaccess
```
