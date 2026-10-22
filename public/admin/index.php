<?php
/**
 * Ybrain admin — /admin/
 * One login (the owner). Enquiries inbox + editing prices, FAQ, reviews, studio details and portfolio photos.
 */
declare(strict_types=1);
require dirname(__DIR__) . '/api/_lib.php';
require __DIR__ . '/_views.php';

/* ── session: stored in our private folder so the host's cleanup doesn't log Yadhu out every 24 minutes */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$sessDir = yb_data_dir() . '/sessions';
if (!is_dir($sessDir)) @mkdir($sessDir, 0700, true);
ini_set('session.save_path', $sessDir);
ini_set('session.gc_maxlifetime', (string) (14 * 86400));
ini_set('session.use_strict_mode', '1');
session_name('ybadmin');
session_set_cookie_params(['lifetime' => 14 * 86400, 'path' => '/admin/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

no_cache();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
function csrf_ok(): bool {
  $t = (string) ($_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF'] ?? '');
  return $t !== '' && hash_equals($_SESSION['csrf'], $t);
}
function go(string $q = '', ?string $flash = null): void {
  if ($flash) $_SESSION['flash'] = $flash;
  header('Location: /admin/' . ($q ? '?' . $q : ''));
  exit;
}
function user(): ?array {
  if (empty($_SESSION['uid'])) return null;
  $q = db()->prepare('SELECT id, email FROM users WHERE id = ?');
  $q->execute([$_SESSION['uid']]);
  return $q->fetch() ?: null;
}
function has_user(): bool { return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0; }

$p = (string) ($_GET['p'] ?? '');
$a = (string) ($_POST['a'] ?? '');
$me = user();

/* ── POST actions */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  $ajax = isset($_SERVER['HTTP_X_CSRF']);
  if (!csrf_ok()) { if ($ajax) json_out(['ok' => false, 'error' => 'Session expired — reload the page.'], 403); go($p, 'Your session expired. Please try again.'); }

  // first-time setup: needs the one-time setup code
  if ($a === 'setup' && !has_user()) {
    if (too_many('setup', 8, 3600)) go('', 'Too many tries. Wait an hour and try again.');
    note_attempt('setup');
    $code = strtoupper(trim((string) ($_POST['code'] ?? '')));
    $pass = (string) ($_POST['pass'] ?? '');
    if (!hash_equals(YB_SETUP_HASH, hash('sha256', $code))) go('', 'That setup code is not right.');
    if (mb_strlen($pass) < 10) go('', 'Please use a password of at least 10 characters.');
    if ($pass !== (string) ($_POST['pass2'] ?? '')) go('', 'The two passwords do not match.');
    db()->prepare('INSERT INTO users (email, pass, created) VALUES (?, ?, ?)')->execute([YB_ADMIN_EMAIL, password_hash($pass, PASSWORD_DEFAULT), now()]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) db()->lastInsertId();
    go('', 'Welcome! Your admin login is ready.');
  }

  if ($a === 'login') {
    if (too_many('login', 6, 900)) go('', 'Too many wrong tries. Please wait 15 minutes.');
    $q = db()->prepare('SELECT * FROM users WHERE email = ?');
    $q->execute([strtolower(trim((string) ($_POST['email'] ?? '')))]);
    $u = $q->fetch();
    if (!$u || !password_verify((string) ($_POST['pass'] ?? ''), $u['pass'])) { note_attempt('login'); go('', 'Email or password is not right.'); }
    clear_attempts('login');
    if (password_needs_rehash($u['pass'], PASSWORD_DEFAULT)) db()->prepare('UPDATE users SET pass = ? WHERE id = ?')->execute([password_hash((string) $_POST['pass'], PASSWORD_DEFAULT), $u['id']]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    go();
  }

  if ($a === 'forgot') {
    if (!too_many('forgot', 3, 3600)) {
      note_attempt('forgot');
      $q = db()->prepare('SELECT id, email FROM users WHERE email = ?');
      $q->execute([strtolower(trim((string) ($_POST['email'] ?? '')))]);
      if ($u = $q->fetch()) {
        $token = bin2hex(random_bytes(24));
        db()->prepare('INSERT INTO resets (token, user_id, expires) VALUES (?, ?, ?)')->execute([hash('sha256', $token), $u['id'], time() + 3600]);
        send_mail($u['email'], 'Reset your Ybrain admin password', "Someone (hopefully you) asked to reset the admin password.\n\nOpen this link within 1 hour to choose a new one:\n" . site_url('/admin/?p=reset&t=' . $token) . "\n\nIf this wasn't you, ignore this email.");
      }
    }
    go('', 'If that email has an account, a reset link is on its way. Check your inbox (and spam).');
  }

  if ($a === 'reset') {
    $t = hash('sha256', (string) ($_POST['t'] ?? ''));
    $q = db()->prepare('SELECT * FROM resets WHERE token = ? AND expires > ?');
    $q->execute([$t, time()]);
    $r = $q->fetch();
    if (!$r) go('', 'That reset link has expired. Please ask for a new one.');
    $pass = (string) ($_POST['pass'] ?? '');
    if (mb_strlen($pass) < 10 || $pass !== (string) ($_POST['pass2'] ?? '')) go('p=reset&t=' . urlencode((string) $_POST['t']), 'Use at least 10 characters, typed the same twice.');
    db()->prepare('UPDATE users SET pass = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $r['user_id']]);
    db()->prepare('DELETE FROM resets WHERE user_id = ?')->execute([$r['user_id']]);
    go('', 'Password changed. You can log in now.');
  }

  if (!$me) { if ($ajax) json_out(['ok' => false, 'error' => 'Please log in again.'], 401); go(); }

  switch ($a) {
    case 'logout':
      $_SESSION = [];
      session_destroy();
      go();

    case 'password':
      $q = db()->prepare('SELECT pass FROM users WHERE id = ?'); $q->execute([$me['id']]);
      if (!password_verify((string) ($_POST['old'] ?? ''), (string) $q->fetchColumn())) go('p=account', 'Your current password is not right.');
      $pass = (string) ($_POST['pass'] ?? '');
      if (mb_strlen($pass) < 10 || $pass !== (string) ($_POST['pass2'] ?? '')) go('p=account', 'Use at least 10 characters, typed the same twice.');
      db()->prepare('UPDATE users SET pass = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $me['id']]);
      session_regenerate_id(true);
      go('p=account', 'Password changed.');

    /* enquiries */
    case 'enquiry_save':
      $id = (int) ($_POST['id'] ?? 0);
      $status = in_array($_POST['status'] ?? '', ['new', 'replied', 'booked', 'lost'], true) ? $_POST['status'] : 'new';
      db()->prepare('UPDATE enquiries SET status = ?, notes = ?, updated = ? WHERE id = ?')->execute([$status, clean((string) ($_POST['notes'] ?? ''), 4000), now(), $id]);
      go('p=enquiry&id=' . $id, 'Saved.');
    case 'enquiry_delete':
      db()->prepare('DELETE FROM enquiries WHERE id = ?')->execute([(int) ($_POST['id'] ?? 0)]);
      go('p=enquiries', 'Enquiry deleted.');

    /* site content */
    case 'save_packages':
      $rows = [];
      $featured = (int) ($_POST['featured'] ?? -1);
      foreach (array_values((array) ($_POST['items'] ?? [])) as $i => $r) {
        $name = clean((string) ($r['name'] ?? ''), 60);
        if ($name === '') continue;
        $inc = array_values(array_filter(array_map(fn ($l) => clean($l, 120), preg_split('/\R/', (string) ($r['includes'] ?? '')) ?: [])));
        $rows[] = ['name' => $name, 'note' => clean((string) ($r['note'] ?? ''), 60), 'from' => clean((string) ($r['from'] ?? ''), 30), 'includes' => array_slice($inc, 0, 10), 'featured' => ((int) ($r['idx'] ?? -2)) === $featured];
      }
      save_setting('packages', array_slice($rows, 0, 6));
      go('p=prices', 'Prices saved — they are live on the website now.');
    case 'save_faqs':
      $rows = [];
      foreach (array_values((array) ($_POST['items'] ?? [])) as $r) {
        $q = clean((string) ($r['q'] ?? ''), 200); $ans = clean((string) ($r['a'] ?? ''), 1500);
        if ($q !== '' && $ans !== '') $rows[] = ['q' => $q, 'a' => $ans];
      }
      save_setting('faqs', array_slice($rows, 0, 30));
      go('p=faq', 'FAQ saved — live on the website now.');
    case 'save_reviews':
      $rows = [];
      foreach (array_values((array) ($_POST['items'] ?? [])) as $r) {
        $quote = clean((string) ($r['quote'] ?? ''), 600); $name = clean((string) ($r['name'] ?? ''), 80);
        if ($quote !== '' && $name !== '') $rows[] = ['quote' => $quote, 'name' => $name, 'kind' => clean((string) ($r['kind'] ?? ''), 60)];
      }
      save_setting('testimonials', array_slice($rows, 0, 12));
      go('p=reviews', $rows ? 'Reviews saved — live on the home page now.' : 'Saved. With no reviews, the section stays hidden.');
    case 'save_studio':
      $address = array_values(array_filter(array_map(fn ($l) => clean($l, 80), preg_split('/\R/', (string) ($_POST['address'] ?? '')) ?: [])));
      $hours = [];
      foreach (preg_split('/\R/', (string) ($_POST['hours'] ?? '')) ?: [] as $l) {
        $parts = array_map('trim', explode('|', $l, 2));
        if ($parts[0] !== '') $hours[] = [clean($parts[0], 40), clean($parts[1] ?? '', 40)];
      }
      $map = trim((string) ($_POST['mapUrl'] ?? ''));
      if (!preg_match('~^https://~', $map)) $map = (setting('studio')['mapUrl'] ?? build_json('defaults.json')['studio']['mapUrl'] ?? '');
      save_setting('studio', ['address' => array_slice($address, 0, 5), 'hours' => array_slice($hours, 0, 7), 'mapUrl' => $map]);
      go('p=studio', 'Studio details saved — live on the website now.');
    case 'reset_section':
      $k = (string) ($_POST['key'] ?? '');
      if (in_array($k, ['packages', 'faqs', 'testimonials', 'studio'], true)) db()->prepare('DELETE FROM settings WHERE key = ?')->execute([$k]);
      go('p=' . ['packages' => 'prices', 'faqs' => 'faq', 'testimonials' => 'reviews', 'studio' => 'studio'][$k], 'Back to the original website content.');

    /* portfolio (called from admin.js) */
    case 'photo_upload': require __DIR__ . '/_photos.php'; photo_upload(); break;
    case 'photo_update': require __DIR__ . '/_photos.php'; photo_update(); break;
    case 'photo_move':   require __DIR__ . '/_photos.php'; photo_move(); break;
    case 'photo_delete': require __DIR__ . '/_photos.php'; photo_delete(); break;
    case 'portfolio_reset': require __DIR__ . '/_photos.php'; portfolio_reset(); go('p=portfolio', 'Portfolio is back to the original photos. Your uploads were removed.');
  }
  go($p);
}

/* ── CSV export */
if ($me && $p === 'export') {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="ybrain-enquiries-' . date('Y-m-d') . '.csv"');
  $out = fopen('php://output', 'w');
  fputcsv($out, ['Date', 'Name', 'Phone', 'Shoot', 'Shoot date', 'Place', 'Message', 'Status', 'Notes']);
  foreach (db()->query('SELECT * FROM enquiries ORDER BY id DESC') as $r) fputcsv($out, [$r['created'], $r['name'], $r['phone'], $r['type'], $r['date'], $r['place'], $r['message'], $r['status'], $r['notes']]);
  exit;
}

/* ── pages */
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
if (!has_user()) { view_setup($flash); exit; }
if (!$me) {
  if ($p === 'forgot') view_forgot($flash);
  elseif ($p === 'reset') view_reset((string) ($_GET['t'] ?? ''), $flash);
  else view_login($flash);
  exit;
}
switch ($p) {
  case 'enquiries': view_enquiries($flash); break;
  case 'enquiry': view_enquiry((int) ($_GET['id'] ?? 0), $flash); break;
  case 'portfolio': require __DIR__ . '/_photos.php'; view_portfolio($flash); break;
  case 'prices': view_prices($flash); break;
  case 'faq': view_faq($flash); break;
  case 'reviews': view_reviews($flash); break;
  case 'studio': view_studio($flash); break;
  case 'account': view_account($me, $flash); break;
  default: view_dashboard($flash);
}
