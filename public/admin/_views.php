<?php
/** Admin pages (plain server-rendered HTML; admin.js adds the small interactive bits). */
declare(strict_types=1);

const YB_STATUSES = ['new' => 'New', 'replied' => 'Replied', 'booked' => 'Booked', 'lost' => 'Lost'];

function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '">'; }

function layout(string $title, string $active, string $body, ?string $flash, bool $bare = false): void {
  $nav = ['' => 'Home', 'enquiries' => 'Enquiries', 'visitors' => 'Visitors', 'portfolio' => 'Portfolio', 'prices' => 'Prices', 'faq' => 'FAQ', 'reviews' => 'Reviews', 'studio' => 'Studio', 'account' => 'Account'];
  $new = 0;
  if (!$bare) $new = (int) db()->query("SELECT COUNT(*) FROM enquiries WHERE status = 'new'")->fetchColumn(); ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow">
  <meta name="csrf" content="<?= h($_SESSION['csrf']) ?>">
  <meta name="theme-color" content="#fffaf5">
  <title><?= h($title) ?> · Ybrain admin</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/admin/admin.css?v=2">
</head>
<body class="<?= $bare ? 'bare' : '' ?>">
<?php if (!$bare): ?>
  <header class="top">
    <a href="/admin/" class="brand"><b>YBRAIN</b><span>admin</span></a>
    <button class="menu-btn" type="button" data-menu aria-expanded="false" aria-controls="nav">Menu<?= $new ? ' <i class="dot">' . $new . '</i>' : '' ?></button>
    <nav id="nav" class="nav">
      <?php foreach ($nav as $k => $label): ?>
        <a href="/admin/<?= $k ? '?p=' . $k : '' ?>" class="<?= $active === $k ? 'on' : '' ?>"><?= h($label) ?><?= $k === 'enquiries' && $new ? ' <i class="dot">' . $new . '</i>' : '' ?></a>
      <?php endforeach; ?>
      <a href="/" target="_blank" rel="noopener" class="ext">Website ↗</a>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="a" value="logout"><button class="logout">Log out</button></form>
    </nav>
  </header>
<?php endif; ?>
  <main class="main">
    <?php if ($flash): ?><div class="flash" role="status"><?= h($flash) ?></div><?php endif; ?>
    <?= $body ?>
  </main>
  <script src="/admin/admin.js?v=2" defer></script>
</body>
</html>
<?php }

/* ── signed out */
function auth_card(string $title, string $inner, ?string $flash): void {
  layout($title, '', '<div class="auth"><div class="auth__brand"><b>YBRAIN</b><span>Photography · admin</span></div>' . $inner . '</div>', $flash, true);
}
function view_setup(?string $flash): void {
  auth_card('Set up', '<h1>Create your login</h1><p class="muted">This is a one-time step. Your login email will be <b>' . h(YB_ADMIN_EMAIL) . '</b>.</p>
    <form method="post" class="stack">' . csrf_field() . '<input type="hidden" name="a" value="setup">
    <label>Setup code<input name="code" required autocomplete="off" placeholder="YB-XXXX-XXXX"></label>
    <label>Choose a password<input name="pass" type="password" required minlength="10" autocomplete="new-password"></label>
    <label>Type it again<input name="pass2" type="password" required minlength="10" autocomplete="new-password"></label>
    <button class="btn">Create login</button></form>', $flash);
}
function view_login(?string $flash): void {
  auth_card('Log in', '<h1>Welcome back</h1>
    <form method="post" class="stack">' . csrf_field() . '<input type="hidden" name="a" value="login">
    <label>Email<input name="email" type="email" required autocomplete="username" value="' . h(YB_ADMIN_EMAIL) . '"></label>
    <label>Password<input name="pass" type="password" required autocomplete="current-password" autofocus></label>
    <button class="btn">Log in</button></form>
    <p class="small"><a href="/admin/?p=forgot">Forgot password?</a></p>', $flash);
}
function view_forgot(?string $flash): void {
  auth_card('Forgot password', '<h1>Reset password</h1><p class="muted">We\'ll email a reset link to the admin email.</p>
    <form method="post" class="stack">' . csrf_field() . '<input type="hidden" name="a" value="forgot">
    <label>Email<input name="email" type="email" required value="' . h(YB_ADMIN_EMAIL) . '"></label>
    <button class="btn">Send reset link</button></form><p class="small"><a href="/admin/">Back to log in</a></p>', $flash);
}
function view_reset(string $t, ?string $flash): void {
  auth_card('New password', '<h1>Choose a new password</h1>
    <form method="post" class="stack">' . csrf_field() . '<input type="hidden" name="a" value="reset"><input type="hidden" name="t" value="' . h($t) . '">
    <label>New password<input name="pass" type="password" required minlength="10" autocomplete="new-password"></label>
    <label>Type it again<input name="pass2" type="password" required minlength="10" autocomplete="new-password"></label>
    <button class="btn">Save password</button></form>', $flash);
}

/* ── dashboard */
function nice_date(?string $utc, bool $time = true): string {
  if (!$utc) return '—';
  $d = new DateTime($utc, new DateTimeZone('UTC'));
  $d->setTimezone(new DateTimeZone('Asia/Kolkata'));
  return $d->format($time ? 'j M, g:i a' : 'j M Y');
}
function shoot_date(?string $d): string { return $d ? date('j M Y', strtotime($d)) : ''; }
function enquiry_row(array $e): string {
  return '<a class="erow" href="/admin/?p=enquiry&id=' . (int) $e['id'] . '">
    <span class="erow__name">' . h($e['name']) . '</span>
    <span class="erow__meta">' . h(ucfirst(str_replace('a ', '', (string) $e['type']) ?: 'Enquiry')) . ($e['date'] ? ' · ' . h(shoot_date($e['date'])) : '') . ($e['place'] ? ' · ' . h($e['place']) : '') . '</span>
    <span class="erow__side"><i class="pill pill--' . h($e['status']) . '">' . h(YB_STATUSES[$e['status']] ?? $e['status']) . '</i><small>' . h(nice_date($e['created'])) . '</small></span></a>';
}
function view_dashboard(?string $flash): void {
  $db = db();
  $c = fn (string $sql) => (int) $db->query($sql)->fetchColumn();
  $new = $c("SELECT COUNT(*) FROM enquiries WHERE status = 'new'");
  $week = $c("SELECT COUNT(*) FROM enquiries WHERE created >= datetime('now', '-7 days')");
  $booked = $c("SELECT COUNT(*) FROM enquiries WHERE status = 'booked'");
  $total = $c('SELECT COUNT(*) FROM enquiries');
  $since = (new DateTime('-6 days', new DateTimeZone('Asia/Kolkata')))->format('Y-m-d');
  $vq = $db->prepare("SELECT COUNT(DISTINCT day || vid) FROM hits WHERE kind = 'view' AND day >= ?"); $vq->execute([$since]);
  $visitors = (int) $vq->fetchColumn();
  $latest = $db->query('SELECT * FROM enquiries ORDER BY id DESC LIMIT 5')->fetchAll();
  $rows = $latest ? implode('', array_map('enquiry_row', $latest)) : '<p class="empty">No enquiries yet. When someone uses the contact form, it shows up here and you get an email.</p>';
  $body = '<div class="head"><h1>Hello, Yadhu</h1></div>
    <div class="stats">
      <a href="/admin/?p=enquiries&s=new" class="stat stat--hl"><b>' . $new . '</b><span>New enquiries</span></a>
      <div class="stat"><b>' . $week . '</b><span>This week</span></div>
      <div class="stat"><b>' . $booked . '</b><span>Booked</span></div>
      <a href="/admin/?p=visitors" class="stat"><b>' . $visitors . '</b><span>Visitors this week</span></a>
    </div>
    <section class="card"><div class="card__head"><h2>Latest enquiries</h2><a href="/admin/?p=enquiries">See all →</a></div>' . $rows . '</section>
    <section class="card"><h2>Edit the website</h2><div class="quick">
      <a href="/admin/?p=portfolio"><b>Portfolio</b><span>Add, order or hide photos</span></a>
      <a href="/admin/?p=prices"><b>Prices</b><span>Packages and starting prices</span></a>
      <a href="/admin/?p=faq"><b>FAQ</b><span>Questions and answers</span></a>
      <a href="/admin/?p=reviews"><b>Reviews</b><span>Kind words from clients</span></a>
      <a href="/admin/?p=studio"><b>Studio</b><span>Address, hours and map</span></a>
    </div></section>';
  layout('Home', '', $body, $flash);
}

/* ── enquiries */
function view_enquiries(?string $flash): void {
  $s = (string) ($_GET['s'] ?? '');
  $q = trim((string) ($_GET['q'] ?? ''));
  $where = []; $args = [];
  if (isset(YB_STATUSES[$s])) { $where[] = 'status = ?'; $args[] = $s; }
  if ($q !== '') { $where[] = '(name LIKE ? OR phone LIKE ? OR email LIKE ? OR place LIKE ? OR message LIKE ?)'; array_push($args, "%$q%", "%$q%", "%$q%", "%$q%", "%$q%"); }
  $st = db()->prepare('SELECT * FROM enquiries' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC LIMIT 300');
  $st->execute($args);
  $list = $st->fetchAll();
  $counts = db()->query('SELECT status, COUNT(*) n FROM enquiries GROUP BY status')->fetchAll(PDO::FETCH_KEY_PAIR);
  $tabs = '<a class="tab ' . ($s === '' ? 'is-on' : '') . '" href="/admin/?p=enquiries">All <sup>' . array_sum($counts) . '</sup></a>';
  foreach (YB_STATUSES as $k => $label) $tabs .= '<a class="tab ' . ($s === $k ? 'is-on' : '') . '" href="/admin/?p=enquiries&s=' . $k . '">' . $label . ' <sup>' . (int) ($counts[$k] ?? 0) . '</sup></a>';
  $body = '<div class="head"><h1>Enquiries</h1><a class="ghost" href="/admin/?p=export">Download CSV</a></div>
    <form class="search" method="get"><input type="hidden" name="p" value="enquiries"><input type="hidden" name="s" value="' . h($s) . '"><input name="q" value="' . h($q) . '" placeholder="Search name, phone, email, place…" type="search"><button class="btn btn--sm">Search</button></form>
    <div class="tabs">' . $tabs . '</div>
    <section class="card">' . ($list ? implode('', array_map('enquiry_row', $list)) : '<p class="empty">Nothing here.</p>') . '</section>';
  layout('Enquiries', 'enquiries', $body, $flash);
}
function wa_number(string $phone): string {
  $d = preg_replace('/\D/', '', $phone);
  return strlen($d) === 10 ? '91' . $d : $d;
}
function view_enquiry(int $id, ?string $flash): void {
  $q = db()->prepare('SELECT * FROM enquiries WHERE id = ?'); $q->execute([$id]);
  $e = $q->fetch();
  if (!$e) { layout('Not found', 'enquiries', '<p class="empty">That enquiry no longer exists. <a href="/admin/?p=enquiries">Back</a></p>', $flash); return; }
  $opts = '';
  foreach (YB_STATUSES as $k => $label) $opts .= '<option value="' . $k . '"' . ($e['status'] === $k ? ' selected' : '') . '>' . $label . '</option>';
  $first = explode(' ', trim($e['name']))[0];
  $waText = rawurlencode("Hi $first, thank you for contacting Ybrain Photography! ");
  $actions = $e['phone'] ? '<a class="btn" href="https://wa.me/' . h(wa_number($e['phone'])) . '?text=' . $waText . '" target="_blank" rel="noopener">WhatsApp ' . h($first) . '</a><a class="btn btn--line" href="tel:' . h(preg_replace('/[^0-9+]/', '', $e['phone'])) . '">Call</a>' : '';
  if ($e['email']) $actions .= '<a class="btn btn--line" href="mailto:' . h($e['email']) . '?subject=' . rawurlencode('Your photo session with Ybrain Photography') . '&body=' . rawurlencode("Hi $first,\n\nThank you for contacting Ybrain Photography! ") . '">Email</a>';
  if ($actions === '') $actions = '<p class="muted small">No phone number or email given — they were sent to WhatsApp to message you, so check your WhatsApp chats for ' . h($first) . '.</p>';
  $via = ($e['via'] ?? '') === 'form' ? 'Form only — they are waiting for your reply' : 'Form, then WhatsApp';
  $f = fn (string $label, ?string $v) => $v ? '<div><dt>' . $label . '</dt><dd>' . nl2br(h($v)) . '</dd></div>' : '';
  $body = '<p class="back"><a href="/admin/?p=enquiries">← All enquiries</a></p>
    <div class="head"><h1>' . h($e['name']) . '</h1><i class="pill pill--' . h($e['status']) . '">' . h(YB_STATUSES[$e['status']] ?? '') . '</i></div>
    <section class="card"><div class="acts">' . $actions . '</div>
      <dl class="facts">' . $f('Received', nice_date($e['created'])) . $f('Phone', $e['phone']) . $f('Email', $e['email']) . $f('Sent via', $via) . $f('Shoot', $e['type']) . $f('Date', shoot_date($e['date'])) . $f('Place', $e['place']) . $f('Message', $e['message']) . '</dl></section>
    <section class="card"><h2>Follow-up</h2>
      <form method="post" class="stack">' . csrf_field() . '<input type="hidden" name="a" value="enquiry_save"><input type="hidden" name="id" value="' . (int) $e['id'] . '">
        <label>Status<select name="status">' . $opts . '</select></label>
        <label>Notes (only you see these)<textarea name="notes" rows="4" placeholder="e.g. Sent quote on WhatsApp, follow up Friday">' . h($e['notes']) . '</textarea></label>
        <button class="btn">Save</button></form></section>
    <form method="post" class="danger-zone" data-confirm="Delete this enquiry for good?">' . csrf_field() . '<input type="hidden" name="a" value="enquiry_delete"><input type="hidden" name="id" value="' . (int) $e['id'] . '"><button class="link-danger">Delete enquiry</button></form>';
  layout($e['name'], 'enquiries', $body, $flash);
}

/* ── content editors (repeatable rows; admin.js handles add / remove / move) */
function content_of(string $key): array {
  $v = setting($key);
  if ($v !== null) return ['value' => $v, 'edited' => true];
  return ['value' => build_json('defaults.json')[$key] ?? [], 'edited' => false];
}
function editor_footer(string $key, bool $edited, string $what): string {
  return $edited ? '<form method="post" class="danger-zone" data-confirm="Go back to the original ' . h($what) . ' the website was built with?">' . csrf_field() . '<input type="hidden" name="a" value="reset_section"><input type="hidden" name="key" value="' . h($key) . '"><button class="link-danger">Reset ' . h($what) . ' to original</button></form>' : '';
}
function rows_editor(string $action, string $addLabel, array $rows, callable $fields): string {
  $html = '<form method="post" class="rows-form">' . csrf_field() . '<input type="hidden" name="a" value="' . h($action) . '"><ol class="rows" data-rows>';
  foreach ($rows as $i => $r) $html .= '<li class="rowc">' . $fields($r, $i) . row_tools() . '</li>';
  $html .= '</ol><template data-row-tpl><li class="rowc">' . $fields([], '__i__') . row_tools() . '</li></template>
    <div class="rows-foot"><button type="button" class="btn btn--line" data-row-add>+ ' . h($addLabel) . '</button><button class="btn">Save &amp; publish</button></div></form>';
  return $html;
}
function row_tools(): string {
  return '<div class="rowc__tools"><button type="button" data-row-up aria-label="Move up">↑</button><button type="button" data-row-down aria-label="Move down">↓</button><button type="button" data-row-del class="del">Remove</button></div>';
}
function view_prices(?string $flash): void {
  $c = content_of('packages');
  $form = rows_editor('save_packages', 'Add package', $c['value'], fn ($r, $i) =>
    '<input type="hidden" name="items[' . $i . '][idx]" value="' . $i . '" data-idx>
     <label>Package name<input name="items[' . $i . '][name]" value="' . h($r['name'] ?? '') . '" required maxlength="60"></label>
     <div class="two"><label>Small label above<input name="items[' . $i . '][note]" value="' . h($r['note'] ?? '') . '" maxlength="60" placeholder="e.g. On location"></label>
     <label>Price (a number shows “from” above it)<input name="items[' . $i . '][from]" value="' . h($r['from'] ?? '') . '" maxlength="30" placeholder="₹25,000 or On request"></label></div>
     <label>What\'s included (one per line)<textarea name="items[' . $i . '][includes]" rows="4">' . h(implode("\n", $r['includes'] ?? [])) . '</textarea></label>
     <label class="check"><input type="radio" name="featured" value="' . $i . '"' . (!empty($r['featured']) ? ' checked' : '') . ' data-idx-radio> Highlight this one (“Most loved”)</label>');
  layout('Prices', 'prices', '<div class="head"><h1>Prices</h1><a class="ghost" href="/pricing/" target="_blank" rel="noopener">View on website ↗</a></div><p class="muted">These show on the Pricing page and the home page. Up to 6 packages.</p>' . $form . editor_footer('packages', $c['edited'], 'prices'), $flash);
}
function view_faq(?string $flash): void {
  $c = content_of('faqs');
  $form = rows_editor('save_faqs', 'Add question', $c['value'], fn ($r, $i) =>
    '<label>Question<input name="items[' . $i . '][q]" value="' . h($r['q'] ?? '') . '" required maxlength="200"></label>
     <label>Answer<textarea name="items[' . $i . '][a]" rows="3" required maxlength="1500">' . h($r['a'] ?? '') . '</textarea></label>');
  layout('FAQ', 'faq', '<div class="head"><h1>FAQ</h1><a class="ghost" href="/pricing/#faq" target="_blank" rel="noopener">View on website ↗</a></div><p class="muted">Shown at the bottom of the Pricing page. The first one opens by default.</p>' . $form . editor_footer('faqs', $c['edited'], 'FAQ'), $flash);
}
function view_reviews(?string $flash): void {
  $c = content_of('testimonials');
  $form = rows_editor('save_reviews', 'Add review', $c['value'], fn ($r, $i) =>
    '<label>What they said<textarea name="items[' . $i . '][quote]" rows="3" required maxlength="600" placeholder="They made us feel completely at ease…">' . h($r['quote'] ?? '') . '</textarea></label>
     <div class="two"><label>Name<input name="items[' . $i . '][name]" value="' . h($r['name'] ?? '') . '" required maxlength="80" placeholder="Anjali &amp; Rahul"></label>
     <label>Shoot type<input name="items[' . $i . '][kind]" value="' . h($r['kind'] ?? '') . '" maxlength="60" placeholder="Wedding"></label></div>');
  layout('Reviews', 'reviews', '<div class="head"><h1>Reviews</h1><a class="ghost" href="/" target="_blank" rel="noopener">View on website ↗</a></div><p class="muted">Shown as “Kind words” on the home page. With no reviews, that section stays hidden. Ask happy clients — even 2–3 short quotes help a lot.</p>' . $form . editor_footer('testimonials', $c['edited'], 'reviews'), $flash);
}
function view_studio(?string $flash): void {
  $c = content_of('studio');
  $s = $c['value'];
  $hours = implode("\n", array_map(fn ($r) => $r[0] . ' | ' . $r[1], $s['hours'] ?? []));
  $body = '<div class="head"><h1>Studio details</h1><a class="ghost" href="/studio/" target="_blank" rel="noopener">View on website ↗</a></div>
    <p class="muted">Shown in the footer of every page, on the Studio page and the Contact page.</p>
    <form method="post" class="card stack">' . csrf_field() . '<input type="hidden" name="a" value="save_studio">
      <label>Address (one line per row)<textarea name="address" rows="4">' . h(implode("\n", $s['address'] ?? [])) . '</textarea></label>
      <label>Opening hours (day | time, one per row)<textarea name="hours" rows="3" placeholder="Monday – Saturday | 10:00 – 19:00">' . h($hours) . '</textarea></label>
      <label>Google Maps link<input name="mapUrl" type="url" value="' . h($s['mapUrl'] ?? '') . '" placeholder="https://maps.app.goo.gl/…"></label>
      <p class="muted small">Tip: in Google Maps, open the studio, tap <b>Share</b> → <b>Copy link</b>, and paste it here.</p>
      <button class="btn">Save &amp; publish</button></form>' . editor_footer('studio', $c['edited'], 'studio details');
  layout('Studio', 'studio', $body, $flash);
}
function view_account(array $me, ?string $flash): void {
  $m = mail_config();
  $on = $m['pass'] !== '';
  $last = last_backup();
  $body = '<div class="head"><h1>Account &amp; settings</h1></div>
    <section class="card"><p>Logged in as <b>' . h($me['email']) . '</b></p></section>

    <form method="post" class="card stack">' . csrf_field() . '<input type="hidden" name="a" value="mail_save"><h2>Email sending</h2>
      <p class="muted">' . ($on
        ? '<b>On.</b> Enquiry alerts, client confirmations and password resets are sent through the <b>' . h($m['user']) . '</b> mailbox.'
        : 'Right now emails go out the basic way and may land in spam. Create the <b>' . h(YB_ADMIN_EMAIL) . '</b> mailbox in hPanel → Emails, then type its password here.') . '</p>
      <label>Mailbox<input name="user" type="email" value="' . h($m['user']) . '" required></label>
      <label>Mailbox password<input name="pass" type="password" autocomplete="new-password" placeholder="' . ($on ? 'Saved — leave empty to keep it' : 'The password of the mailbox') . '"></label>
      <details class="small"><summary>Server settings (only change if Hostinger tells you to)</summary>
        <div class="two"><label>SMTP server<input name="host" value="' . h($m['host']) . '"></label>
        <label>Port<select name="port"><option' . ($m['port'] === 465 ? ' selected' : '') . '>465</option><option' . ($m['port'] === 587 ? ' selected' : '') . '>587</option></select></label></div></details>
      <div class="acts"><button class="btn">Save</button>' . ($on ? '<button class="btn btn--line" name="forget" value="1" data-confirm-btn="Remove the saved mailbox password?">Remove password</button>' : '') . '</div></form>
    ' . ($on ? '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="a" value="mail_test"><button class="btn btn--line">Send a test email</button></form>' : '') . '

    <section class="card stack"><h2>Backups</h2>
      <p class="muted">A copy of everything (enquiries, your edits, the photo list) is saved automatically once a week on the server' . ($last ? '. Latest: <b>' . h(date('j M Y', strtotime($last))) . '</b>' : '') . '. For extra safety, download one now and then and keep it on your phone or Google Drive.</p>
      <p><a class="btn btn--line" href="/admin/?p=backup">Download backup</a></p></section>

    <form method="post" class="card stack">' . csrf_field() . '<input type="hidden" name="a" value="password"><h2>Change password</h2>
      <label>Current password<input name="old" type="password" required autocomplete="current-password"></label>
      <label>New password<input name="pass" type="password" required minlength="10" autocomplete="new-password"></label>
      <label>Type it again<input name="pass2" type="password" required minlength="10" autocomplete="new-password"></label>
      <button class="btn">Change password</button></form>';
  layout('Account', 'account', $body, $flash);
}
