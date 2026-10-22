<?php
/** POST /api/enquiry.php — the contact form saves here (it still opens WhatsApp as well). */
require __DIR__ . '/_lib.php';
no_cache();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'error' => 'POST only'], 405);

$in = $_POST;
if (!$in) { $raw = json_decode((string) file_get_contents('php://input'), true); $in = is_array($raw) ? $raw : []; }

// spam trap: bots fill every field, people never see this one
if (!empty($in['website'])) json_out(['ok' => true]);
if (too_many('enquiry', 6, 3600)) json_out(['ok' => false, 'error' => 'Too many messages, please WhatsApp us directly.'], 429);

$name = clean((string) ($in['name'] ?? ''), 80);
if ($name === '') json_out(['ok' => false, 'error' => 'Please add your name.'], 422);
$phone = clean((string) ($in['phone'] ?? ''), 20);
if ($phone !== '' && !preg_match('/^[0-9 +()\-]{6,20}$/', $phone)) $phone = '';
$type = clean((string) ($in['type'] ?? ''), 60);
$date = clean((string) ($in['date'] ?? ''), 10);
if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = '';
$place = clean((string) ($in['place'] ?? ''), 120);
$message = clean((string) ($in['message'] ?? ''), 1500);
$page = clean((string) ($in['page'] ?? ''), 120);

note_attempt('enquiry');
db()->prepare('INSERT INTO enquiries (created, name, phone, type, date, place, message, page, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  ->execute([now(), $name, $phone, $type, $date, $place, $message, $page, client_ip()]);
$id = (int) db()->lastInsertId();

$nice = $date ? date('j M Y', strtotime($date)) : '—';
$body = "New enquiry on the website\n\n"
  . "Name:     $name\n"
  . 'Phone:    ' . ($phone ?: '—') . "\n"
  . 'Shoot:    ' . ($type ?: '—') . "\n"
  . "Date:     $nice\n"
  . 'Place:    ' . ($place ?: '—') . "\n\n"
  . ($message ? "Message:\n$message\n\n" : '')
  . 'Open it in the admin: ' . site_url('/admin/?p=enquiry&id=' . $id) . "\n"
  . ($phone ? 'WhatsApp them: https://wa.me/' . preg_replace('/\D/', '', strlen(preg_replace('/\D/', '', $phone)) === 10 ? '91' . $phone : $phone) . "\n" : '');
send_mail(YB_ADMIN_EMAIL, "New enquiry: $name — " . ($type ?: 'photo session'), $body);

json_out(['ok' => true]);
