// Gemensamt för adminsidorna. Alla adresser är relativa till <base href> (t.ex. /support/).
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dur = s => s == null ? '–' : s < 60 ? s + ' s' : s < 3600 ? Math.floor(s / 60) + ' min' : s < 86400 ? Math.floor(s / 3600) + ' h' : Math.floor(s / 86400) + ' d';
const when = t => t ? new Date(t * 1000).toLocaleString('sv-SE', {dateStyle: 'short', timeStyle: 'short'}) : '–';

async function api(path, opts = {}) {
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
    opts.headers = {'Content-Type': 'application/json'};
  }
  const r = await fetch(path, {cache: 'no-store', ...opts});
  if (r.status === 401) { location = 'login'; throw new Error('utloggad'); }
  const ct = r.headers.get('Content-Type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || data || r.statusText);
  return data;
}

function toast(msg, bad) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = '', 3500);
}

function statusPill(d) {
  if (d.sessions && d.sessions.length) return '<span class="pill live">Fjärrstyrs av ' + esc(d.sessions.map(s => s.user).join(', ')) + '</span>';
  if (d.tamper && d.tamper.length) return '<span class="pill bad">Säkerhetsvarning</span>';
  if (!d.online) return '<span class="pill bad">Offline ' + dur(d.last_seen) + '</span>';
  if (d.update && d.update.state === 'failed') return '<span class="pill warn">Uppdatering misslyckades</span>';
  return '<span class="pill ok">Online</span>';
}

// Policyformulär: tomt fält = ärvs från gruppen (eller skärmens standard).
let META = null;
async function meta() {
  if (!META) { META = await api('api/me'); const w = $('#who'); if (w) w.textContent = META.user; }
  return META;
}
const HINTS = {
  INPUT: {all: 'Allt', touch: 'Bara pekskärm', off: 'Av'},
  CHROMIUM_PERSIST: {yes: 'Ja', no: 'Nej'}, HOTSPOT: {yes: 'Ja', no: 'Nej'}, UPDATE: {yes: 'Ja', no: 'Nej'},
  UPDATE_APPLY: {night: 'På natten', now: 'Direkt'},
  ROTATE: {'0': '0°', '90': '90°', '180': '180°', '270': '270°'},
};
function policyForm(el, values, inherited, inheritLabel) {
  const m = META;
  el.innerHTML = '<div class="grid">' + Object.entries(m.policy_keys).map(([k, label]) => {
    const v = values[k] ?? '';
    const inh = inherited && inherited[k] != null ? inherited[k] : '';
    const inhTxt = inh !== '' ? ((HINTS[k] || {})[inh] || inh) : 'skärmens standard';
    let input;
    if (m.choices[k]) {
      input = '<select data-k="' + k + '"><option value="">' + esc(inheritLabel) + ' (' + esc(inhTxt) + ')</option>' +
        m.choices[k].map(c => '<option value="' + esc(c) + '"' + (c === v ? ' selected' : '') + '>' + esc((HINTS[k] || {})[c] || c) + '</option>').join('') + '</select>';
    } else {
      input = '<input data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(inheritLabel + ': ' + inhTxt) + '">';
    }
    return '<label class="' + (k === 'KIOSK_URL' || k === 'ALLOWED_DOMAINS' ? 'wide' : '') + '"><span>' + esc(label) + '</span>' + input + '</label>';
  }).join('') + '</div>';
}
// --------------------------------------------------------------------------- layout som i Notiz CMS
const ICON = {
  grid: '<path d="M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z"/>',
  screen: '<path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>',
  list: '<path d="M3 5h2v2H3zm4 0h14v2H7zM3 11h2v2H3zm4 0h14v2H7zM3 17h2v2H3zm4 0h14v2H7z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7zm-7.5 8.3L12 14l7.5-3.7L22 11.5 12 16.5 2 11.5zm0 4.5L12 18.5l7.5-3.7L22 16 12 21 2 16z"/>',
  chart: '<path d="M3 17l5-5 4 4 8-8 1.5 1.5L12 19l-4-4-3.5 3.5zM4 4h2v2H4z"/>',
  puzzle: '<path d="M10 2a2 2 0 0 1 2 2v1h4a1 1 0 0 1 1 1v4h1a2 2 0 1 1 0 4h-1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H4a1 1 0 0 1-1-1v-4h1a2 2 0 1 0 0-4H3V6a1 1 0 0 1 1-1h4V4a2 2 0 0 1 2-2z"/>',
  palette: '<path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 10.8C22 5.9 17.5 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
  doc: '<path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5zM8 13h8v2H8zm0 4h8v2H8z"/>',
  users: '<path d="M15 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4zM6 10V7H4v3H1v2h3v3h2v-3h3v-2z"/>',
  logout: '<path d="M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5zM4 3h8v2H4v14h8v2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>',
  support: '<path d="M12 2a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3v1h-6v2h6a2 2 0 0 0 2-2v-9a9 9 0 0 0-9-9z"/>',
  policy: '<path d="M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5zm-1 15-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9z"/>',
  log: '<path d="M13 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 9.4 3.3 3.3-1.4 1.4L12 13.2V7h2z"/>',
  reload: '<path d="M17.7 6.3A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.3-6.3L13 11h7V4z"/>',
  power: '<path d="M11 2h2v10h-2zm5.6 2.8 1.4-1.4A9 9 0 1 1 6 3.4l1.4 1.4a7 7 0 1 0 9.2 0z"/>',
  edit: '<path d="M3 17.2V21h3.8L17.8 9.9 14 6.2zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8L19 8.8z"/>',
  trash: '<path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/>',
  user: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm0 14a8 8 0 0 1-6.2-3c.1-2 4.1-3.1 6.2-3.1s6.1 1.1 6.2 3.1A8 8 0 0 1 12 20z"/>',
  cal: '<path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM5 9h14v11H5zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm-8 4v2h2v-2zm4 0v2h2v-2z"/>',
  search: '<path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/>',
};
const icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';

// Sidomenyn i Notiz CMS-stil, med bara Fjärrsupport.
// "cms" = sökväg i CMS:et (relativ till NOTIZ_CMS_URL), annars en sida här.
const NAV = [
  {label: 'Fjärrsupport', icon: 'support', href: './', key: 'support'},
];

function shell(title) {
  const cms = p => esc((META && META.cms_url || '/') + p);
  const link = i => i.href != null ? esc(i.href) : cms(i.cms);
  const nav = NAV.map(i => {
    let h = '<a class="nav" data-key="' + (i.key || '') + '" href="' + link(i) + '">' + icon(i.icon) + '<span>' + esc(i.label) + '</span></a>';
    if (i.children) h += '<div class="subnav">' + i.children.map(c =>
      '<a class="sub" data-key="' + (c.key || '') + '" href="' + link(c) + '">' + (c.icon ? icon(c.icon) : '<i class="dot"></i>') + '<span>' + esc(c.label) + '</span></a>').join('') + '</div>';
    return h;
  }).join('');
  const aside = document.createElement('aside');
  aside.className = 'side';
  // Notiz riktiga logga används om static/logo.png finns, annars en textlogga.
  aside.innerHTML = '<a class="brand" href="./"><img src="static/logo.png" alt="Notiz" onload="this.nextSibling.remove()" onerror="this.remove()">' +
    '<span class="word">NOTIZ<small>INFORMATIONSSKÄRMAR</small></span></a>' +
    '<nav>' + nav + '<a class="nav mute" href="logout">' + icon('logout') + '<span>Logga ut</span></a></nav>';
  const top = document.createElement('div');
  top.className = 'top';
  const d = new Date();
  const date = d.toLocaleDateString('sv-SE', {weekday: 'long'}) + ',' + d.getDate() + ' ' + d.toLocaleDateString('sv-SE', {month: 'short'}).replace('.', '') + ' ' + d.getFullYear();
  top.innerHTML = '<button class="collapse" title="Visa/dölj menyn">‹</button><h1 class="ptitle" id="ptitle">' + esc(title) + '</h1><div class="sp"></div>' +
    '<span class="tdate">' + icon('cal') + esc(date) + '</span><span class="tuser">' + icon('user') + '<span id="who">' + esc(META ? META.user : '') + '</span></span>';
  document.body.classList.add('app');
  document.body.prepend(top);
  document.body.prepend(aside);
  top.querySelector('.collapse').onclick = () => document.body.classList.toggle('collapsed');
  if (innerWidth < 900) document.body.classList.add('collapsed');
}
function setActive(key, title) {
  document.querySelectorAll('.sub').forEach(a => a.classList.toggle('on', a.dataset.key === key));
  document.querySelectorAll('.nav[data-key]').forEach(a => a.classList.toggle('open', !!key && a.dataset.key === key));
  if (title) { $('#ptitle').textContent = title; document.title = title + ' – Notiz'; }
}

function readPolicy(el) {
  const out = {};
  el.querySelectorAll('[data-k]').forEach(i => { if (i.value.trim() !== '') out[i.dataset.k] = i.value.trim(); });
  return out;
}
