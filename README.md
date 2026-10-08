# Ybrain Photography — website

Portfolio website for **Ybrain Photography**.
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

- **Preloader:** photos flick by, a progress counter runs, then the frame flies into the hero slideshow.
- **Hero:** big serif headline with an auto-playing slideshow (wipe transitions, captions, progress bar) and a marigold category ticker.
- **Statement:** words light up as you read, with parallax photos.
- **Services:** six categories; on desktop a photo preview follows your cursor; tapping one filters the gallery.
- **Gallery:** masonry portfolio, category filters with smooth re-layout, and a full-screen viewer (swipe or arrow keys).
- **Stories:** a horizontal film strip, pinned on desktop and swipeable on phones.
- **About & process, contact** (a WhatsApp enquiry form), and a footer with a giant wordmark and the signature drawing itself.

Performance: only GPU-friendly animations (transform, opacity, clip-path), no WebGL, smooth scrolling on desktop only (phones keep native scrolling), and the slideshow pauses when off screen. Reduced-motion is respected.

## Project map

```
src/
  photos/            ← ALL images (placeholders + your photos)
  data/site.ts       ← all text & contact details
  components/        ← page sections
  scripts/main.ts    ← every animation & interaction
  styles/global.css  ← colours, type, buttons
  lib/photos.ts      ← finds photos by name, optimises real ones
public/              ← favicon, share image, .htaccess
```
