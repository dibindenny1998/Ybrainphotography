<?php
/** Admin "Visitors" page: anonymous counts recorded by /api/hit.php. */
declare(strict_types=1);

function page_name(string $path): string {
  static $names = ['/' => 'Home', '/portfolio/' => 'Portfolio', '/stories/' => 'Stories', '/studio/' => 'Studio', '/pricing/' => 'Pricing & FAQ', '/about/' => 'About', '/contact/' => 'Contact', '/privacy/' => 'Privacy'];
  if (isset($names[$path])) return $names[$path];
  if (preg_match('~^/stories/([a-z0-9-]+)/$~', $path, $m)) return 'Story: ' . ucwords(str_replace(['-and-', '-'], [' & ', ' '], $m[1]));
  return $path;
}
function source_name(string $ref): string {
  static $names = ['instagram' => 'Instagram', 'facebook' => 'Facebook', 'google' => 'Google', 'bing' => 'Bing', 'youtube' => 'YouTube', 'whatsapp' => 'WhatsApp', 'justdial' => 'Justdial', 'pinterest' => 'Pinterest', 'linkedin' => 'LinkedIn'];
  return $names[$ref] ?? $ref;
}

function view_visitors(?string $flash): void {
  $days = in_array((int) ($_GET['d'] ?? 30), [7, 30, 90], true) ? (int) ($_GET['d'] ?? 30) : 30;
  $tz = new DateTimeZone('Asia/Kolkata');
  $since = (new DateTime('-' . ($days - 1) . ' days', $tz))->format('Y-m-d');
  $db = db();
  $one = function (string $sql, array $args = []) use ($db) { $q = $db->prepare($sql); $q->execute($args); return $q; };

  $tot = $one("SELECT COUNT(DISTINCT CASE WHEN kind = 'view' THEN day || vid END) visitors, SUM(kind = 'view') views,
    SUM(kind = 'whatsapp') wa, SUM(kind = 'call') calls, SUM(kind = 'email') mails FROM hits WHERE day >= ?", [$since])->fetch();
  $sinceUtc = (new DateTime($since . ' 00:00', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
  $enq = (int) $one('SELECT COUNT(*) FROM enquiries WHERE created >= ?', [$sinceUtc])->fetchColumn();

  // visitors per day (every day shown, even quiet ones)
  $per = $one("SELECT day, COUNT(DISTINCT vid) n FROM hits WHERE kind = 'view' AND day >= ? GROUP BY day", [$since])->fetchAll(PDO::FETCH_KEY_PAIR);
  $max = max(1, ...array_values($per ?: [0]));
  $bars = '';
  $d = new DateTime($since, $tz);
  for ($i = 0; $i < $days; $i++, $d->modify('+1 day')) {
    $k = $d->format('Y-m-d'); $n = (int) ($per[$k] ?? 0);
    $bars .= '<i style="--h:' . round($n / $max * 100) . '%" title="' . h($d->format('D j M') . ': ' . $n . ' visitor' . ($n === 1 ? '' : 's')) . '"></i>';
  }

  $list = function (array $rows, callable $label, string $empty): string {
    if (!$rows) return '<p class="empty">' . $empty . '</p>';
    $top = max(1, (int) $rows[0]['n']);
    $out = '<ul class="bars">';
    foreach ($rows as $r) $out .= '<li><span>' . h($label($r['k'])) . '</span><b>' . (int) $r['n'] . '</b><i style="--w:' . round($r['n'] / $top * 100) . '%"></i></li>';
    return $out . '</ul>';
  };
  $pages = $one("SELECT path k, COUNT(DISTINCT day || vid) n FROM hits WHERE kind = 'view' AND day >= ? GROUP BY path ORDER BY n DESC LIMIT 12", [$since])->fetchAll();
  $refs = $one("SELECT CASE WHEN ref = '' THEN '(direct)' ELSE ref END k, COUNT(DISTINCT day || vid) n FROM hits WHERE kind = 'view' AND day >= ? GROUP BY k ORDER BY n DESC LIMIT 12", [$since])->fetchAll();
  $devs = $one("SELECT device k, COUNT(DISTINCT day || vid) n FROM hits WHERE kind = 'view' AND day >= ? GROUP BY device ORDER BY n DESC", [$since])->fetchAll();

  $tabs = '';
  foreach ([7 => '7 days', 30 => '30 days', 90 => '90 days'] as $k => $label) $tabs .= '<a class="tab ' . ($days === $k ? 'is-on' : '') . '" href="/admin/?p=visitors&d=' . $k . '">' . $label . '</a>';

  $body = '<div class="head"><h1>Visitors</h1></div>
    <div class="tabs">' . $tabs . '</div>
    <div class="stats">
      <div class="stat stat--hl"><b>' . (int) $tot['visitors'] . '</b><span>Visitors</span></div>
      <div class="stat"><b>' . (int) $tot['views'] . '</b><span>Pages viewed</span></div>
      <div class="stat"><b>' . (int) $tot['wa'] . '</b><span>WhatsApp taps</span></div>
      <a href="/admin/?p=enquiries" class="stat"><b>' . $enq . '</b><span>Enquiries</span></a>
    </div>
    <section class="card"><div class="card__head"><h2>Visitors per day</h2><small class="muted">' . (int) $tot['calls'] . ' call taps · ' . (int) $tot['mails'] . ' email taps</small></div><div class="chart" style="--n:' . $days . '">' . $bars . '</div></section>
    <section class="card"><h2>Where they came from</h2>' . $list($refs, fn ($k) => $k === '(direct)' ? 'Direct, or app that hides it' : source_name($k), 'No visits yet.') . '
      <p class="muted small">Instagram and WhatsApp often hide where a visitor came from. To count Instagram properly, use this link in your bio: <b>ybrainphotography.com/?utm_source=instagram</b></p></section>
    <section class="card"><h2>Most viewed pages</h2>' . $list($pages, 'page_name', 'No visits yet.') . '</section>
    <section class="card"><h2>Devices</h2>' . $list($devs, fn ($k) => ucfirst($k), 'No visits yet.') . '</section>
    <p class="muted small">Counts are anonymous: no cookies, no IP addresses, and visitors who ask browsers not to be tracked are skipped. Your own visits from this phone or computer are not counted.</p>';
  layout('Visitors', 'visitors', $body, $flash);
}
