<?php
/** GET /media/u/<file> — serves photos uploaded from the admin panel (they live outside public_html). */
require __DIR__ . '/_lib.php';
$f = (string) ($_GET['f'] ?? '');
if (!preg_match('~^u/[a-f0-9]{20}-\d{2,4}\.(webp|jpg)$~', $f)) { http_response_code(404); exit; }
$path = YB_DATA . '/media/' . $f;
if (!is_file($path)) { http_response_code(404); exit; }
$etag = '"' . md5($f . filesize($path)) . '"';
header('Content-Type: ' . (str_ends_with($f, '.webp') ? 'image/webp' : 'image/jpeg'));
header('Cache-Control: public, max-age=31536000, immutable');
header('ETag: ' . $etag);
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
header('Content-Length: ' . filesize($path));
readfile($path);
