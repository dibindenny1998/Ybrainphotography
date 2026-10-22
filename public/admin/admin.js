/* Ybrain admin — small interactive bits (no libraries) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const csrf = $('meta[name="csrf"]')?.content || '';

  // menu (phones)
  const mb = $('[data-menu]'), nav = $('#nav');
  mb?.addEventListener('click', () => { const o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });

  // "are you sure?" forms
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));

  // toast
  const toast = document.createElement('div'); toast.className = 'saving'; document.body.appendChild(toast);
  let tt; const say = (msg) => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 1800); };

  const post = async (data) => {
    const fd = data instanceof FormData ? data : Object.entries(data).reduce((f, [k, v]) => (f.append(k, v), f), new FormData());
    fd.append('csrf', csrf);
    const r = await fetch('/admin/', { method: 'POST', body: fd, headers: { 'X-CSRF': csrf }, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({ ok: false, error: 'Something went wrong.' }));
    if (!j.ok) throw new Error(j.error || 'Something went wrong.');
    return j;
  };

  /* ── repeatable rows (prices, FAQ, reviews) */
  const rows = $('[data-rows]');
  if (rows) {
    const tpl = $('[data-row-tpl]');
    let n = 1000;
    $('[data-row-add]')?.addEventListener('click', () => {
      const html = tpl.innerHTML.replaceAll('__i__', String(n++));
      rows.insertAdjacentHTML('beforeend', html);
      rows.lastElementChild.querySelector('input, textarea')?.focus();
    });
    rows.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const li = b.closest('.rowc');
      if (b.matches('[data-row-del]')) { if (confirm('Remove this one?')) li.remove(); }
      if (b.matches('[data-row-up]') && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
      if (b.matches('[data-row-down]') && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
    });
  }

  /* ── portfolio */
  const grid = $('[data-pgrid]');
  if (grid) {
    const cats = JSON.parse(grid.dataset.cats);
    let items = JSON.parse($('[data-photos]').textContent);
    let view = 'all';
    const opts = (sel) => Object.entries(cats).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const counts = () => $$('[data-tabs] .tab').forEach((t) => { const v = t.dataset.view; t.querySelector('sup').textContent = v === 'all' ? items.length : items.filter((i) => i.cat === v).length; });
    const render = () => {
      const list = view === 'all' ? items : items.filter((i) => i.cat === view);
      grid.innerHTML = list.length ? list.map((p) => `
        <li class="pc${p.hidden ? ' is-hidden' : ''}" data-id="${p.id}">
          <div class="pc__img"><img src="${esc(p.thumb)}" ${p.srcset ? `srcset="${esc(p.srcset)}" sizes="240px"` : ''} alt="" loading="lazy">${p.kind === 'upload' ? '<span class="tag">NEW</span>' : ''}</div>
          <input value="${esc(p.caption)}" placeholder="${esc(p.placeholder || 'Caption')}" maxlength="80" aria-label="Caption" data-f="caption">
          <select aria-label="Category" data-f="cat">${opts(p.cat)}</select>
          <div class="pc__tools">
            <button type="button" data-m="top" title="Move to top">⤒</button>
            <button type="button" data-m="up" title="Move up">↑</button>
            <button type="button" data-m="down" title="Move down">↓</button>
            <button type="button" data-hide title="${p.hidden ? 'Show on website' : 'Hide from website'}">${p.hidden ? '🙈' : '👁'}</button>
            <button type="button" data-del class="del" title="${p.kind === 'upload' ? 'Delete' : 'Hide (built-in photo)'}">✕</button>
          </div>
        </li>`).join('') : '<li class="empty">No photos in this category yet.</li>';
      counts();
    };
    const find = (el) => items.find((i) => i.id === +el.closest('.pc').dataset.id);
    $('[data-tabs]').addEventListener('click', (e) => {
      const t = e.target.closest('.tab'); if (!t) return;
      $$('[data-tabs] .tab').forEach((x) => x.classList.toggle('is-on', x === t));
      view = t.dataset.view; render();
    });
    // captions also save shortly after typing stops
    let ct;
    grid.addEventListener('input', (e) => {
      if (e.target.dataset.f !== 'caption') return;
      clearTimeout(ct);
      ct = setTimeout(() => e.target.dispatchEvent(new Event('change', { bubbles: true })), 900);
    });
    grid.addEventListener('change', async (e) => {
      const f = e.target.dataset.f; if (!f) return;
      const p = find(e.target);
      if (f === 'caption' && p.caption === e.target.value) return;
      p[f] = e.target.value;
      try { await post({ a: 'photo_update', id: p.id, [f]: e.target.value }); say('Saved'); if (f === 'cat') render(); } catch (err) { alert(err.message); }
    });
    grid.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const p = find(b);
      try {
        if (b.dataset.m) {
          await post({ a: 'photo_move', id: p.id, dir: b.dataset.m, view });
          const list = view === 'all' ? items : items.filter((i) => i.cat === view);
          const i = list.indexOf(p);
          if (b.dataset.m === 'top') { items = [p, ...items.filter((x) => x !== p)]; }
          else {
            const other = list[b.dataset.m === 'up' ? i - 1 : i + 1];
            if (other) { const a = items.indexOf(p), c = items.indexOf(other); [items[a], items[c]] = [items[c], items[a]]; }
          }
          render(); say('Order saved');
        } else if (b.matches('[data-hide]')) {
          p.hidden = !p.hidden;
          await post({ a: 'photo_update', id: p.id, hidden: p.hidden ? 1 : 0 });
          render(); say(p.hidden ? 'Hidden from website' : 'Showing on website');
        } else if (b.matches('[data-del]')) {
          if (p.kind !== 'upload') { if (!confirm('This photo is part of the original website, so it will be hidden (you can show it again later). OK?')) return; p.hidden = true; }
          else { if (!confirm('Delete this photo for good?')) return; items = items.filter((x) => x !== p); }
          await post({ a: 'photo_delete', id: p.id });
          render(); say(p.kind === 'upload' ? 'Deleted' : 'Hidden');
        }
      } catch (err) { alert(err.message); }
    });
    render();

    // uploads: shrink in the phone/browser first (fast, and avoids server memory limits), then send
    const shrink = async (file) => {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
        return blob || file;
      } catch { return file; }
    };
    const input = $('[data-up-input]'), upList = $('[data-up-list]'), upCat = $('[data-up-cat]');
    if (view !== 'all') upCat.value = view;
    input.addEventListener('change', async () => {
      const files = [...input.files]; input.value = '';
      for (const file of files) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${esc(file.name)}</span><b>Preparing…</b>`;
        upList.prepend(li);
        const st = li.querySelector('b');
        try {
          const blob = await shrink(file);
          st.textContent = 'Uploading…';
          const fd = new FormData();
          fd.append('a', 'photo_upload'); fd.append('cat', upCat.value); fd.append('photo', blob, file.name.replace(/\.\w+$/, '') + '.jpg');
          const j = await post(fd);
          items = [j.photo, ...items];
          render();
          st.textContent = 'Added ✓'; st.className = 'ok';
        } catch (err) { st.textContent = err.message; st.className = 'err'; }
      }
    });
  }
})();
