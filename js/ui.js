import { icon } from './icons.js';
import { PEOPLE, STATUS } from './data.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = (v, suffix = '') => new Intl.NumberFormat('ru-RU').format(Math.round(v)).replace(/ /g, ' ') + suffix;
export const rub = (v) => money(v, ' руб.');
export const mln = (v) => (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + ' млн';

export function initials(name) {
  return name.replace(/\./g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
const AV_COLORS = ['#4081E1', '#EC8841', '#6BB473', '#DD5069', '#8E6CDB', '#2FA4A9', '#C99A0E'];
export function avatar(id, size = 32, extra = '') {
  const p = PEOPLE[id] || { name: id };
  const s = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px`;
  if (p.photo) return `<img class="avatar ${extra}" style="${s}" src="${p.photo}" alt="${esc(p.name)}" title="${esc(p.name)}" loading="lazy">`;
  const c = AV_COLORS[[...(p.name || id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length];
  return `<span class="avatar avatar-i ${extra}" style="${s};background:${c}" title="${esc(p.name)}">${initials(p.name)}</span>`;
}
export const avatars = (ids, size = 28) => `<span class="avatars">${ids.map((i) => avatar(i, size)).join('')}</span>`;

export function badge(status, label) {
  const st = STATUS[status] || { label: status, cls: status };
  return `<span class="badge b-${st.cls}">${esc(label || st.label)}</span>`;
}
export function docStatus(s) {
  const cls = { 'Ожидание': 'wait', 'Отклонен': 'danger', 'Согласован': 'done', 'Оплачено': 'done' }[s] || 'wait';
  return `<span class="tstatus t-${cls}">${esc(s)}</span>`;
}
export function docIcon(type) {
  const map = { doc: ['#2F6FDE', 'DOC'], pdf: ['#E2445C', 'PDF'], xls: ['#2E9E58', 'XLS'] };
  const [c, t] = map[type] || map.doc;
  return `<svg class="docic" width="26" height="32" viewBox="0 0 26 32" aria-hidden="true"><path d="M3 0h13l10 10v19a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" fill="${c}"/><path d="M16 0l10 10h-7a3 3 0 0 1-3-3z" fill="#fff" opacity=".45"/><text x="13" y="25" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="Inter,Arial">${t}</text></svg>`;
}
export function progress(v, cls = '') {
  return `<div class="pbar ${cls}"><span style="width:${Math.max(0, Math.min(100, v))}%"></span></div>`;
}
export const ic = icon;
export const nav = (p) => { location.hash = '#/' + p; };

// ---------- Модальные окна ----------
let modalStack = [];
export function modal({ title = '', body = '', footer = '', size = 'md', cls = '', onMount, onClose, brand = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `overlay ${cls}`;
  wrap.innerHTML = `<div class="modal m-${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <button class="icon-btn modal-x" data-close aria-label="Закрыть">${icon('x', 20)}</button>
    ${brand ? `<div class="ai-brand"><span class="ai-logo">${logoMark(22, '#fff')}</span><b>PMIC AI</b></div>` : ''}
    ${title ? `<h2 class="modal-title">${esc(title)}</h2>` : ''}
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
  </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('show'));
  const api = {
    el: wrap.querySelector('.modal'),
    close() {
      wrap.classList.remove('show');
      modalStack = modalStack.filter((m) => m !== api);
      if (!modalStack.length && !document.querySelector('.drawer-wrap.show')) document.body.classList.remove('no-scroll');
      setTimeout(() => wrap.remove(), 220);
      onClose && onClose();
    },
    set(html) { api.el.querySelector('.modal-body').innerHTML = html; },
  };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) api.close(); });
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
  modalStack.push(api);
  onMount && onMount(api.el, api);
  const f = api.el.querySelector('input:not([type=hidden]),select,textarea');
  if (f && window.innerWidth > 760) setTimeout(() => f.focus(), 60);
  return api;
}

export function drawer({ html = '', onMount, width = 520 } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'drawer-wrap';
  wrap.innerHTML = `<aside class="drawer" style="--dw:${width}px">${html}</aside>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('show'));
  const api = {
    el: wrap.querySelector('.drawer'),
    close() {
      wrap.classList.remove('show');
      if (!modalStack.length) document.body.classList.remove('no-scroll');
      setTimeout(() => wrap.remove(), 250);
    },
  };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) api.close(); });
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
  onMount && onMount(api.el, api);
  return api;
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalStack.length) return modalStack[modalStack.length - 1].close();
  const d = document.querySelector('.drawer-wrap.show');
  if (d) d.querySelector('[data-close]')?.click();
  closePopovers();
});

// ---------- Уведомления ----------
export function toast(html, tone = 'info', ms = 4200) {
  let host = $('.toasts');
  if (!host) { host = document.createElement('div'); host.className = 'toasts'; document.body.appendChild(host); }
  const t = document.createElement('div');
  t.className = `toast t-${tone}`;
  t.innerHTML = `<span class="toast-ic">${icon(tone === 'ok' ? 'circle-check-big' : tone === 'warn' ? 'triangle-alert' : 'info', 18)}</span><div>${html}</div><button class="icon-btn" aria-label="Закрыть">${icon('x', 16)}</button>`;
  host.appendChild(t);
  while (host.children.length > 3) host.firstElementChild.remove();
  requestAnimationFrame(() => t.classList.add('show'));
  const kill = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); };
  t.querySelector('button').onclick = kill;
  setTimeout(kill, ms);
}

// ---------- Всплывающие меню ----------
export function closePopovers() { $$('.popover').forEach((p) => p.remove()); }
export function popover(anchor, items, { align = 'right', cls = '' } = {}) {
  const was = anchor._pop && document.body.contains(anchor._pop);
  closePopovers();
  if (was) { anchor._pop = null; return; }
  const p = document.createElement('div');
  p.className = `popover ${cls}`;
  p.innerHTML = items.map((it, i) => it === '-' ? '<hr>' :
    `<button class="pop-item ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon, 18) : ''}<span>${esc(it.label)}</span>${it.check ? icon('check', 16, 'pop-check') : ''}</button>`).join('');
  document.body.appendChild(p);
  const r = anchor.getBoundingClientRect();
  const pw = p.offsetWidth, ph = p.offsetHeight;
  let left = align === 'right' ? r.right - pw : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  p.style.left = left + 'px'; p.style.top = top + 'px';
  anchor._pop = p;
  p.addEventListener('click', (e) => {
    const b = e.target.closest('.pop-item'); if (!b) return;
    const it = items[+b.dataset.i]; closePopovers(); anchor._pop = null; it.onClick && it.onClick();
  });
  return p;
}
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.popover') && !e.target.closest('[data-pop]')) closePopovers();
});
window.addEventListener('resize', closePopovers);

export function logoMark(size = 28, color = 'var(--primary)') {
  // Знак PMIC: светлый «дом» и синий скат крыши (по мотивам логотипа из макета)
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><path d="M4.5 15.5 11 12.2h17.5V28h-24z" fill="#fff"/><path d="M4.5 15.5 11 12.2h17.5V28h-24z" fill="none" stroke="${color}" stroke-opacity=".18"/><path d="M8 4h9.2l6.8 11.6h-9.2z" fill="${color}"/></svg>`;
}

export function emptyState(text, iconName = 'info') {
  return `<div class="empty">${icon(iconName, 28)}<p>${esc(text)}</p></div>`;
}

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Печать произвольного HTML (в отдельном iframe, чтобы не трогать приложение)
export function printHTML(html, title = 'PMIC', landscape = false) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentDocument;
  d.open();
  d.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:14mm}
    body{font-family:Inter,Arial,sans-serif;color:#111;font-size:12px}
    h1{font-size:20px;margin:0 0 4px} .muted{color:#666} table{border-collapse:collapse;width:100%;margin-top:12px}
    th,td{border:1px solid #ccd;padding:5px 7px;text-align:left} th{background:#eef3fc}
    .num{text-align:right} .cm td{text-align:center;padding:4px 2px;font-size:10px}
  </style></head><body>${html}</body></html>`);
  d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); }, 250);
}

export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Таблица: на телефоне превращается в карточки (data-label)
export function table({ cols, rows, cls = '', rowAttr = () => '' }) {
  return `<div class="table-wrap"><table class="tbl ${cls}"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r, i) => `<tr ${rowAttr(r, i)}>${cols.map((c) => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.render(r, i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
