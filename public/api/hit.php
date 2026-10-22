<?php
/**
 * POST /api/hit.php — anonymous visitor counts for the admin "Visitors" page.
 * No cookies and no IP addresses are stored. A visitor code is a hash of IP + browser + a random value
 * that is replaced every day, so the same person can't be followed from one day to the next.
 */
require __DIR__ . '/_lib.php';
no_cache();
http_response_code(204);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') exit;

$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match('~bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|curl|wget|python|go-http|java/|okhttp~i', $ua)) exit;
if (($_SERVER['HTTP_DNT'] ?? '') === '1' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1') exit;

$kind = (string) ($_POST['k'] ?? '');
if (!in_array($kind, ['view', 'whatsapp', 'call', 'email'], true)) exit;
$path = (string) ($_POST['p'] ?? '/');
$path = '/' . ltrim((string) parse_url($path, PHP_URL_PATH), '/');
if (strlen($path) > 120 || !preg_match('~^[a-z0-9/_\-.]*$~i', $path)) $path = '/other';

// where they came from: a campaign tag (?utm_source=instagram) or the other website's name
$ref = '';
if ($kind === 'view') {
  $r = trim((string) ($_POST['r'] ?? ''));
  if (preg_match('~^[a-z0-9._-]{1,40}$~i', $r)) $ref = strtolower($r);
  elseif ($r !== '') {
    $host = strtolower((string) parse_url($r, PHP_URL_HOST));
    $host = preg_replace('~^(www\.|m\.|l\.|lm\.)~', '', $host);
    if (preg_match('~(?:^|\.)(instagram|facebook|google|bing|youtube|whatsapp|justdial|pinterest|linkedin)\.~', $host, $m)) $ref = $m[1];
    elseif ($host && !str_ends_with($host, 'ybrainphotography.com') && strlen($host) <= 60) $ref = $host;
  }
}
$device = preg_match('~iPad|Tablet~i', $ua) ? 'tablet' : (preg_match('~Mobi|Android|iPhone~i', $ua) ? 'phone' : 'computer');

try {
  $tz = new DateTimeZone('Asia/Kolkata');
  $day = (new DateTime('now', $tz))->format('Y-m-d');
  $salt = setting('hit_salt');
  if (!is_array($salt) || ($salt['day'] ?? '') !== $day) { $salt = ['day' => $day, 'salt' => bin2hex(random_bytes(16))]; save_setting('hit_salt', $salt); }
  $vid = substr(hash('sha256', $salt['salt'] . '|' . client_ip() . '|' . $ua), 0, 16);

  // ignore floods from one visitor
  $q = db()->prepare('SELECT COUNT(*) FROM hits WHERE vid = ? AND at > ?');
  $q->execute([$vid, time() - 3600]);
  $flood = (int) $q->fetchColumn() >= 150;
  $q->closeCursor();
  if ($flood) exit;

  db()->prepare('INSERT INTO hits (day, at, kind, path, ref, device, vid) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$day, time(), $kind, $path, $ref, $device, $vid]);
  housekeeping();
} catch (Throwable $e) {
  error_log('hit: ' . $e->getMessage());
}
