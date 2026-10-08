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

- **Shutter preloader**: photos shuffle in a frame while the *ybrain* signature glows and draws itself; the aperture closes, a camera flash fires, and you're in.
- **WebGL hero (three.js)**: photographs float in a dark, ember-lit 3D space; scrolling dollies the camera through them until it arrives *inside* the final photo. The headline flies past the camera.
- **Diya embers**: glowing red/amber sparks drift up through the hero, preloader and enquiry section.
- **Velvet marquee**: category names that speed up, lean and get heavier with your scroll speed (kinetic variable-font weight).
- **Manifesto**: words come into focus one by one as you read.
- **Cursor image trail**: in *Kerala, frame by frame*, photos drop in behind your cursor (an automatic trail plays on phones).
- **Category index**: dark rows that fill with red, with a photo following the cursor on desktop.
- **3D photo ring**: a draggable, momentum-spinning cylinder of photos; tap one to open it.
- **Gallery**: every photo appears through a *lamp-light burn* shader with a glowing ember edge, and a warm lamp glow follows the cursor. Animated category filters.
- **Lightbox**: the photo morphs from the grid to full screen (View Transitions), swipe or arrow-key through.
- **Featured stories**: full-screen cards that stack over each other with depth and blur.
- **Studio, enquiry and footer**: parallax collage, rotating "now open" stamp, WhatsApp form with rising embers, and the signature redrawing itself at the end.
- **Details**: a lamp-light glow that follows your cursor on dark sections, labels that scramble in, buttons whose fill grows from where your cursor enters, magnetic buttons.
- **Optional sound** (off until the visitor taps *Sound*): a camera shutter click and a soft tanpura-style temple drone. To use a real recording instead (e.g. nadaswaram), add it as `public/audio/ambient.mp3`. It is picked up automatically.

Photos are never stretched: every effect moves, reveals or uniformly zooms them, never warps them.

Accessibility and performance: three.js loads in parallel with the preloader; phones get fewer particles and a lower resolution. Without WebGL the site falls back to plain images with CSS reveals. *Reduced motion* turns off smooth scroll, pinning and effects. The menu and lightbox are keyboard-friendly (Esc, ← →).

## Project map

```
src/
  photos/            ← ALL images (placeholders + your photos)
  data/site.ts       ← all text & contact details
  components/        ← page sections
  scripts/main.ts    ← orchestrates every animation & interaction
  scripts/gl/        ← WebGL: hero dolly (tunnel.ts), image shader layer (media.ts)
  scripts/fx/        ← embers, cursor trail, 3D ring, scramble text, sound
  styles/global.css  ← colours, type, buttons
  lib/photos.ts      ← finds photos by name, optimises real ones
scripts/generate-placeholders.mjs  ← draws the SVG placeholders
public/              ← favicon, share image, .htaccess
```
