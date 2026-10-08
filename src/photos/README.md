# Photos: everything the site shows lives in this folder

**Name rule:** `<category>-<number>-<words>.jpg`
e.g. `weddings-06-temple-morning.jpg`. The words become the caption ("Temple morning").

| Starts with | Appears in |
|---|---|
| `weddings-` `couples-` `maternity-` `newborn-` `portraits-` `celebrations-` | Gallery, under that category (sorted by name) |

**Add a photo:** drop it in with the next number. **Remove:** delete the file.
**Replace:** save a new photo with the same `category-number` start.

Some photos are also used in fixed spots. Change those in `src/data/site.ts`:
- `heroPhotos`: the home page hero (slow cross-fade)
- `selected`: the three frames on the home page
- `stories`: cover + photos for each story page
- `studio-01-night.jpg`: the studio building (home + Studio page). Replace it with an
  original photo of the studio — the current one is cropped from the poster.

Tips: export JPGs about 2000–2500px on the long edge, without Instagram overlays.
The build makes fast WebP versions for every screen size automatically.

The current photos were cropped from Instagram screenshots as temporary stand-ins. Swap in
the original full-resolution files for the sharpest result (especially `newborn-03…08`
and `maternity-02…07`, which came from small grid tiles).
