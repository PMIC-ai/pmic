import { icon } from '../icons.js';
import { $, esc, badge, progress, popover, nav, table, modal, toast, money } from '../ui.js';
import { PEOPLE, EMPLOYEE_IDS } from '../data.js';
import { db, projects, summary, forecast, fmt, TODAY, addDays, TEMPLATES, diff } from '../db.js';
import { stBadge } from './project.js';
import { importModal } from './import.js';
import { track } from '../analytics.js';

const S = { q: '', sort: 'default', status: 'all', view: 'grid', collapsed: {}, searchOpen: false, mine: false };
const SORTS = { default: 'По умолчанию', name: 'По названию', progress: 'По готовности', end: 'По сроку окончания', risk: 'По риску (AI)' };
const FILTERS = { all: 'Все статусы', wait: 'Ожидание', work: 'В работе', overdue: 'Просроченные' };
const GROUPS = { construction: 'Строительство', operation: 'Эксплуатация' };

function list(group) {
  let arr = projects().filter((p) => p.group === group && (!S.mine || (p.team || []).includes('anisimov') || p.mine) && p.name.toLowerCase().includes(S.q.toLowerCase()))
    .map((p) => ({ p, s: summary(p) }));
  if (group === 'construction') {
    if (S.status === 'overdue') arr = arr.filter((x) => x.s.overdue);
    else if (S.status !== 'all') arr = arr.filter((x) => x.s.status === S.status);
  }
  const by = { name: (a, b) => a.p.name.localeCompare(b.p.name, 'ru'), progress: (a, b) => b.s.progress - a.s.progress, end: (a, b) => (a.s.end < b.s.end ? -1 : 1), risk: (a, b) => forecast(b.p).risk - forecast(a.p).risk }[S.sort];
  return by ? [...arr].sort(by) : arr;
}

const card = ({ p, s }) => p.group === 'operation' ? `
  <a class="proj-card op-card" href="#/project/${p.id}/overview">
    <div class="op-top"><h4>${esc(p.name)}</h4>${icon(p.icon || 'building-2', 30)}</div>
    <div class="muted" style="font-size:13px">${esc(p.city)}</div>
    <div class="pc-pct">${Math.round(s.progress)}% годового плана</div>${progress(s.progress)}
    <div class="op-meta"><span>${icon('calendar', 15)} с ${p.since} г.</span><span>${icon('trending-up', 15)} загрузка ${p.load}%</span><span>${icon('message-square', 15)} обращений: ${p.tickets}</span></div>
  </a>` : (() => {
    const fc = forecast(p);
    return `<a class="proj-card" href="#/project/${p.id}/overview">
    ${p.pinned ? `<span class="pin" title="Избранный проект">${icon('bookmark', 18)}</span>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap">${stBadge(s)}${fc.risk >= 45 && !fc.done ? `<span class="badge b-risk" title="Индекс риска PMIC AI">${icon('sparkles', 12)} риск ${fc.risk}</span>` : ''}</div>
    <h4>${esc(p.name)}</h4>
    <div class="pc-pct">${Math.round(s.progress)}%</div>
    ${progress(s.progress)}
    <div class="pc-date ${s.overdue ? 'over' : ''}">${icon(s.overdue ? 'clock-alert' : 'clock', 16)} ${fmt(s.start)} - ${fmt(s.end)} (${s.days})</div>
  </a>`;
  })();

function groupBlock(group, only) {
  const items = list(group);
  const col = S.collapsed[group];
  const body = !items.length ? `<div class="empty">${icon('search', 26)}<p>Проекты не найдены</p></div>` :
    S.view === 'grid' ? `<div class="proj-grid">${items.map(card).join('')}</div>` :
      `<div class="proj-list">${table({
        cls: 'hover cards',
        cols: group === 'operation' ? [
          { label: 'Название', cls: 'first', render: (x) => esc(x.p.name) }, { label: 'Адрес', render: (x) => esc(x.p.city) },
          { label: 'В эксплуатации с', render: (x) => x.p.since }, { label: 'Загрузка', render: (x) => x.p.load + '%' },
        ] : [
          { label: 'Название', cls: 'first', render: (x) => esc(x.p.name) }, { label: 'Статус', render: (x) => stBadge(x.s) },
          { label: 'Готовность', render: (x) => `<span class="mini-pct">${progress(x.s.progress)}${Math.round(x.s.progress)}%</span>` },
          { label: 'Сроки', render: (x) => `<span class="${x.s.overdue ? 'danger-t' : ''}">${fmt(x.s.start)} - ${fmt(x.s.end)}</span>` },
          { label: 'Риск (AI)', render: (x) => { const r = forecast(x.p).risk; return `<span class="${r >= 60 ? 'danger-t' : r >= 30 ? 't-wait' : 'ok-t'}">${r}</span>`; } },
          { label: 'Бюджет', cls: 'num', render: (x) => money(x.s.budget) },
        ],
        rows: items, rowAttr: (x) => `data-go="${x.p.id}"`,
      })}</div>`;
  return `<div class="group-h ${col ? 'collapsed' : ''}"><button data-col="${group}">${icon('chevron-down', 16)} ${GROUPS[group]} <span class="faint">(${items.length})</span></button>
    ${only ? '' : `<a class="link" href="#/projects/${group}">Показать все</a>`}</div>
    <div class="${col ? 'hide' : ''}">${body}</div>`;
}

export function newProjectModal() {
  const people = ['anisimov', ...EMPLOYEE_IDS, 'ivanova', 'ivanov', 'vasiliev'];
  const opts = people.map((id) => `<option value="${id}">${PEOPLE[id].name}</option>`).join('');
  modal({
    title: 'Новый проект', size: 'lg',
    body: `<form id="npf" class="form-grid" novalidate>
      <div class="full tpl-pick">${Object.entries(TEMPLATES).filter(([k]) => k !== 'ops').map(([k, t], i) => `<label class="tpl ${i === 0 ? 'on' : ''}"><input type="radio" name="tpl" value="${k}" ${i === 0 ? 'checked' : ''} hidden>${icon({ mkd: 'building', sport: 'trophy', izhs: 'house', office: 'building-2', empty: 'plus' }[k], 22)}<span>${t.name}</span><small>${t.stages.length} ${t.stages.length < 5 ? 'этапа' : 'этапов'}</small></label>`).join('')}
        <button type="button" class="tpl" id="npImport">${icon('upload', 22)}<span>Импорт из Excel</span><small>свой график</small></button></div>
      <input class="input" name="name" placeholder="Название проекта">
      <div class="input-wrap"><input class="input" name="budget" placeholder="Бюджет проекта" inputmode="numeric"><span class="suffix">руб</span></div>
      <label class="date-field filled">${icon('calendar', 18)}<input class="input" type="date" name="start" aria-label="Дата начала" value="${TODAY}"><span>Дата начала</span></label>
      <label class="date-field filled">${icon('calendar', 18)}<input class="input" type="date" name="end" aria-label="Дата окончания (план)" value="${addDays(TODAY, 540)}"><span>Дата окончания (план)</span></label>
      <select class="input select" name="resp"><option value="">Ответственный</option>${opts}</select>
      <select class="input select" name="group"><option value="construction">Строительство</option><option value="operation">Эксплуатация</option></select>
      <input class="input full" name="city" placeholder="Адрес объекта">
      <textarea class="input full" name="desc" placeholder="Описание"></textarea>
      <p class="hint full" style="margin:0">${icon('info', 16)} Структура этапов, сроки и бюджет разложатся по шаблону — всё можно поменять в «Структуре» или перетаскиванием на диаграмме Ганта.</p>
      <button class="btn btn-accent btn-block full" id="npBtn" disabled>Создать проект</button></form>`,
    onMount(el, m) {
      const f = el.querySelector('#npf');
      const sync = () => { el.querySelector('#npBtn').disabled = !f.name.value.trim(); el.querySelectorAll('.date-field').forEach((l) => l.classList.toggle('filled', !!l.querySelector('input').value)); };
      f.addEventListener('input', sync); f.addEventListener('change', (e) => { sync(); if (e.target.name === 'tpl') el.querySelectorAll('.tpl').forEach((t) => t.classList.toggle('on', t.contains(e.target))); });
      el.querySelector('#npImport').onclick = () => { m.close(); importModal(); };
      f.budget.addEventListener('input', () => { const d = f.budget.value.replace(/\D/g, ''); f.budget.value = d ? money(+d) : ''; });
      f.addEventListener('submit', (e) => {
        e.preventDefault(); if (!f.name.value.trim()) return;
        let start = f.start.value || TODAY, end = f.end.value || addDays(start, 540);
        if (end <= start) end = addDays(start, 180);
        const budget = +f.budget.value.replace(/\D/g, '') || 250e6;
        const id = db.addProject({ name: f.name.value.trim(), group: f.group.value, template: f.tpl.value, start, end, budget, city: f.city.value.trim(), desc: f.desc.value.trim(), resp: f.resp.value });
        m.close(); track('project_created', { template: f.tpl.value });
        toast(`Проект <b>${esc(f.name.value.trim())}</b> создан по шаблону «${TEMPLATES[f.tpl.value].name}»: ${diff(start, end)} дн., ${money(budget)} руб`, 'ok');
        nav(`project/${id}/structure`);
      });
    },
  });
}

export default {
  title: (ctx) => ctx.params.group ? GROUPS[ctx.params.group] || 'Проекты' : 'Проекты',
  back: (ctx) => ctx.params.group ? '#/projects' : null,
  render(ctx) {
    const g = ctx.params.group;
    return `
    <div class="head-row">
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div class="seg-switch"><button data-mine="0" class="${S.mine ? '' : 'active'}">Все</button><button data-mine="1" class="${S.mine ? 'active' : ''}">Мои</button></div>
      ${g === 'construction' ? `<div class="tabs">${Object.entries({ all: 'Все', wait: 'В ожидании', work: 'В работе', overdue: 'Просроченные' }).map(([k, v]) => `<button class="tab ${S.status === k ? 'active' : ''}" data-st="${k}">${v}</button>`).join('')}</div>` : ''}</div>
      <div class="toolbar" style="margin:0">
        <div class="tool-search ${S.searchOpen || S.q ? '' : 'hide'}">${icon('search', 18)}<input id="pq" placeholder="Название проекта" value="${esc(S.q)}"></div>
        <button class="tool ${S.searchOpen || S.q ? 'hide' : ''}" id="sBtn">${icon('search', 18)} Поиск</button>
        <button class="tool ${S.sort !== 'default' ? 'on' : ''}" data-pop id="sortBtn">${icon('arrow-up-down', 18)} Сортировка</button>
        <button class="tool ${S.status !== 'all' ? 'on' : ''}" data-pop id="filtBtn">${icon('list-filter', 18)} Фильтр</button>
        <div class="view-toggle"><button data-view="grid" class="${S.view === 'grid' ? 'active' : ''}" aria-label="Плитка">${icon('layout-grid', 18)}</button><button data-view="list" class="${S.view === 'list' ? 'active' : ''}" aria-label="Список">${icon('list', 18)}</button></div>
        <button class="btn btn-accent btn-icon" id="pnew" data-pop aria-label="Новый проект" title="Новый проект" data-guide="project">${icon('plus', 20)}</button>
      </div>
    </div>
    <div class="group-box" id="groups">${g ? groupBlock(g, true) : groupBlock('construction') + groupBlock('operation')}</div>`;
  },
  mount(root, ctx) {
    const rerender = () => { $('#groups', root).innerHTML = ctx.params.group ? groupBlock(ctx.params.group, true) : groupBlock('construction') + groupBlock('operation'); };
    const full = () => { root.firstElementChild.innerHTML = this.render(ctx); bind(); };
    const bind = () => {
      const q = $('#pq', root);
      q.oninput = () => { S.q = q.value; rerender(); };
      $('#sBtn', root).onclick = () => { S.searchOpen = true; full(); $('#pq', root).focus(); };
      q.onblur = () => { if (!q.value) { S.searchOpen = false; setTimeout(full, 120); } };
      $('#sortBtn', root).onclick = (e) => popover(e.currentTarget, Object.entries(SORTS).map(([k, v]) => ({ label: v, check: S.sort === k, onClick: () => { S.sort = k; full(); } })));
      $('#filtBtn', root).onclick = (e) => popover(e.currentTarget, Object.entries(FILTERS).map(([k, v]) => ({ label: v, check: S.status === k, onClick: () => { S.status = k; full(); } })));
      $('#pnew', root).onclick = (e) => popover(e.currentTarget, [
        { icon: 'folder-plus', label: 'Новый проект по шаблону', onClick: newProjectModal },
        { icon: 'upload', label: 'Импорт графика из Excel', onClick: () => importModal() },
      ]);
    };
    bind();
    root.addEventListener('click', (e) => {
      const v = e.target.closest('[data-view]'); if (v) { S.view = v.dataset.view; full(); return; }
      const mi = e.target.closest('[data-mine]'); if (mi) { S.mine = mi.dataset.mine === '1'; full(); return; }
      const c = e.target.closest('[data-col]'); if (c) { S.collapsed[c.dataset.col] = !S.collapsed[c.dataset.col]; rerender(); return; }
      const st = e.target.closest('[data-st]'); if (st) { S.status = st.dataset.st; full(); return; }
      const r = e.target.closest('[data-go]'); if (r) nav(`project/${r.dataset.go}/overview`);
    });
  },
};
