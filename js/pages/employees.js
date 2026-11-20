import { icon } from '../icons.js';
import { $, esc, avatar, popover, drawer, table, badge, nav } from '../ui.js';
import { store } from '../store.js';
import { PEOPLE, EMPLOYEE_IDS, PROJECTS } from '../data.js';
import { openInvite } from '../modals.js';

const S = { q: '', dept: 'all', sort: 'default', view: 'grid' };
const DEPTS = [...new Set(EMPLOYEE_IDS.map((id) => PEOPLE[id].dept))];

function list() {
  let ids = EMPLOYEE_IDS.filter((id) => !store.get().removedPeople.includes(id)).filter((id) => { const p = PEOPLE[id]; return (S.dept === 'all' || p.dept === S.dept) && `${p.name} ${p.role} ${p.dept}`.toLowerCase().includes(S.q.toLowerCase()); });
  if (S.sort === 'name') ids = [...ids].sort((a, b) => PEOPLE[a].name.localeCompare(PEOPLE[b].name, 'ru'));
  if (S.sort === 'dept') ids = [...ids].sort((a, b) => PEOPLE[a].dept.localeCompare(PEOPLE[b].dept, 'ru'));
  return ids;
}
const photo = (id) => PEOPLE[id].photo ? `<img src="${PEOPLE[id].photo}" alt="${esc(PEOPLE[id].name)}" loading="lazy">` : avatar(id, 80);

function body() {
  const ids = list();
  if (!ids.length) return `<div class="empty">${icon('search', 26)}<p>Сотрудники не найдены</p></div>`;
  if (S.view === 'grid') return `<div class="emp-grid">${ids.map((id) => `<button class="emp" data-emp="${id}"><div class="emp-photo">${photo(id)}</div><b>${PEOPLE[id].name}</b><small>${PEOPLE[id].role}</small><small>${PEOPLE[id].dept}</small></button>`).join('')}</div>`;
  return `<div class="card">${table({
    cls: 'hover cards', rows: ids, rowAttr: (id) => `data-emp="${id}"`,
    cols: [
      { label: 'Сотрудник', cls: 'first', render: (id) => `<span class="person">${avatar(id, 36)}<span>${PEOPLE[id].name}</span></span>` },
      { label: 'Должность', render: (id) => PEOPLE[id].role }, { label: 'Отдел', render: (id) => PEOPLE[id].dept }, { label: 'Email', render: (id) => `<a href="mailto:${PEOPLE[id].email}" onclick="event.stopPropagation()">${PEOPLE[id].email}</a>` },
    ],
  })}</div>`;
}

export function employeeDrawer(id) {
  const p = PEOPLE[id];
  const projs = PROJECTS.filter((_, i) => (i + id.length) % 3 === 0).slice(0, 4);
  drawer({
    width: 440,
    html: `<div class="drawer-h"><b>Карточка сотрудника</b><button class="icon-btn" data-close aria-label="Закрыть">${icon('x', 20)}</button></div>
    <div class="drawer-b">
      <div style="display:flex;gap:18px;align-items:center;margin-bottom:24px">${avatar(id, 88)}<div><h3 style="font-size:20px;font-weight:600">${p.name}</h3><div class="muted" style="margin-top:4px">${p.role}</div><div class="faint">${p.dept}</div></div></div>
      <dl class="kv" style="grid-template-columns:120px 1fr"><dt>Email</dt><dd><a href="mailto:${p.email}">${p.email}</a></dd><dt>Телефон</dt><dd>+7 (343) 200-${String(10 + id.length * 7).slice(0, 2)}-${String(30 + id.length * 3).slice(0, 2)}</dd><dt>Задачи в работе</dt><dd>${3 + (id.length % 5)}</dd></dl>
      <h4 style="margin:26px 0 12px;font-size:15px">Проекты</h4>
      <div class="plist">${projs.map((x) => `<a class="plist-row" href="#/project/${x.id}/overview" style="grid-template-columns:1fr auto;color:inherit;text-decoration:none"><span>${x.name}</span>${x.status ? badge(x.status) : badge('done', 'Эксплуатация')}</a>`).join('')}</div>
      <a class="btn btn-accent btn-block" style="margin-top:24px" href="mailto:${p.email}">${icon('mail', 18)} Написать</a>
    </div>`,
  });
}

export default {
  title: 'Сотрудники',
  render() {
    return `<div class="toolbar">
      <div class="tool-search">${icon('search', 18)}<input id="eq" placeholder="Поиск сотрудника" value="${esc(S.q)}"></div>
      <button class="tool ${S.sort !== 'default' ? 'on' : ''}" data-pop id="es">${icon('arrow-up-down', 18)} Сортировка</button>
      <button class="tool ${S.dept !== 'all' ? 'on' : ''}" data-pop id="ef">${icon('list-filter', 18)} Фильтр</button>
      <div class="view-toggle"><button data-v="grid" class="${S.view === 'grid' ? 'active' : ''}" aria-label="Плитка">${icon('layout-grid', 18)}</button><button data-v="list" class="${S.view === 'list' ? 'active' : ''}" aria-label="Список">${icon('list', 18)}</button></div>
      <button class="btn btn-accent btn-sm" id="einv">${icon('user-plus', 16)} Пригласить</button>
    </div><div id="eb">${body()}</div>`;
  },
  mount(root, ctx) {
    const redraw = () => { $('#eb', root).innerHTML = body(); };
    $('#eq', root).oninput = (e) => { S.q = e.target.value; redraw(); };
    $('#einv', root).onclick = openInvite;
    $('#es', root).onclick = (e) => { const b = e.currentTarget; popover(b, [['default', 'По умолчанию'], ['name', 'По фамилии'], ['dept', 'По отделу']].map(([k, v]) => ({ label: v, check: S.sort === k, onClick: () => { S.sort = k; b.classList.toggle('on', k !== 'default'); redraw(); } }))); };
    $('#ef', root).onclick = (e) => { const b = e.currentTarget; popover(b, [['all', 'Все отделы'], ...DEPTS.map((d) => [d, d])].map(([k, v]) => ({ label: v, check: S.dept === k, onClick: () => { S.dept = k; b.classList.toggle('on', k !== 'all'); redraw(); } }))); };
    root.addEventListener('click', (e) => {
      const v = e.target.closest('[data-v]'); if (v) { S.view = v.dataset.v; root.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('active', x === v)); return redraw(); }
      const em = e.target.closest('[data-emp]'); if (em) nav('employee/' + em.dataset.emp);
    });
    if (ctx.query && PEOPLE[ctx.query]) nav('employee/' + ctx.query);
  },
};
