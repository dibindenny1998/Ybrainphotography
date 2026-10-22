<?php
/** Portfolio photos: seed from the build, upload (resize to web sizes), reorder, re-categorise, hide, delete. */
declare(strict_types=1);

/** The first time the portfolio is opened, copy the built-in photo list into the database. */
function photos_seed(): void {
  if ((int) db()->query('SELECT COUNT(*) FROM photos')->fetchColumn() > 0) return;
  $ins = db()->prepare('INSERT INTO photos (kind, slot, category, caption, sort, created) VALUES (?, ?, ?, ?, ?, ?)');
  foreach (build_json('photos.json') as $i => $p) $ins->execute(['builtin', $p['slot'], $p['cat'], '', ($i + 1) * 10, now()]);
}
function photos_custom(): void { save_setting('portfolio_custom', 1); }
function photo_row(int $id): ?array {
  $q = db()->prepare('SELECT * FROM photos WHERE id = ?'); $q->execute([$id]);
  return $q->fetch() ?: null;
}
function photo_json(array $r, array $manifest): array {
  $pub = photo_public($r, $manifest) ?? ['src' => '', 'srcset' => '', 'caption' => ''];
  return ['id' => (int) $r['id'], 'kind' => $r['kind'], 'cat' => $r['category'], 'caption' => (string) $r['caption'], 'placeholder' => $pub['caption'], 'thumb' => $pub['src'], 'srcset' => $pub['srcset'], 'hidden' => (bool) $r['hidden']];
}

function photo_upload(): void {
  photos_seed();
  @ini_set('memory_limit', '512M');
  @set_time_limit(120);
  $cat = (string) ($_POST['cat'] ?? '');
  if (!isset(YB_CATEGORIES[$cat])) json_out(['ok' => false, 'error' => 'Pick a category first.'], 422);
  $f = $_FILES['photo'] ?? null;
  if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) json_out(['ok' => false, 'error' => 'Upload failed — the file may be too large.'], 422);
  if ($f['size'] > 30 * 1024 * 1024) json_out(['ok' => false, 'error' => 'That file is over 30 MB.'], 422);
  $info = @getimagesize($f['tmp_name']);
  if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) json_out(['ok' => false, 'error' => 'Only JPG, PNG or WebP photos, please.'], 422);

  // re-encode through GD: this also strips anything hidden inside the file
  $src = match ($info[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($f['tmp_name']), IMAGETYPE_PNG => @imagecreatefrompng($f['tmp_name']), default => @imagecreatefromwebp($f['tmp_name']) };
  if (!$src) json_out(['ok' => false, 'error' => 'Could not read that photo.'], 422);
  if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
    $o = (int) (@exif_read_data($f['tmp_name'])['Orientation'] ?? 1);
    if ($o === 3) $src = imagerotate($src, 180, 0); elseif ($o === 6) $src = imagerotate($src, -90, 0); elseif ($o === 8) $src = imagerotate($src, 90, 0);
  }
  $w = imagesx($src); $h = imagesy($src);
  $webp = function_exists('imagewebp');
  $id = bin2hex(random_bytes(10));
  $sizes = [];
  foreach ([640, 1400, 2200] as $target) {
    $tw = min($target, $w);
    if (isset($sizes[$tw])) continue;
    $th = (int) round($h * $tw / $w);
    $im = imagecreatetruecolor($tw, $th);
    imagecopyresampled($im, $src, 0, 0, 0, 0, $tw, $th, $w, $h);
    $name = $id . '-' . $tw . ($webp ? '.webp' : '.jpg');
    $ok = $webp ? imagewebp($im, YB_DATA . '/media/u/' . $name, 80) : imagejpeg($im, YB_DATA . '/media/u/' . $name, 84);
    imagedestroy($im);
    if (!$ok) json_out(['ok' => false, 'error' => 'Could not save the photo (is the disk full?).'], 500);
    $sizes[$tw] = $name;
    if ($tw === $w) break;
  }
  imagedestroy($src);
  $last = end($sizes);
  $fw = (int) array_key_last($sizes);
  $top = (int) db()->query('SELECT COALESCE(MIN(sort), 0) FROM photos')->fetchColumn() - 10;
  $caption = '';
  db()->prepare('INSERT INTO photos (kind, file, w, h, sizes, category, caption, sort, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute(['upload', $last, $fw, (int) round($h * $fw / $w), json_encode($sizes), $cat, $caption, $top, now()]);
  photos_custom();
  json_out(['ok' => true, 'photo' => photo_json(photo_row((int) db()->lastInsertId()), [])]);
}

function photo_update(): void {
  $r = photo_row((int) ($_POST['id'] ?? 0));
  if (!$r) json_out(['ok' => false, 'error' => 'Photo not found.'], 404);
  $cat = isset(YB_CATEGORIES[$_POST['cat'] ?? '']) ? $_POST['cat'] : $r['category'];
  $hidden = isset($_POST['hidden']) ? (int) (bool) $_POST['hidden'] : (int) $r['hidden'];
  $caption = isset($_POST['caption']) ? clean((string) $_POST['caption'], 80) : (string) $r['caption'];
  db()->prepare('UPDATE photos SET category = ?, hidden = ?, caption = ? WHERE id = ?')->execute([$cat, $hidden, $caption, $r['id']]);
  photos_custom();
  json_out(['ok' => true]);
}

/** Move a photo up/down (within the category being viewed) or to the very top. */
function photo_move(): void {
  $r = photo_row((int) ($_POST['id'] ?? 0));
  if (!$r) json_out(['ok' => false, 'error' => 'Photo not found.'], 404);
  $dir = (string) ($_POST['dir'] ?? '');
  $cat = (string) ($_POST['view'] ?? 'all');
  if ($dir === 'top') {
    $top = (int) db()->query('SELECT COALESCE(MIN(sort), 0) FROM photos')->fetchColumn() - 10;
    db()->prepare('UPDATE photos SET sort = ? WHERE id = ?')->execute([$top, $r['id']]);
  } else {
    $sql = 'SELECT id, sort FROM photos' . (isset(YB_CATEGORIES[$cat]) ? ' WHERE category = ?' : '') . ' ORDER BY sort, id';
    $q = db()->prepare($sql); $q->execute(isset(YB_CATEGORIES[$cat]) ? [$cat] : []);
    $list = $q->fetchAll();
    $i = array_search((int) $r['id'], array_map('intval', array_column($list, 'id')), true);
    $j = $dir === 'up' ? $i - 1 : $i + 1;
    if ($i === false || !isset($list[$j])) json_out(['ok' => true]);
    $a = $list[$i]; $b = $list[$j];
    $sa = (int) $a['sort']; $sb = (int) $b['sort'];
    if ($sa === $sb) $sb = $sa + ($dir === 'up' ? -1 : 1);
    $u = db()->prepare('UPDATE photos SET sort = ? WHERE id = ?');
    $u->execute([$sb, $a['id']]); $u->execute([$sa, $b['id']]);
  }
  photos_custom();
  json_out(['ok' => true]);
}

function photo_delete(): void {
  $r = photo_row((int) ($_POST['id'] ?? 0));
  if (!$r) json_out(['ok' => true]);
  if ($r['kind'] === 'upload') {
    foreach (json_decode((string) $r['sizes'], true) ?: [] as $file) if (preg_match('~^[a-f0-9]{20}-\d+\.(webp|jpg)$~', $file)) @unlink(YB_DATA . '/media/u/' . $file);
    db()->prepare('DELETE FROM photos WHERE id = ?')->execute([$r['id']]);
  } else {
    // built-in photos are part of the website files, so "delete" just hides them
    db()->prepare('UPDATE photos SET hidden = 1 WHERE id = ?')->execute([$r['id']]);
  }
  photos_custom();
  json_out(['ok' => true]);
}

function portfolio_reset(): void {
  foreach (db()->query("SELECT sizes FROM photos WHERE kind = 'upload'")->fetchAll() as $r)
    foreach (json_decode((string) $r['sizes'], true) ?: [] as $file) if (preg_match('~^[a-f0-9]{20}-\d+\.(webp|jpg)$~', $file)) @unlink(YB_DATA . '/media/u/' . $file);
  db()->exec('DELETE FROM photos');
  db()->prepare('DELETE FROM settings WHERE key = ?')->execute(['portfolio_custom']);
}

function view_portfolio(?string $flash): void {
  photos_seed();
  $manifest = manifest_by_slot();
  $rows = db()->query('SELECT * FROM photos ORDER BY sort, id')->fetchAll();
  $items = array_map(fn ($r) => photo_json($r, $manifest), $rows);
  $opts = '';
  foreach (YB_CATEGORIES as $id => $name) $opts .= '<option value="' . h($id) . '">' . h($name) . '</option>';
  $tabs = '<button type="button" class="tab is-on" data-view="all">All <sup>' . count($items) . '</sup></button>';
  foreach (YB_CATEGORIES as $id => $name) {
    $n = count(array_filter($items, fn ($i) => $i['cat'] === $id));
    $tabs .= '<button type="button" class="tab" data-view="' . h($id) . '">' . h($name) . ' <sup>' . $n . '</sup></button>';
  }
  ob_start(); ?>
  <div class="head"><h1>Portfolio</h1><a class="ghost" href="/portfolio/" target="_blank" rel="noopener">View on website ↗</a></div>
  <section class="card upload">
    <h2>Add photos</h2>
    <p class="muted">Pick a category, then choose one or more photos. They are resized for the web automatically and appear at the top of the portfolio.</p>
    <div class="row">
      <label>Category <select data-up-cat><?= $opts ?></select></label>
      <label class="btn"><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-up-input> Choose photos</label>
    </div>
    <ul class="up-list" data-up-list></ul>
  </section>
  <div class="tabs" data-tabs><?= $tabs ?></div>
  <p class="muted small">Use ↑ ↓ to change the order. Hidden photos stay here but don't show on the website. Changes are live right away.</p>
  <ul class="pgrid" data-pgrid data-cats='<?= h(json_encode(YB_CATEGORIES)) ?>'></ul>
  <script type="application/json" data-photos><?= json_encode($items, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES) ?></script>
  <form method="post" class="danger-zone" data-confirm="Remove all uploaded photos and go back to the original portfolio?">
    <?= csrf_field() ?><input type="hidden" name="a" value="portfolio_reset">
    <button class="link-danger">Reset portfolio to the original photos</button>
  </form>
  <?php layout('Portfolio', 'portfolio', (string) ob_get_clean(), $flash);
}
