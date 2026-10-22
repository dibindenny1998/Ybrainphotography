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
// one-time code needed to create the admin login (bcrypt of the code given to the owner — slow to guess even though this repo is public)
const YB_SETUP_HASH  = '$2y$12$t8aDMU3MtWsomvtAZ7N0NOSIWwh.bllANXdBNHcExpynCQzLYLRM6';
const YB_SITE_URL    = 'https://ybrainphotography.com';   // used in email links, never taken from the request
const YB_CATEGORIES  = ['weddings' => 'Weddings', 'couples' => 'Couples', 'maternity' => 'Maternity', 'newborn' => 'Newborn', 'portraits' => 'Portraits', 'celebrations' => 'Celebrations'];

define('YB_PUBLIC', dirname(__DIR__));                       // public_html
define('YB_DATA', getenv('YB_DATA') ?: dirname(YB_PUBLIC) . '/ybrain-data');

// errors go to a private log file (ybrain-data/php-errors.log), never to the visitor
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', YB_DATA . '/php-errors.log');
header_remove('X-Powered-By');

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
    CREATE TABLE IF NOT EXISTS hits (
      id INTEGER PRIMARY KEY, day TEXT NOT NULL, at INTEGER NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', device TEXT NOT NULL, vid TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS hits_day ON hits (day, kind);
    CREATE INDEX IF NOT EXISTS hits_vid ON hits (vid, at);
  SQL);
  // upgrades for databases created by an older version of the site
  $ver = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
  if ($ver < 1) {
    $cols = array_column($pdo->query('PRAGMA table_info(enquiries)')->fetchAll(), 'name');
    if (!in_array('email', $cols, true)) $pdo->exec('ALTER TABLE enquiries ADD COLUMN email TEXT');
    if (!in_array('via', $cols, true)) $pdo->exec("ALTER TABLE enquiries ADD COLUMN via TEXT NOT NULL DEFAULT 'whatsapp'");
    $pdo->exec("UPDATE enquiries SET ip = ''"); // IPs are no longer kept with enquiries
    $pdo->exec('PRAGMA user_version = 1');
  }
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

/** Answer the browser now and keep working (e.g. sending emails) after the connection is closed. */
function json_finish(array $data): void {
  ignore_user_abort(true);
  @set_time_limit(90);
  $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  http_response_code(200);
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Length: ' . strlen($body));
  header('Connection: close');
  echo $body;
  if (function_exists('litespeed_finish_request')) litespeed_finish_request();
  elseif (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
  else { while (ob_get_level()) ob_end_flush(); flush(); }
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

/* ── mail: through the hi@ mailbox over SMTP once its password is saved in the admin (Account → Email sending),
   otherwise through the hosting's PHP mail(), which more often lands in spam. */
function clean_email(string $s): string {
  $s = trim(str_replace(["\r", "\n"], '', $s));
  return strlen($s) <= 120 && filter_var($s, FILTER_VALIDATE_EMAIL) ? $s : '';
}
function mail_config(): array {
  $c = setting('mail') ?: [];
  return ['host' => $c['host'] ?? 'smtp.hostinger.com', 'port' => (int) ($c['port'] ?? 465), 'user' => $c['user'] ?? YB_ADMIN_EMAIL, 'pass' => (string) ($c['pass'] ?? '')];
}
function send_mail(string $to, string $subject, string $text, ?string $replyTo = null): bool {
  $to = clean_email($to);
  if ($to === '') return false;
  $replyTo = $replyTo ? clean_email($replyTo) : '';
  $cfg = mail_config();
  if ($cfg['pass'] !== '') {
    if (smtp_send($cfg, $to, $subject, $text, $replyTo)) return true;
    // fall through to mail() so nothing is lost if the mailbox password changed
  }
  $headers = [
    'From: ' . YB_SITE_NAME . ' <no-reply@ybrainphotography.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: ybrain',
  ];
  if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
  return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, implode("\r\n", $headers), '-f no-reply@ybrainphotography.com');
}
/** Minimal SMTP client (SSL on 465, or STARTTLS on 587). Errors are logged without the password. */
function smtp_send(array $cfg, string $to, string $subject, string $text, string $replyTo = ''): bool {
  $tls = $cfg['port'] === 465;
  $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $cfg['host']]]);
  $s = @stream_socket_client(($tls ? 'ssl://' : 'tcp://') . $cfg['host'] . ':' . $cfg['port'], $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $ctx);
  if (!$s) { error_log("smtp: cannot connect to {$cfg['host']}:{$cfg['port']} ($errstr)"); $GLOBALS['yb_mail_error'] = "Could not connect to {$cfg['host']}."; return false; }
  stream_set_timeout($s, 15);
  $step = function (string $label, ?string $line, array $ok) use ($s): void {
    if ($line !== null) fwrite($s, $line . "\r\n");
    $r = '';
    while (($l = fgets($s, 1024)) !== false) { $r .= $l; if (strlen($l) < 4 || $l[3] !== '-') break; }
    if (!in_array((int) substr($r, 0, 3), $ok, true)) throw new RuntimeException($label . ': ' . trim(substr($r, 0, 200)));
  };
  $from = $cfg['user'];
  $head = [
    'Date: ' . date('r'),
    'From: =?UTF-8?B?' . base64_encode(YB_SITE_NAME) . '?= <' . $from . '>',
    'To: <' . $to . '>',
    'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@ybrainphotography.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  if ($replyTo) $head[] = 'Reply-To: <' . $replyTo . '>';
  try {
    $step('greeting', null, [220]);
    $step('EHLO', 'EHLO ybrainphotography.com', [250]);
    if (!$tls) {
      $step('STARTTLS', 'STARTTLS', [220]);
      if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS failed');
      $step('EHLO', 'EHLO ybrainphotography.com', [250]);
    }
    $step('AUTH', 'AUTH LOGIN', [334]);
    $step('AUTH user', base64_encode($cfg['user']), [334]);
    $step('Login (check the mailbox password)', base64_encode($cfg['pass']), [235]);
    $step('MAIL FROM', 'MAIL FROM:<' . $from . '>', [250]);
    $step('RCPT TO', 'RCPT TO:<' . $to . '>', [250, 251]);
    $step('DATA', 'DATA', [354]);
    $step('Sending', implode("\r\n", $head) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($text), 76, "\r\n")) . "\r\n.", [250]);
    @fwrite($s, "QUIT\r\n");
    fclose($s);
    return true;
  } catch (Throwable $e) {
    error_log('smtp: ' . $e->getMessage());
    $GLOBALS['yb_mail_error'] = $e->getMessage();
    @fclose($s);
    return false;
  }
}

function site_url(string $path = '/'): string { return YB_SITE_URL . $path; }

/* ── weekly housekeeping, run on normal requests (shared hosting has no reliable cron):
   a database snapshot in ybrain-data/backups (newest 8 kept), old visitor counts and reset links removed, error log trimmed. */
function backup_now(string $file): void {
  @unlink($file);
  try { db()->exec('VACUUM INTO ' . db()->quote($file)); }
  catch (Throwable $e) { db()->exec('PRAGMA wal_checkpoint(TRUNCATE)'); if (!@copy(YB_DATA . '/ybrain.sqlite', $file)) throw $e; }
}
function housekeeping(): void {
  try {
    $last = (int) (setting('housekeeping') ?? 0);
    if ($last > time() - 7 * 86400) return;
    save_setting('housekeeping', time());
    $dir = yb_data_dir() . '/backups';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    backup_now($dir . '/ybrain-' . gmdate('Y-m-d') . '.sqlite');
    $old = glob($dir . '/ybrain-*.sqlite') ?: [];
    rsort($old);
    foreach (array_slice($old, 8) as $f) @unlink($f);
    db()->prepare('DELETE FROM hits WHERE at < ?')->execute([time() - 400 * 86400]);
    db()->prepare('DELETE FROM resets WHERE expires < ?')->execute([time()]);
    $log = YB_DATA . '/php-errors.log';
    if (is_file($log) && filesize($log) > 1024 * 1024) @rename($log, $log . '.old');
  } catch (Throwable $e) {
    error_log('housekeeping: ' . $e->getMessage());
    try { save_setting('housekeeping', time() - 7 * 86400 + 3600); } catch (Throwable $e2) { /* try again in an hour */ }
  }
}
function last_backup(): ?string {
  $f = glob(YB_DATA . '/backups/ybrain-*.sqlite') ?: [];
  rsort($f);
  return $f ? substr(basename($f[0]), 7, 10) : null;
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
