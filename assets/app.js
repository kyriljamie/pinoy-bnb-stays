/* Pinoy BnB Stays · shared helpers (no build step) */
var STAYS = (function () {
  var URL_ = 'https://fnebydfckdqgigtfhjfk.supabase.co';
  var KEY = 'sb_publishable_PLLPO77LyLTlHHQr1yF23Q_Y27vUAO1';

  function headers(extra) {
    var h = { apikey: KEY };
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }

  // Calls a Supabase function. Resolves to { ok, data } or { ok:false, error }.
  function rpc(name, args) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, 20000);
    return fetch(URL_ + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(args || {}), signal: ctl.signal
    }).then(function (r) {
      return r.text().then(function (txt) {
        var body = null;
        try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
        if (!r.ok) return { ok: false, error: (body && body.message) || ('The server said no (' + r.status + ').') };
        if (body && body.error) return { ok: false, error: body.error };
        return { ok: true, data: body };
      });
    }).catch(function (e) {
      return { ok: false, error: e && e.name === 'AbortError' ? 'No answer from the server. Please try again.' : 'No internet connection.' };
    }).finally(function () { clearTimeout(t); });
  }

  function upload(path, blob) {
    return fetch(URL_ + '/storage/v1/object/stays-photos/' + path, {
      method: 'POST', headers: headers({ 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'false' }), body: blob
    }).then(function (r) {
      if (r.ok) return { ok: true, url: URL_ + '/storage/v1/object/public/stays-photos/' + path };
      return r.text().then(function (t) { return { ok: false, error: 'Upload failed (' + r.status + '). ' + t.slice(0, 120) }; });
    }).catch(function () { return { ok: false, error: 'No internet connection.' }; });
  }

  function peso(n) { return '₱' + Math.round(Number(n) || 0).toLocaleString('en-PH'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Dates are plain YYYY-MM-DD strings in Manila time.
  function today() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nights(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }
  function fmtDate(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-PH', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  }

  function units(s) { return Array.isArray(s && s.units) ? s.units.filter(function (u) { return u && u.key && u.name; }) : []; }
  function fromPrice(s) {
    var p = units(s).map(function (u) { return Number(u.weekday) || 0; }).filter(Boolean);
    return p.length ? Math.min.apply(null, p) : 0;
  }
  function maxGuests(s) {
    return units(s).reduce(function (m, u) { return Math.max(m, Number(u.max) || Number(u.included) || 0); }, 0);
  }

  // Same rule as stays_quote() in stays.sql: Fri and Sat nights at the weekend rate,
  // guests above "included" pay extraFee per night.
  function quote(s, key, ci, co, guests) {
    var u = units(s).filter(function (x) { return x.key === key; })[0];
    if (!u || !ci || !co || co <= ci) return null;
    var wk = Number(u.weekday) || 0, we = Number(u.weekend) || wk;
    var inc = Number(u.included) || 2, mx = Math.max(inc, Number(u.max) || inc);
    var fee = Number(s.extraFee) || 0, pct = s.feePct === '' || s.feePct == null ? 30 : Number(s.feePct);
    var xn = Math.max(0, guests - inc), rooms = 0, extra = 0, wkN = 0, weN = 0;
    for (var d = ci; d < co; d = addDays(d, 1)) {
      var dow = new Date(d + 'T00:00:00Z').getUTCDay();
      if (dow === 5 || dow === 6) { rooms += we; weN++; } else { rooms += wk; wkN++; }
      extra += xn * fee;
    }
    var total = rooms + extra;
    return { unit: u, rooms: rooms, extra: extra, extraGuests: xn, total: total, fee: Math.round(total * pct / 100), pct: pct,
      nights: wkN + weN, wkN: wkN, weN: weN, wk: wk, we: we, included: inc, max: mx };
  }

  var KUBO = '<svg width="22" height="20" viewBox="0 0 56 52" aria-hidden="true"><path d="M6 24 L28 8 L50 24 Z" fill="#D9B45A"/><rect x="12" y="24" width="32" height="14" fill="none" stroke="#D9B45A" stroke-width="3"/><path d="M15 38 V48 M41 38 V48 M28 38 V48" stroke="#D9B45A" stroke-width="3"/></svg>';

  var BGS = [
    'radial-gradient(120% 100% at 30% 0%,#2B3F9E 0%,#142A5C 45%,#050A18 100%)',
    'linear-gradient(170deg,#6A3DD8 0%,#2B3F9E 45%,#0A1430 100%)',
    'linear-gradient(170deg,#E0479F 0%,#6A3DD8 45%,#0A1430 100%)',
    'linear-gradient(170deg,#4A56E0 0%,#142A5C 60%,#050A18 100%)'
  ];
  // Drawn picture for a listing with no photos yet.
  function art(s, i) {
    var k = (s.kinds || []).join(' ');
    var svg = /condo/.test(k)
      ? '<rect x="105" y="60" width="90" height="210" fill="#0B0F1C" opacity=".9"/><g fill="#F0C75E" opacity=".8"><rect x="120" y="80" width="14" height="10"/><rect x="166" y="80" width="14" height="10"/><rect x="143" y="140" width="14" height="10"/><rect x="120" y="200" width="14" height="10"/></g>'
      : /mountain/.test(k)
        ? '<path d="M0 270 L80 120 L140 200 L210 100 L300 270Z" fill="#0B0F1C" opacity=".85"/><rect x="50" y="230" width="200" height="18" rx="9" fill="#4A8FE8" opacity=".55"/>'
        : '<path d="M80 270 L150 90 L220 270 Z" fill="#0B0F1C" opacity=".9"/><path d="M134 270 L150 216 L166 270 Z" fill="#F0C75E" opacity=".9"/><circle cx="245" cy="56" r="11" fill="#F0C75E" opacity=".8"/>';
    return '<div style="position:absolute;inset:0;background:' + BGS[(i || 0) % BGS.length] + '"></div><svg class="art" viewBox="0 0 300 270" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + svg + '</svg>';
  }

  function header(active) {
    return '<header class="top"><a class="brand" href="./"><span class="ring">' + KUBO + '</span><strong>Pinoy BnB <em>Stays</em></strong></a>' +
      '<nav><a href="./"' + (active === 'stays' ? '' : ' class="dim"') + '>Stays</a>' +
      '<a class="hide-s dim" href="./#list">List your resort</a></nav></header>';
  }

  return { rpc: rpc, upload: upload, peso: peso, esc: esc, today: today, addDays: addDays, nights: nights, fmtDate: fmtDate,
    units: units, fromPrice: fromPrice, maxGuests: maxGuests, quote: quote, art: art, header: header, KUBO: KUBO };
})();
