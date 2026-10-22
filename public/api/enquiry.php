<?php
/** POST /api/enquiry.php — the contact form saves here (and usually opens WhatsApp as well). */
require __DIR__ . '/_lib.php';
no_cache();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'error' => 'POST only'], 405);

$in = $_POST;
if (!$in) { $raw = json_decode((string) file_get_contents('php://input'), true); $in = is_array($raw) ? $raw : []; }

// spam trap: bots fill every field, people never see this one
if (!empty($in['website'])) json_out(['ok' => true]);
if (too_many('enquiry', 6, 3600)) json_out(['ok' => false, 'error' => 'Too many messages — please WhatsApp or call us directly.'], 429);

$name = clean((string) ($in['name'] ?? ''), 80);
if ($name === '') json_out(['ok' => false, 'error' => 'Please add your name.'], 422);
$phone = clean((string) ($in['phone'] ?? ''), 20);
if ($phone !== '' && !preg_match('/^[0-9 +()\-]{6,20}$/', $phone)) $phone = '';
$emailIn = clean((string) ($in['email'] ?? ''), 120);
$email = clean_email($emailIn);
$type = clean((string) ($in['type'] ?? ''), 60);
$date = clean((string) ($in['date'] ?? ''), 10);
if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = '';
$place = clean((string) ($in['place'] ?? ''), 120);
$message = clean((string) ($in['message'] ?? ''), 1500);
$page = clean((string) ($in['page'] ?? ''), 120);
$via = ($in['via'] ?? '') === 'form' ? 'form' : 'whatsapp';
// "send without WhatsApp" only works if we have some way to reply
if ($via === 'form' && $phone === '' && $email === '') {
  json_out(['ok' => false, 'error' => $emailIn !== '' ? 'That email address doesn’t look right.' : 'Please add a phone number or email so we can reply.'], 422);
}

note_attempt('enquiry');
db()->prepare('INSERT INTO enquiries (created, name, phone, email, type, date, place, message, page, ip, via) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  ->execute([now(), $name, $phone, $email, $type, $date, $place, $message, $page, '', $via]);
$id = (int) db()->lastInsertId();
json_finish(['ok' => true]); // the visitor sees "thank you" right away; the emails below go out after

$nice = $date ? date('j M Y', strtotime($date)) : '';
$digits = preg_replace('/\D/', '', $phone);
$body = "New enquiry on the website\n\n"
  . "Name:     $name\n"
  . 'Phone:    ' . ($phone ?: '—') . "\n"
  . 'Email:    ' . ($email ?: '—') . "\n"
  . 'Shoot:    ' . ($type ?: '—') . "\n"
  . 'Date:     ' . ($nice ?: '—') . "\n"
  . 'Place:    ' . ($place ?: '—') . "\n\n"
  . ($message ? "Message:\n$message\n\n" : '')
  . ($via === 'form' ? "They sent this from the form only (not on WhatsApp), so please reply to them.\n\n" : "They were also taken to WhatsApp to send this as a message.\n\n")
  . 'Open it in the admin: ' . site_url('/admin/?p=enquiry&id=' . $id) . "\n"
  . ($phone ? 'WhatsApp them: https://wa.me/' . (strlen($digits) === 10 ? '91' . $digits : $digits) . "\n" : '')
  . ($email ? "Reply to this email to answer them directly.\n" : '');
send_mail(YB_ADMIN_EMAIL, "New enquiry: $name — " . ($type ?: 'photo session'), $body, $email ?: null);

// a short confirmation to the client. Only fixed wording plus their first name, so the form can't be used to send spam.
if ($email) {
  $first = preg_replace('/[^\p{L}\p{M} .\'-]/u', '', explode(' ', $name)[0]) ?: 'there';
  $kinds = ['a wedding shoot', 'a couple shoot', 'a maternity shoot', 'a newborn shoot', 'a portrait session', 'a celebration shoot', 'a studio session', 'a photo session'];
  $what = in_array($type, $kinds, true) ? $type : 'a photo session';
  $msg = "Hi $first,\n\n"
    . "Thank you for getting in touch with Ybrain Photography! We've received your enquiry about $what" . ($nice ? " around $nice" : '') . ".\n\n"
    . "We usually reply the same day" . ($phone ? ', on WhatsApp or by phone' : ' by email') . ". If it's urgent, call or WhatsApp us on +91 95629 14467.\n\n"
    . "Warmly,\nYadhu & the Ybrain team\nhttps://ybrainphotography.com\n\n"
    . "You're receiving this because this email address was entered on our contact form. If that wasn't you, please ignore this message.";
  send_mail($email, 'We got your message — Ybrain Photography', $msg, YB_ADMIN_EMAIL);
}

