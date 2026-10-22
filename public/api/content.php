<?php
/**
 * GET /api/content.php — content edited in the admin panel.
 * Only sections that have been edited are returned; the page keeps what it was built with for the rest.
 */
require __DIR__ . '/_lib.php';
no_cache();
header('Access-Control-Allow-Origin: ' . site_url(''));
$out = ['v' => 1];
try {
  foreach (['packages', 'faqs', 'testimonials', 'studio'] as $k) {
    $v = setting($k);
    if ($v !== null) $out[$k] = $v;
  }
  if (setting('portfolio_custom')) {
    $manifest = manifest_by_slot();
    $rows = db()->query('SELECT * FROM photos WHERE hidden = 0 ORDER BY sort, id')->fetchAll();
    $out['portfolio'] = array_values(array_filter(array_map(fn ($r) => photo_public($r, $manifest), $rows)));
  }
} catch (Throwable $e) {
  // never break the public site because of the backend
}
json_out($out);
