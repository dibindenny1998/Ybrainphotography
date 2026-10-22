<?php
/**
 * Ybrain Photography — shared backend helpers (database, sessions, security, mail).
 *
 * Everything private lives OUTSIDE public_html, in ../ybrain-data/:
 *   ybrain.sqlite  – enquiries, content, photo list, the admin login
 *   media/u/       – photos uploaded from the admin panel
 * Re-uploading the website never touches that folder.
 */
declare(strict_types=1);

const YB_ADMIN_EMAIL = 'hi@ybrainphotography.com';
const YB_SITE_NAME   = 'Ybrain Photography';
// one-time code needed to create the admin login (sha256 of the code given to the owner)
const YB_SETUP_HASH  = '94f1f64bd9b796993f0920f0621bfa6e6d1a6499cafeb9707345c4dda2898eb9';
const YB_CATEGORIES  = ['weddings' => 'Weddings', 'couples' => 'Couples', 'maternity' => 'Maternity', 'newborn' => 'Newborn', 'portraits' => 'Portraits', 'celebrations' => 'Celebrations'];

define('YB_PUBLIC', dirname(__DIR__));                       // public_html
define('YB_DATA', getenv('YB_DATA') ?: dirname(YB_PUBLIC) . '/ybrain-data');

function yb_data_dir(): string {
  if (!is_dir(YB_DATA)) {
    @mkdir(YB_DATA, 0750, true);
    // belt and braces, in case the folder is ever reachable from the web
    @file_put_contents(YB_DATA . '/.htaccess', "Require all denied\nDeny from all\n");
  }
  if (!is_dir(YB_DATA . '/media/u')) @mkdir(YB_DATA . '/media/u', 0750, true);
  return YB_DATA;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pdo = new PDO('sqlite:' . yb_data_dir() . '/ybrain.sqlite', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;');
  $pdo->exec(<<<SQL
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, kind TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS attempts_ip ON attempts (ip, kind, at);
    CREATE TABLE IF NOT EXISTS resets (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY, created TEXT NOT NULL, name TEXT NOT NULL, phone TEXT, type TEXT, date TEXT, place TEXT,
      message TEXT, page TEXT, ip TEXT, status TEXT NOT NULL DEFAULT 'new', notes TEXT, updated TEXT);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY, kind TEXT NOT NULL, slot TEXT, file TEXT, w INTEGER, h INTEGER, sizes TEXT,
      category TEXT NOT NULL, caption TEXT, sort INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
  SQL);
  return $pdo;
}

function now(): string { return gmdate('Y-m-d H:i:s'); }
function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 64); } // REMOTE_ADDR can't be faked by the visitor
function clean(string $s, int $max): string {
  $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '');
  return mb_substr($s, 0, $max);
}

/** Never let Hostinger's page cache or the browser keep backend responses. */
function no_cache(): void {
  header('Cache-Control: no-store, no-cache, must-revalidate, private');
  header('X-LiteSpeed-Cache-Control: no-cache');
  header('Pragma: no-cache');
}
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** Simple rate limit: at most $max events of $kind per IP in $window seconds. */
function too_many(string $kind, int $max, int $window): bool {
  $db = db();
  $db->prepare('DELETE FROM attempts WHERE at < ?')->execute([time() - 86400]);
  $q = $db->prepare('SELECT COUNT(*) FROM attempts WHERE ip = ? AND kind = ? AND at > ?');
  $q->execute([client_ip(), $kind, time() - $window]);
  return (int) $q->fetchColumn() >= $max;
}
function note_attempt(string $kind): void {
  db()->prepare('INSERT INTO attempts (ip, kind, at) VALUES (?, ?, ?)')->execute([client_ip(), $kind, time()]);
}
function clear_attempts(string $kind): void {
  db()->prepare('DELETE FROM attempts WHERE ip = ? AND kind = ?')->execute([client_ip(), $kind]);
}

/* ── settings (JSON values) */
function setting(string $key) {
  $q = db()->prepare('SELECT value FROM settings WHERE key = ?');
  $q->execute([$key]);
  $v = $q->fetchColumn();
  return $v === false ? null : json_decode($v, true);
}
function save_setting(string $key, $value): void {
  db()->prepare('INSERT INTO settings (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
    ->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now()]);
}
/** What the site was built with (written by the build to /data/defaults.json and /data/photos.json). */
function build_json(string $name): array {
  $f = YB_PUBLIC . '/data/' . $name;
  $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
  return is_array($j) ? $j : [];
}

/* ── mail (uses the hosting's PHP mail(); the From address must be on our own domain) */
function send_mail(string $to, string $subject, string $text, ?string $replyTo = null): bool {
  $headers = [
    'From: ' . YB_SITE_NAME . ' website <no-reply@ybrainphotography.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: ybrain',
  ];
  if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
  $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  return @mail($to, $subject, $text, implode("\r\n", $headers), '-f no-reply@ybrainphotography.com');
}

function site_url(string $path = '/'): string {
  $host = $_SERVER['HTTP_HOST'] ?? 'ybrainphotography.com';
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
  return ($https ? 'https://' : 'http://') . $host . $path;
}

/* ── photos for the public site: built-in ones come from the build manifest, uploads from media/ */
function photo_public(array $row, array $manifest): ?array {
  if ($row['kind'] === 'builtin') {
    $m = $manifest[$row['slot']] ?? null;
    if (!$m) return null;
    return ['id' => (int) $row['id'], 'cat' => $row['category'], 'src' => $m['src'], 'srcset' => $m['srcset'], 'w' => $m['w'], 'h' => $m['h'], 'caption' => $row['caption'] ?: $m['caption']];
  }
  $sizes = json_decode((string) $row['sizes'], true) ?: [];
  $set = [];
  foreach ($sizes as $w => $file) $set[] = '/media/u/' . $file . ' ' . $w . 'w';
  $largest = end($sizes);
  return ['id' => (int) $row['id'], 'cat' => $row['category'], 'src' => '/media/u/' . $largest, 'srcset' => implode(', ', $set), 'w' => (int) $row['w'], 'h' => (int) $row['h'], 'caption' => $row['caption'] ?: 'Photograph'];
}
function manifest_by_slot(): array {
  $out = [];
  foreach (build_json('photos.json') as $p) $out[$p['slot']] = $p;
  return $out;
}
