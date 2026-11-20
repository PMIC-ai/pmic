import { icon } from './icons.js';
import { $, $$, esc, avatar, popover, closePopovers, debounce } from './ui.js';
import { store } from './store.js';
import { USER, FILES, EMPLOYEE_IDS, PEOPLE, APPROVALS } from './data.js';
import { projects as dbProjects, project as dbProject, allTasks, getDb } from './db.js';
import { mountGuide, unmountGuide, openGuide, welcome, confirmReset, openFeedback } from './guide.js';
import { initSync, sync } from './sync.js';
import './analytics.js';
import { openSettings, openInvite, openHelp } from './modals.js';

import login from './pages/login.js';
import dashboard from './pages/dashboard.js';
import profile from './pages/profile.js';
import projects from './pages/projects.js';
import project from './pages/project.js';
import employees from './pages/employees.js';
import finance from './pages/finance.js';
import reports from './pages/reports.js';
import documents from './pages/documents.js';
import tasks from './pages/tasks.js';
import employee from './pages/employee.js';
import { payPage, gosPage } from './pages/external.js';

const ROUTES = [
  ['login', login, { bare: true }],
  ['dashboard', dashboard],
  ['profile', profile],
  ['projects/:group?', projects],
  ['project/:id/:tab?/:sub?', project],
  ['employees', employees],
  ['employee/:id', employee],
  ['tasks/:tab?', tasks],
  ['finance/:id?/:tab?', finance],
  ['reports', reports],
  ['documents/:tab?', documents],
  ['pay/:invoice/:bank', payPage, { bare: true }],
  ['gos/:service', gosPage, { bare: true }],
];

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const [pattern, page, opts = {}] of ROUTES) {
    const pp = pattern.split('/');
    const params = {};
    let ok = true;
    for (let i = 0; i < Math.max(pp.length, parts.length); i++) {
      const p = pp[i];
      if (p === undefined) { ok = false; break; }
      if (p.startsWith(':')) {
        const opt = p.endsWith('?');
        const name = p.replace(/[:?]/g, '');
        if (parts[i] === undefined) { if (!opt) { ok = false; break; } continue; }
        params[name] = decodeURIComponent(parts[i]);
      } else if (p !== parts[i]) { ok = false; break; }
    }
    if (ok) return { page, params, opts };
  }
  return null;
}

export function go(path) { location.hash = '#/' + path.replace(/^#?\/?/, ''); }
window.pmicGo = go;

const root = $('#root');
let cleanup = null;

function navHTML(path) {
  const st = store.get();
  const docCount = 6;
  const sec0 = path.split('/')[0];
  const sec = path.split('/')[0];
  const projOpen = sec === 'projects' || sec === 'project';
  const finOpen = sec === 'finance';
  const group = sec === 'project' ? (dbProject(path.split('/')[1])?.group || 'construction') : path.split('/')[1];
  const item = (href, ic, label, active, extra = '') => `<a class="nav-item ${active ? 'active' : ''} ${extra}" href="#/${href}" data-tip="${label}">${icon(ic, 20)}<span class="lbl">${label}</span>${extra.includes('has-sub') ? icon('chevron-down', 16, 'chev') : ''}</a>`;
  return `
    <a class="side-brand brand" href="#/dashboard" style="display:none;position:static;height:auto;padding:6px 22px 18px;border:0;background:none"><span class="brand-t">PMIC</span></a>
    <nav class="nav" aria-label="Основное меню">
      ${item('dashboard', 'house', 'Личный кабинет', sec === 'dashboard' || sec === 'profile', sec === 'dashboard' || sec === 'profile' ? 'has-sub open' : '')}
      ${sec === 'dashboard' || sec === 'profile' ? `<div class="subnav"><a class="sub-item ${sec === 'dashboard' ? 'active' : ''}" href="#/dashboard">Обзор</a><a class="sub-item ${sec === 'profile' ? 'active' : ''}" href="#/profile">Профиль</a></div>` : ''}
      ${item('projects', 'folder-kanban', 'Проекты', projOpen, 'has-sub' + (projOpen ? ' open' : ''))}
      <div class="subnav">
        <a class="sub-item ${projOpen && group === 'construction' ? 'active' : ''}" href="#/projects/construction">Строительство</a>
        <a class="sub-item ${projOpen && group === 'operation' ? 'active' : ''}" href="#/projects/operation">Эксплуатация</a>
      </div>
      ${item('tasks', 'square-check-big', 'Задачи', sec === 'tasks')}
      ${item('employees', 'users', 'Сотрудники', sec === 'employees' || sec === 'employee')}
      ${item('finance', 'credit-card', 'Финансы', finOpen, 'has-sub' + (finOpen ? ' open' : ''))}
      <div class="subnav">
        <a class="sub-item ${finOpen && path.split('/')[1] !== 'hockey' ? 'active' : ''}" href="#/finance/palace/budget">Строительство</a>
        <a class="sub-item ${finOpen && path.split('/')[1] === 'hockey' ? 'active' : ''}" href="#/finance/hockey/budget">Эксплуатация</a>
      </div>
      ${item('reports', 'file-chart-column', 'Отчеты', sec === 'reports')}
      <a class="nav-item ${sec === 'documents' ? 'active' : ''}" href="#/documents" data-tip="Документы">${icon('file-text', 20)}<span class="lbl">Документы</span><span class="nav-count">${docCount}</span></a>
    </nav>
    <nav class="nav nav-bottom" aria-label="Дополнительно">
      <button class="nav-item" data-act="help" data-tip="Помощь">${icon('circle-help', 20)}<span class="lbl">Помощь</span></button>
      <button class="nav-item" data-act="invite" data-tip="Пригласить">${icon('user-plus', 20)}<span class="lbl">Пригласить</span></button>
      <button class="nav-item" data-act="logout" data-tip="Выйти">${icon('log-out', 20)}<span class="lbl">Выйти</span></button>
    </nav>`;
}

function shellHTML(path, title, back) {
  const sec = path.split('/')[0];
  const bb = (href, ic, label, act, cnt) => `<a href="#/${href}" class="${act ? 'active' : ''}">${icon(ic, 22)}<span>${label}</span>${cnt ? `<span class="nav-count">${cnt}</span>` : ''}</a>`;
  return `
  <div class="app">
    <a class="brand" href="#/dashboard" aria-label="PMIC — на главную"><span class="brand-t">PMIC</span></a>
    <aside class="sidebar" id="sidebar">${navHTML(path)}</aside>
    <div class="scrim" id="scrim"></div>
    <header class="topbar">
      <button class="icon-btn burger" id="burger" aria-label="Меню">${icon('menu', 22)}</button>
      <h1 class="page-title">${back ? `<a class="back" href="${back}" aria-label="Назад">${icon('chevron-left', 22)}</a>` : ''}<span id="pageTitle">${esc(title)}</span></h1>
      <div class="search" id="search">
        ${icon('search', 20)}
        <input type="search" placeholder="Поиск" aria-label="Поиск по проектам, документам, задачам и сотрудникам" autocomplete="off">
        <div class="search-res hide"></div>
      </div>
      <button class="icon-btn m-search-btn" id="mSearch" aria-label="Поиск">${icon('search', 21)}</button>
      <button class="btn btn-outline-accent btn-sm fb-btn" id="fbBtn" title="Обсудить внедрение">${icon('message-square', 16)}<span>Обсудить внедрение</span></button>
      <button class="user-btn" id="userBtn" data-pop aria-haspopup="menu">
        ${avatar('anisimov', 44)}
        <span class="u-txt"><b>${USER.short}</b><small>${USER.role}</small></span>
        ${icon('chevron-down', 18, 'chev')}
      </button>
    </header>
    <main class="main" id="view"></main>
    <nav class="bottombar" aria-label="Нижнее меню">
      ${bb('dashboard', 'house', 'Кабинет', sec === 'dashboard' || sec === 'profile')}
      ${bb('projects', 'folder-kanban', 'Проекты', sec === 'projects' || sec === 'project')}
      ${bb('tasks', 'square-check-big', 'Задачи', sec === 'tasks')}
      ${bb('documents', 'file-text', 'Документы', sec === 'documents', 6)}
      <button id="moreBtn" data-pop class="${['employees', 'employee', 'reports', 'finance'].includes(sec) ? 'active' : ''}">${icon('ellipsis', 22)}<span>Ещё</span></button>
    </nav>
  </div>`;
}

function searchIndex() {
  const idx = [];
  FILES.forEach((g) => g.items.forEach((d) => idx.push({ kind: 'Документы', label: d.name, type: d.type, go: 'project/palace/files' })));
  store.get().addedFiles.forEach((d) => idx.push({ kind: 'Документы', label: d.name, type: d.type, go: 'project/palace/files' }));
  APPROVALS.forEach((d) => idx.push({ kind: 'Документы', label: d.name, type: d.type, go: 'documents/pending' }));
  ['Проектная документация', 'Проектно-сметная документация'].forEach((n) => idx.push({ kind: 'Документы', label: n, type: 'doc', go: 'documents' }));
  const pn = Object.fromEntries(dbProjects().map((p) => [p.id, p.name]));
  dbProjects().forEach((p) => idx.push({ kind: 'Проекты', label: p.name, go: `project/${p.id}/overview` }));
  allTasks().filter((t) => t.status !== 'closed').forEach((t) => idx.push({ kind: 'Задачи', label: `${t.name} · ${pn[t.projectId] || ''}`, go: `tasks/all?${t.id}` }));
  EMPLOYEE_IDS.forEach((id) => idx.push({ kind: 'Сотрудники', label: `${PEOPLE[id].name} — ${PEOPLE[id].role}`, person: id, go: 'employee/' + id }));
  return idx;
}
function mountSearch() {
  const box = $('#search'), input = box.querySelector('input'), res = box.querySelector('.search-res');
  let items = [], hl = -1;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { res.classList.add('hide'); return; }
    items = searchIndex().filter((x) => x.label.toLowerCase().includes(q)).slice(0, 14);
    hl = -1;
    if (!items.length) { res.innerHTML = `<div class="empty" style="padding:18px">${icon('search', 22)}<p>Ничего не найдено</p></div>`; res.classList.remove('hide'); return; }
    const groups = {};
    items.forEach((x, i) => { (groups[x.kind] ||= []).push([x, i]); });
    const mark = (s) => esc(s).replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    res.innerHTML = Object.entries(groups).map(([k, arr]) => `<h6>${k}</h6>${arr.map(([x, i]) => `<button class="sr-item" data-i="${i}">${x.type ? docIconSmall(x.type) : x.person ? avatar(x.person, 26) : k === 'Проекты' ? icon('folder-kanban', 18) : '<span class="dot"></span>'}<span>${mark(x.label)}</span></button>`).join('')}`).join('');
    res.classList.remove('hide');
  };
  const pick = (i) => { const x = items[i]; if (!x) return; res.classList.add('hide'); input.value = ''; box.classList.remove('open'); go(x.go); };
  input.addEventListener('input', debounce(draw, 120));
  input.addEventListener('focus', draw);
  input.addEventListener('keydown', (e) => {
    const btns = $$('.sr-item', res);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, j) => b.classList.toggle('hl', j === hl)); }
    if (e.key === 'Enter') pick(hl >= 0 ? +btns[hl].dataset.i : +btns[0]?.dataset.i);
    if (e.key === 'Escape') { res.classList.add('hide'); input.blur(); box.classList.remove('open'); }
  });
  res.addEventListener('mousedown', (e) => { const b = e.target.closest('.sr-item'); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
  input.addEventListener('blur', () => setTimeout(() => { res.classList.add('hide'); if (window.innerWidth <= 900) box.classList.remove('open'); }, 150));
  $('#mSearch').onclick = () => { box.classList.add('open'); input.focus(); };
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) { e.preventDefault(); box.classList.add('open'); input.focus(); } });
}
const docIconSmall = (t) => `<svg width="18" height="22" viewBox="0 0 26 32"><path d="M3 0h13l10 10v19a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" fill="${{ pdf: '#E2445C', xls: '#2E9E58' }[t] || '#2F6FDE'}"/></svg>`;

function userMenu(anchor) {
  popover(anchor, [
    { icon: 'user', label: 'Профиль', onClick: () => go('profile') },
    { icon: 'settings', label: 'Настройки', onClick: openSettings },
    { icon: 'user-plus', label: 'Пригласить', onClick: openInvite },
    '-',
    { icon: 'target', label: 'Гид по демо', onClick: openGuide },
    { icon: 'refresh-cw', label: 'Сбросить демо-данные', onClick: confirmReset },
    ...(sync.enabled ? [{ icon: 'users', label: `Совместный режим: ${sync.ws} · ${sync.status === 'ok' ? 'синхронизировано' : sync.status === 'error' ? 'нет связи' : 'подключение'}`, onClick: () => {} }] : []),
    '-',
    { icon: 'log-out', label: 'Выйти', onClick: logout },
  ]);
}
function logout() { store.set({ auth: false }); go('login'); }

function mountShell() {
  const sb = $('#sidebar'), scrim = $('#scrim');
  const closeSide = () => { sb.classList.remove('open'); scrim.classList.remove('show'); };
  $('#burger').onclick = () => { sb.classList.add('open'); scrim.classList.add('show'); };
  scrim.onclick = closeSide;
  sb.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) {
      closeSide();
      ({ help: openHelp, invite: openInvite, logout })[a.dataset.act]();
      return;
    }
    const sub = e.target.closest('.nav-item.has-sub');
    if (sub && window.innerWidth <= 900 && !sub.classList.contains('open')) { e.preventDefault(); sub.classList.add('open'); return; }
    if (e.target.closest('a')) closeSide();
  });
  $('#userBtn').onclick = (e) => userMenu(e.currentTarget);
  $('#fbBtn').onclick = openFeedback;
  $('#moreBtn').onclick = moreMenu;
  mountSearch();
}

function moreMenu(e) {
  popover(e.currentTarget, [
    { icon: 'credit-card', label: 'Финансы', onClick: () => go('finance') },
    { icon: 'users', label: 'Сотрудники', onClick: () => go('employees') },
    { icon: 'file-chart-column', label: 'Отчеты', onClick: () => go('reports') },
    { icon: 'user', label: 'Профиль', onClick: () => go('profile') },
    { icon: 'settings', label: 'Настройки', onClick: openSettings },
    '-',
    { icon: 'circle-help', label: 'Помощь', onClick: openHelp },
    { icon: 'user-plus', label: 'Пригласить', onClick: openInvite },
    { icon: 'target', label: 'Гид по демо', onClick: openGuide },
    { icon: 'message-square', label: 'Обсудить внедрение', onClick: openFeedback },
    { icon: 'log-out', label: 'Выйти', onClick: logout },
  ]);
}

export function setTitle(t) { const el = $('#pageTitle'); if (el) el.textContent = t; document.title = `${t} — PMIC`; }

function render() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const st = store.get();
  if (path === 'demo') { store.set({ auth: true }); return go('dashboard'); }
  if (!st.auth && !path.startsWith('login')) return go('login');
  if (!path) return go('dashboard');
  const m = match(path);
  if (!m) return go('dashboard');
  closePopovers();
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const ctx = { params: m.params, query, path };
  const title = typeof m.page.title === 'function' ? m.page.title(ctx) : (m.page.title || 'PMIC');
  const back = typeof m.page.back === 'function' ? m.page.back(ctx) : m.page.back;
  if (m.opts.bare) {
    unmountGuide();
    root.innerHTML = m.page.render(ctx);
    cleanup = m.page.mount?.(root, ctx) || null;
  } else {
    if (!$('.app')) {
      root.innerHTML = shellHTML(path, title, back);
      mountShell();
    } else {
      $('#sidebar').innerHTML = navHTML(path);
      const tmp = document.createElement('div');
      tmp.innerHTML = shellHTML(path, title, back);
      $('.page-title').innerHTML = tmp.querySelector('.page-title').innerHTML;
      $('.bottombar').innerHTML = tmp.querySelector('.bottombar').innerHTML;
      $('#moreBtn').onclick = moreMenu;
      $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
    }
    const old = $('#view');
    const view = old.cloneNode(false);
    old.replaceWith(view);
    view.innerHTML = `<div class="view-enter">${m.page.render(ctx)}</div>`;
    cleanup = m.page.mount?.(view, ctx) || null;
    if (!ctx.keepScroll) window.scrollTo(0, 0);
    mountGuide();
    if (!st.welcomed) setTimeout(welcome, 400);
  }
  document.title = `${title} — PMIC`;
}

window.addEventListener('hashchange', render);
getDb();
render();
initSync(() => { if (!document.querySelector('.overlay.show, .drawer-wrap.show')) render(); }).then(() => { if (sync.status === 'ok') render(); });

const rangeFill = (r) => { const a = +r.min || 0, b = +r.max || 100; r.style.setProperty('--v', `${((+r.value - a) / (b - a || 1)) * 100}%`); };
document.addEventListener('input', (e) => { if (e.target.matches?.('input[type=range]')) rangeFill(e.target); });
new MutationObserver(() => document.querySelectorAll('input[type=range]').forEach(rangeFill)).observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('input[type=range]').forEach(rangeFill);
