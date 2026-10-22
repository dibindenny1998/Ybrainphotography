# Ybrain Photography — Deploy guide (v18: website + backend)

Hand this file and `ybrain-v18-upload-to-hostinger.zip` to the chat/agent that has Hostinger access.
It explains what is in the zip, exactly how to deploy it, how to verify it, and how to troubleshoot.

> The one-time admin setup code is not in this copy; the owner has it.

---

## 1. Quick facts

| Item | Value |
|---|---|
| Live domain | `https://ybrainphotography.com` |
| Hostinger account username | `u826343823` |
| Website type | Plain shared web hosting (Apache/LiteSpeed + PHP). **No Node.js.** |
| Document root | `/home/u826343823/domains/ybrainphotography.com/public_html` |
| Private data folder (created automatically) | `/home/u826343823/domains/ybrainphotography.com/ybrain-data` (**outside** public_html) |
| SSL | Active (Hostinger lifetime SSL, HTTPS redirect on) |
| Admin panel | `https://ybrainphotography.com/admin/` |
| Admin login email | `hi@ybrainphotography.com` (single user: Yadhu) |
| Enquiry alert email | `hi@ybrainphotography.com` |
| Zip | `ybrain-v18-upload-to-hostinger.zip` (~9.7 MB). Its contents go **directly** into `public_html` (no subfolder). |
| Source code | GitHub `dibindenny1998/ybrainphotography`, branch `claude/ybrain-photography-portfolio-x9fk9b` |

---

## 2. What's in v18

**Website (static, built with Astro):** home, portfolio, stories (+5 story pages), studio, pricing & FAQ, about, contact, animated 404, sitemap, share image.

**Backend (new — PHP 8 + SQLite, no database setup needed):**

- **Enquiries:** the contact form saves every enquiry (name, optional phone, shoot type, date, place, message) and emails `hi@ybrainphotography.com`, while still opening WhatsApp as before. Has a spam trap and a rate limit of 6 per IP per hour.
- **Admin panel at `/admin/`:**
  - Login screens: first-time setup (needs the setup code), login, and forgot password (sends an email reset link).
  - Enquiries inbox: status New / Replied / Booked / Lost, private notes, WhatsApp/Call buttons, search, CSV export.
  - Editors for prices (packages), FAQ, client reviews, and studio address, hours and map link. Each goes live as soon as Save is tapped.
  - Portfolio manager: upload (resized in the browser to 2400px, then re-encoded on the server to WebP at 640, 1400 and 2200px), captions, categories, reorder, hide, delete.
- **How public pages get edits:** they fetch `/api/content.php` and show the edited sections. Anything not edited keeps the content the site was built with.

### File map (inside `public_html` after extracting)

```
index.html, portfolio/, stories/…, studio/, pricing/, about/, contact/, 404.html
assets/            fonts, CSS, JS, optimised photos (fingerprinted file names)
data/defaults.json built-in prices/FAQ/reviews/studio (admin starts from these)
data/photos.json   list of built-in portfolio photos
api/
  _lib.php         shared helpers (DB, security, mail) – not directly reachable (.htaccess)
  enquiry.php      POST – contact form saves here
  content.php      GET  – content edited in the admin (JSON)
  media.php        GET  – serves uploaded photos from the private folder
  .htaccess        denies files starting with "_"
admin/
  index.php        the admin panel (router + actions)
  _views.php, _photos.php   page templates / photo handling (denied directly)
  admin.css, admin.js
  .htaccess        DirectoryIndex index.php, deny "_" files, noindex header
.htaccess          www/hostingersite → https://ybrainphotography.com, HTTPS,
                   /media/u/* → api/media.php, caching, 404 page
robots.txt         disallows /admin/ and /api/
sitemap.xml, og-image.jpg, favicon.svg, apple-touch-icon.png
```

### Private data folder (created on first request — never inside the zip)

```
/home/u826343823/domains/ybrainphotography.com/ybrain-data/
  ybrain.sqlite (+ -wal/-shm)   enquiries, settings, photo list, admin user
  media/u/                      uploaded photos (WebP)
  sessions/                     admin login sessions (kept 14 days)
  .htaccess                     "deny all" safety net
```

**Re-uploading the website never touches this folder**, so enquiries and uploaded photos survive every redeploy. **Never delete it.** Back it up occasionally: download the folder or the `ybrain.sqlite` file.

---

## 3. Before deploying — checks (read-only)

1. **PHP version ≥ 8.0** for `ybrainphotography.com`. 8.1–8.3 recommended. The code was tested on PHP 8.3.
2. **PHP extensions** are normally on by default on Hostinger. Enable any that are missing:
   - `pdo_sqlite` (and `sqlite3`), needed for the database
   - `gd` with WebP support, needed for photo uploads (falls back to JPEG if WebP is missing)
   - `exif` (photo orientation), `mbstring`
3. Look at the current contents of `public_html`. Expect: the v15–v17 site files, possibly a leftover folder named **`File`**, and possibly old `ybrain-v*.zip` files. These can all be removed.

---

## 4. Deploy — step by step

### Option A — Hostinger API (for an agent)
1. **Upload the zip** into `public_html`:
   - Get an upload URL with `hosting_files_generate-upload-url` (username `u826343823`, domain `ybrainphotography.com`). It returns `url`, `auth_key` and `rest_auth_key`.
   - TUS-upload the zip as `ybrain-v18-upload-to-hostinger.zip`: POST with `Upload-Length`, then PATCH with the bytes.
2. **Deploy it** with `hosting_websites_deploy-static-site-archive`:
   - `username`: `u826343823`
   - `domain`: `ybrainphotography.com`
   - `archive_path`: `ybrain-v18-upload-to-hostinger.zip`

   ⚠️ This **overwrites `public_html`**. That's intended: it replaces the old site, and the private `ybrain-data` folder is outside `public_html`, so it isn't affected.
3. Make sure the zip itself and any `File/` folder are **not** left in `public_html`. A zip left there can be downloaded by anyone.
4. **Clear the cache** with `hosting_cache_clear-website` (username `u826343823`, domain `ybrainphotography.com`). Leave normal caching **on**; the backend sends its own "don't cache" headers.

### Option B — hPanel by hand
1. hPanel → Websites → **ybrainphotography.com** → **File Manager** → `public_html`.
2. Select everything inside `public_html`, including dot-files like `.htaccess` and the `File` folder, and delete it.
   - **Don't** go up a level, and **don't** touch the `ybrain-data` folder next to `public_html`.
3. Upload `ybrain-v18-upload-to-hostinger.zip` → right-click → **Extract** → extract into `public_html` itself, not a subfolder.
4. Delete the zip.
5. hPanel → **Cache Manager → Purge All**.

---

## 5. After deploying — verify

Run these checks. The expected results are shown for each.

| # | Check | Expected |
|---|---|---|
| 1 | Open `https://ybrainphotography.com/` | Site loads with the opening animation |
| 2 | `GET https://ybrainphotography.com/api/content.php` | JSON `{"v":1}` (more keys after admin edits). **Not** PHP source, **not** 500 |
| 3 | `GET https://ybrainphotography.com/api/_lib.php` | 403 (or an empty 200). **Never** the PHP source text |
| 4 | `GET https://ybrainphotography.com/admin/` | "Create your login" page (first time), then "Welcome back" afterwards |
| 5 | `GET https://ybrainphotography.com/robots.txt` | Contains `Disallow: /admin/` |
| 6 | `GET https://ybrainphotography.com/sitemap.xml` | 13 URLs on `https://ybrainphotography.com/` |
| 7 | `GET https://ybrainphotography.com/no-such-page` | Animated 404 (camera viewfinder) |
| 8 | `GET http://www.ybrainphotography.com/` | 301 → `https://ybrainphotography.com/` |
| 9 | After step 2 below: file manager shows `/home/u826343823/domains/ybrainphotography.com/ybrain-data/ybrain.sqlite` | Exists |

Then the **end-to-end test** (do these after section 6, step 2):
1. Contact page → fill name `Test`, phone `9876543210`, pick "Maternity" → **Send on WhatsApp**. WhatsApp opens; close it.
2. Admin → **Enquiries**: "Test" appears with status **New**. An email arrives at `hi@ybrainphotography.com`, from `no-reply@ybrainphotography.com`. Check spam the first time.
3. Admin → **Prices** → change a price → **Save & publish** → open `/pricing/` in a private window: the new price shows.
4. Admin → **Portfolio** → upload one photo → `/portfolio/` shows it first. Its image URL looks like `/media/u/<20 hex>-1400.webp` and loads.
5. Delete the test enquiry and the test photo, and put the price back. Or use "Reset … to original" at the bottom of each editor.

---

## 6. One-time owner setup (for Yadhu)

1. **Create the mailbox `hi@ybrainphotography.com`** (hPanel → Emails). Without it, enquiry alerts and password-reset emails won't be delivered. Enquiries are still saved in the admin either way.
   - Optional: also create `no-reply@ybrainphotography.com` (the sender of alerts), or make sure the domain's SPF and DKIM are set up in hPanel → Emails → DNS so alerts don't go to spam.
2. On his phone, open **https://ybrainphotography.com/admin/**. He enters the setup code below, chooses a password (minimum 10 characters) and is logged in.

   **Setup code: `(given to the owner privately — not stored in the repo)`**

   It works only until the first login has been created, and is useless after that. Wrong tries are limited to 8 per hour.
3. Add the admin page to his phone's home screen (Chrome → ⋮ → Add to Home screen).
4. Forgot password → "Forgot password?" on the login page emails a 1-hour reset link to `hi@ybrainphotography.com`.

---

## 7. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `/admin/` or `/api/content.php` shows **500** | Check the PHP version (needs ≥ 8.0) and that `pdo_sqlite` is enabled. Check hPanel → Advanced → **Error logs**. |
| Error mentions "unable to open database file" | The private folder couldn't be created. Create `/home/u826343823/domains/ybrainphotography.com/ybrain-data/` with permissions 750 (or 755) and `media/u` inside it. |
| `/admin/` shows a folder listing or downloads a file | `DirectoryIndex` isn't applied. Confirm `admin/.htaccess` was extracted (dot-files can be hidden in File Manager: enable "show hidden files"). Opening `/admin/index.php` directly also works. |
| A `.htaccess` causes 500 everywhere | A rule isn't supported by the server. Remove the `<FilesMatch "^_">` blocks in `api/.htaccess` and `admin/.htaccess`; those files only define functions and print nothing anyway. |
| Uploaded photos don't show (404 on `/media/u/...`) | The rewrite rule in the root `.htaccess` is missing. The line starting `RewriteRule ^media/` must be there. |
| Edits don't show on the site | Hard refresh. If it still doesn't show, purge the Hostinger cache. `/api/content.php` sends no-cache headers, so a stale copy means a CDN/cache rule is overriding them. |
| No alert emails | Create the `hi@` mailbox, check spam, and check SPF/DKIM (hPanel → Emails → DNS). |
| Admin logs out quickly | Sessions are stored in `ybrain-data/sessions` for 14 days. Make sure that folder is writable. |
| Locked out after wrong passwords | Wait 15 minutes, or use "Forgot password?". |
| Need to remove the admin login (start over) | Stop and ask the owner first. With approval: open `ybrain.sqlite` and delete the row in `users`. `/admin/` then shows setup again, with the same code. |

### Rollback
To return to the pre-backend site, redeploy any earlier website zip (v17 or older). The `ybrain-data` folder can stay; nothing reads it without the new PHP files.

---

## 8. Technical reference

- **Database:** SQLite at `ybrain-data/ybrain.sqlite`, created automatically on the first request.
  - `users` (id, email, pass = bcrypt/argon hash, created)
  - `enquiries` (id, created UTC, name, phone, type, date, place, message, page, ip, status, notes, updated)
  - `settings` (key, value JSON, updated). Keys: `packages`, `faqs`, `testimonials`, `studio`, `portfolio_custom`
  - `photos` (id, kind `builtin`|`upload`, slot, file, w, h, sizes JSON, category, caption, sort, hidden, created)
  - `attempts` (rate limiting), `resets` (hashed password-reset tokens)
- **Security:**
  - CSRF token on every admin POST.
  - Session cookie: path `/admin/`, HttpOnly, Secure, SameSite=Strict.
  - `session_regenerate_id` on login.
  - Login throttle: 6 failed tries per 15 minutes per IP.
  - Strict CSP and `X-Frame-Options: DENY` on the admin.
  - Uploads are checked with `getimagesize` and re-encoded through GD.
  - All SQL uses prepared statements.
  - The setup code is stored only as a SHA-256 hash in `api/_lib.php`.
- **Public endpoints:**
  - `POST /api/enquiry.php` (form fields: name, phone, type, date, place, message, page, plus the `website` honeypot field)
  - `GET /api/content.php`
  - `GET /media/u/<file>` → `api/media.php`
- **Settings in code:** `api/_lib.php` holds `YB_ADMIN_EMAIL` (alert + login email) and `YB_CATEGORIES`. The sender address is in `send_mail()`.
- **Updating the site later:** rebuild from the repo (`npm ci && npx astro build`), zip the **contents** of `dist/`, and deploy with the steps above. `ybrain-data` is never touched.
