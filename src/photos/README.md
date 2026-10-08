# Photos — everything the site shows lives in this folder

Every `.svg` here is an illustrated **placeholder**. To use a real photo you don't
touch any code: add your photo with the **same starting name**, then rebuild.

```
weddings-03-nirapara.svg      ← placeholder
weddings-03.jpg               ← your photo (wins automatically)
```

You can delete the `.svg` once your photo is in, but you don't have to: a real
photo (`.jpg` `.jpeg` `.png` `.webp` `.avif`) always beats a placeholder with the
same name.

## Name rules

| Name starts with | Used for | Best shape |
|---|---|---|
| `hero-01` | The big arch that opens to full screen | Landscape 3:2, subject in the centre |
| `hero-02`, `hero-04` | Small pills inside the headline | Anything (cropped to a pill) |
| `hero-03` | Small lamp portrait beside "The approach" | Portrait |
| `weddings-…` `couples-…` `newborn-…` `portraits-…` `events-…` | Portfolio gallery, by category | Any shape. Never cropped, never stretched |
| `story-01-cover` … `story-04-cover` | Featured story main image | Landscape |
| `story-01-detail` … `story-04-detail` | Small arch image on each story | Portrait |
| `studio-01`, `studio-02`, `studio-03` | Studio section collage | 01 portrait · 02 landscape · 03 portrait |

**Adding more gallery photos:** just add a file, e.g. `weddings-08-sadya.jpg`. It
appears in the Weddings gallery automatically, sorted by name. The words after the
number become its caption ("Sadya"), so `couples-06-vagamon-mist.jpg` is captioned
"Vagamon mist".

**Removing a gallery photo:** delete the file.

## Tips

- Export JPGs at about 2400px on the long edge. The build automatically makes
  small, fast WebP versions for phones.
- Photos are never distorted. Gallery images keep their own shape. Fixed frames
  (hero arch, story covers) crop from the centre, like Instagram does.
- Change names, phone number and text in `src/data/site.ts`.

The placeholders were drawn by `scripts/generate-placeholders.mjs` (`npm run placeholders`).
