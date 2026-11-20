import { icon } from '../icons.js';
import { $, $$, esc, badge, avatar, money, progress, popover, toast, drawer, nav, modal } from '../ui.js';
import { ring, bars, lineChart } from '../charts.js';
import { PEOPLE, HISTORY_SHORT, COMMENTS_SEED, COLLISIONS, INVOICES, TASK_STATUS } from '../data.js';
import { store } from '../store.js';
import { db, project, projects, summary, roll, status as nstatus, isOverdue, findNode, parentOf, leaves, fmt, TODAY, addDays, diff, D, taskStats, forecast, recommendations, tasksOf, plural } from '../db.js';
import { openHistory, printDialog } from '../modals.js';
import { filesTab, liveTab, invoicesTab, gosTab } from './project-tabs.js';
import { bimTab } from './bim.js';
import { taskDrawer, newTaskModal, tbadge, isLate } from './tasks.js';
import { exportXlsx, wbsRows } from '../excel.js';
import { importModal } from './import.js';
import { track } from '../analytics.js';

export const TABS = [
  ['overview', 'Обзор'], ['forecast', 'AI-прогноз'], ['structure', 'Структура'], ['gantt', 'Диаграмма'], ['bim', 'BIM-модель'], ['monitoring', 'Панель мониторинга'],
  ['files', 'Файлы'], ['live', 'Прямой эфир'], ['invoices', 'Счета'], ['gos', 'Госуслуги'],
];
export const projectById = (id) => project(id) || projects()[0];
const unpaid = () => INVOICES.filter((i) => !store.get().paid[i.id]).length;
const ST_LABEL = { done: 'Выполнено', work: 'В работе', wait: 'Ожидание' };
export function stBadge(r, overdueAware = true) {
  if (overdueAware && isOverdue(r)) return '<span class="badge b-danger">Просрочено</span>';
  return badge(nstatus(r), ST_LABEL[nstatus(r)]);
}
const mln = (v) => (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';

function milestonesOf(p) {
  const r = roll(p.wbs), span = Math.max(1, diff(r.start, r.end));
  return p.wbs.children.map((s) => { const sr = roll(s); return { at: (diff(r.start, sr.end) / span) * 100, label: `${s.name} · ${fmt(sr.end)}`, state: sr.progress >= 99.95 ? 'done' : sr.end < TODAY ? 'risk' : 'todo' }; });
}
export function milestonesHTML(p) {
  const s = summary(p);
  return `<div class="ms-pct">${Math.round(s.progress)}%</div><div class="milestones"><div class="line"></div><div class="fill" style="width:${Math.min(100, s.progress)}%"></div>
    ${milestonesOf(p).map((x) => `<span class="ms ${x.state}" style="left:${Math.min(100, Math.max(0, x.at))}%" data-l="${esc(x.label)}"></span>`).join('')}</div>`;
}
function overview(p) {
  const s = summary(p), fc = forecast(p);
  const photo = p.photo ? `<img class="ov-photo" src="${p.photo}" alt="${esc(p.name)}">` :
    `<div class="ov-photo" style="display:grid;place-items:center;background:linear-gradient(135deg,var(--primary-50),var(--surface-3));color:var(--primary)">${icon(p.icon || 'building-2', 64)}</div>`;
  return `<div class="card" style="padding:28px 32px"><div class="ov-grid">
    <div>
      <div class="ov-head"><h3>${esc(p.name)}</h3>${p.group === 'operation' ? badge('done', 'В эксплуатации') : stBadge(s)}<button class="icon-btn" data-pop data-act="pmenu" aria-label="Действия с проектом" style="margin-left:auto">${icon('ellipsis', 20)}</button></div>
      <div class="ov-addr"><span class="muted">Адрес объекта</span><span>${esc(p.city)}</span></div>
      <p class="ov-desc">${esc(p.desc || 'Описание проекта не заполнено. Нажмите «…» → «Редактировать проект».')}</p>
      <h4 style="font-size:15px">Прогресс</h4>
      ${milestonesHTML(p)}
      <div class="details"><h4>Детали</h4><dl class="kv2">
        <dt>Дата начала</dt><dd>${fmt(s.start, true)}</dd><dt>Длительность (план)</dt><dd>${s.days} ${plural(s.days, ['день', 'дня', 'дней'])}</dd>
        <dt>Дата окончания (план)</dt><dd>${fmt(s.end, true)}</dd><dt>Бюджет проекта</dt><dd>${money(s.budget)} руб</dd>
        <dt>Прогноз окончания (AI)</dt><dd class="${fc.delay > 0 ? 'danger-t' : 'ok-t'}">${fmt(fc.fEnd, true)}${fc.delay > 0 ? ` (+${fc.delay} дн.)` : ''}</dd><dt>Освоено / затраты</dt><dd>${mln(s.ev)} / ${mln(s.ac)}</dd>
      </dl></div>
      <a class="ai-strip" href="#/project/${p.id}/forecast">${icon('sparkles', 20)}<span><b>PMIC AI:</b> риск ${fc.risk}/100, вероятность срыва срока ${fc.prob}%. ${esc(recommendations(p, fc)[0].text)}</span>${icon('chevron-right', 18)}</a>
      <h4 style="font-size:15px;margin-top:26px">Внешние факторы <button class="link" data-act="addfactor" style="font-size:13px;margin-left:8px">+ добавить</button></h4>
      <ul class="factors">${(p.factors || []).map((f, i) => `<li>${icon('circle-alert', 18)}<span style="flex:1">${esc(f)}</span><button class="icon-btn" data-delfactor="${i}" aria-label="Убрать фактор" style="width:28px;height:28px">${icon('x', 14)}</button></li>`).join('') || '<li class="faint">Факторов не задано</li>'}</ul>
    </div>
    <div class="ov-side">
      <div><div class="ov-id">ID ${p.id === 'palace' ? '156384988' : esc(p.id)}</div>${photo}<div style="text-align:right;margin-top:12px"><button class="link" data-act="history">Показать все</button></div></div>
      <div class="history-card"><h4>История изменений<span>30</span></h4>
        ${HISTORY_SHORT.map(([w, ago, a]) => `<div class="hist-row"><small>${ago}</small><div><div class="who">${avatar(w, 32)}${PEOPLE[w].name}</div><p>${a}</p></div></div>`).join('')}</div>
    </div></div></div>`;
}
function editProject(p, rerender) {
  modal({
    title: 'Редактировать проект', size: 'md',
    body: `<form id="epf" class="form-grid"><input class="input full" name="name" value="${esc(p.name)}" placeholder="Название">
      <input class="input full" name="city" value="${esc(p.city)}" placeholder="Адрес объекта"><textarea class="input full" name="desc" placeholder="Описание">${esc(p.desc || '')}</textarea>
      <button class="btn btn-accent btn-block full">Сохранить</button></form>`,
    onMount(el, m) { el.querySelector('#epf').onsubmit = (e) => { e.preventDefault(); const f = e.target; db.updateProject(p.id, { name: f.name.value.trim() || p.name, city: f.city.value.trim(), desc: f.desc.value.trim() }); m.close(); toast('Проект обновлён', 'ok'); rerender(); }; },
  });
}
function deleteProject(p) {
  modal({
    size: 'sm', title: 'Удалить проект?',
    body: `<p class="muted" style="margin:0">Проект <b style="color:var(--text)">«${esc(p.name)}»</b> со всеми этапами и задачами будет удалён. Вернуть его можно только сбросом демо.</p>`,
    footer: `<button class="btn btn-ghost" data-close>Отмена</button><button class="btn" style="background:var(--red);color:#fff" id="pdel">Удалить проект</button>`,
    onMount(el, m) { el.querySelector('#pdel').onclick = () => { db.deleteProject(p.id); m.close(); nav('projects'); toast(`Проект «${esc(p.name)}» удалён`, 'warn'); }; },
  });
}

const SC = {};
function forecastTab(p) {
  const sc = SC[p.id] || (SC[p.id] = { pay: 0, price: 0, crew: 0 });
  return `<div class="fc-grid" id="fcRoot">${forecastBody(p, sc)}</div>`;
}
function forecastBody(p, sc) {
  const fc = forecast(p, sc), base = forecast(p), recs = recommendations(p, base);
  const changed = sc.pay || sc.price || sc.crew;
  const kpi = (label, val, sub, cls = '') => `<div class="fc-kpi ${cls}"><small>${label}</small><b>${val}</b><span>${sub}</span></div>`;
  const delta = (a, b, unit) => { const d = a - b; return d ? `<em class="${d > 0 ? 'danger-t' : 'ok-t'}">${d > 0 ? '+' : ''}${d} ${unit} к базовому</em>` : ''; };
  return `
    <section class="card fc-head">
      <div class="fc-title">${icon('sparkles', 22)}<div><h3>Прогноз PMIC AI</h3><p class="muted">Метод освоенного объёма и «заработанного графика» по данным этапов и задач на ${fmt(TODAY, true)}. Сдвиньте параметры сценария — прогноз пересчитается.</p></div>
        <button class="btn btn-outline btn-sm" data-act="fcxlsx">${icon('download', 16)} Excel</button></div>
      <div class="fc-kpis">
        ${kpi('Прогноз окончания', fc.done ? 'Завершён' : fmt(fc.fEnd, true), fc.delay > 0 ? `<span class="danger-t">+${fc.delay} ${plural(fc.delay, ['день', 'дня', 'дней'])} к плану (${fmt(fc.r.end, true)})</span>${changed ? delta(fc.delay, base.delay, 'дн.') : ''}` : `<span class="ok-t">в срок (${fmt(fc.r.end, true)})</span>`)}
        ${kpi('Прогноз стоимости', mln(fc.eac), `${fc.over > 0 ? `<span class="danger-t">+${mln(fc.over)}</span>` : `<span class="ok-t">${mln(fc.over)}</span>`} к бюджету ${mln(fc.r.budget)}${changed ? ' ' + delta(Math.round(fc.eac / 1e6), Math.round(base.eac / 1e6), 'млн') : ''}`)}
        ${kpi('Индекс риска', `${fc.risk}<small>/100</small>`, fc.risk >= 60 ? 'высокий' : fc.risk >= 30 ? 'средний' : 'низкий', fc.risk >= 60 ? 'hi' : fc.risk >= 30 ? 'mid' : 'lo')}
        ${kpi('Вероятность срыва срока', `${fc.prob}%`, `SPI ${fc.spi.toFixed(2).replace('.', ',')} · CPI ${fc.cpi.toFixed(2).replace('.', ',')}`)}
      </div>
    </section>
    <section class="card fc-chart"><div class="card-h"><h3>Выполнение проекта: план, факт, прогноз</h3>
      <div class="legend row"><span><i style="background:var(--text-3)"></i>План</span><span><i style="background:var(--primary)"></i>Факт</span><span><i style="background:var(--accent)"></i>Прогноз</span></div></div>
      ${lineChart([{ label: 'План', color: 'var(--text-3)', pts: fc.pts.map((x) => ({ d: x.d, v: x.plan })) }, { label: 'Факт', color: 'var(--primary)', pts: fc.pts.map((x) => ({ d: x.d, v: x.fact })) }, { label: 'Прогноз', color: 'var(--accent)', dash: true, pts: fc.pts.map((x) => ({ d: x.d, v: x.fc })) }], { marker: TODAY })}</section>
    <section class="card fc-what"><div class="card-h"><h3>Сценарий «что если»</h3>${changed ? '<button class="link" data-act="screset">Сбросить</button>' : ''}</div>
      ${[['pay', 'Задержка оплаты заказчиком', 0, 90, 5, 'дн.'], ['price', 'Рост цен на материалы', 0, 30, 1, '%'], ['crew', 'Изменение численности рабочих', -30, 50, 5, '%']].map(([k, l, a, b, st, u]) => `
        <label class="slider"><span>${l}</span><b id="sv_${k}">${sc[k] > 0 && k === 'crew' ? '+' : ''}${sc[k]} ${u}</b><input type="range" min="${a}" max="${b}" step="${st}" value="${sc[k]}" data-sc="${k}" data-u="${u}"></label>`).join('')}
      <h4 class="dsub" style="margin-top:18px">Рекомендации</h4>
      <ul class="recs">${recs.map((r, i) => `<li>${icon('target', 18)}<span>${esc(r.text)}</span>${r.apply ? `<button class="btn btn-sm btn-outline" data-rec="${i}">Проверить</button>` : r.go ? `<a class="btn btn-sm btn-outline" href="#/tasks/all?f=late&p=${p.id}">Открыть</a>` : ''}</li>`).join('')}</ul>
    </section>
    <section class="card fc-factors"><div class="card-h"><h3>Из чего складывается риск</h3><span class="muted" style="font-size:13px">вклад в индекс</span></div>
      ${fc.factors.map((f) => `<div class="factor"><div class="f-top"><b>${esc(f.label)}</b><span>${Math.round(f.v)}</span></div><div class="pbar"><span style="width:${Math.min(100, f.v / 40 * 100)}%;background:${f.v > 15 ? 'var(--red)' : f.v > 6 ? 'var(--accent)' : 'var(--green)'}"></span></div><small class="muted">${esc(f.hint)}</small></div>`).join('')}
    </section>
    <section class="card fc-stages"><div class="card-h"><h3>Прогноз по этапам</h3></div>
      <div class="table-wrap"><table class="tbl cards"><thead><tr><th>Этап</th><th>Готовность</th><th>План</th><th>Прогноз</th><th>Отклонение</th></tr></thead><tbody>
      ${fc.stages.map((s) => `<tr><td class="first">${esc(s.name)}</td><td data-label="Готовность"><span class="mini-pct">${progress(s.progress)}${Math.round(s.progress)}%</span></td><td data-label="План">${fmt(s.end, true)}</td><td data-label="Прогноз">${fmt(s.fEnd, true)}</td><td data-label="Отклонение">${s.progress >= 99.95 ? '<span class="ok-t">завершён</span>' : s.delay > 0 ? `<span class="danger-t">+${s.delay} дн.</span>` : '<span class="ok-t">в срок</span>'}</td></tr>`).join('')}
      </tbody></table></div></section>`;
}

const TS = { open: {}, cols: { status: true, pct: true, start: true, end: true, budget: true }, status: 'all' };
function isOpen(pid, id, depth) { const k = pid + id; return k in TS.open ? TS.open[k] : depth <= 1; }
function visibleRows(p, state, openFn) {
  const rows = [];
  const rec = (n, depth) => n.children.forEach((c) => {
    const r = roll(c);
    if (state.status !== 'all' && !(state.status === 'late' ? isOverdue(r) || leaves(c).some((l) => isOverdue(roll(l))) : nstatus(r) === state.status || leaves(c).some((l) => nstatus(roll(l)) === state.status))) return;
    rows.push({ n: c, r, depth });
    if (c.children.length && openFn(c.id, depth)) rec(c, depth + 1);
  });
  rec(p.wbs, 1);
  return rows;
}
const rowCls = (n, depth) => depth === 1 ? 'stage' : n.children.length ? 'group' : 'leaf';
function structureTable(p) {
  const c = TS.cols, s = summary(p);
  const rows = visibleRows(p, TS, (id, d) => isOpen(p.id, id, d));
  return `<div class="table-wrap tree"><table class="tbl">
    <thead><tr><th>Название</th>${c.status ? '<th>Статус</th>' : ''}${c.pct ? '<th>% выполнения</th>' : ''}${c.start ? '<th>Начало</th>' : ''}${c.end ? '<th>Окончание</th>' : ''}${c.budget ? '<th class="num">Бюджет (руб)</th>' : ''}<th></th></tr></thead>
    <tbody><tr class="root"><td><div class="tname"><span class="tw"></span><span>${esc(p.name)}</span></div></td>${c.status ? `<td>${stBadge(s)}</td>` : ''}${c.pct ? `<td>${Math.round(s.progress)}%</td>` : ''}${c.start ? `<td>${fmt(s.start)}</td>` : ''}${c.end ? `<td>${fmt(s.end)}</td>` : ''}${c.budget ? `<td class="num">${money(s.budget)}</td>` : ''}<td></td></tr>
    ${rows.map(({ n, r, depth }) => `
      <tr class="${rowCls(n, depth)} ${n.children.length && !isOpen(p.id, n.id, depth) ? 'closed' : ''}" data-node="${n.id}">
        <td><div class="tname" style="padding-left:${(depth - 1) * 18}px">${n.children.length ? `<button class="tw" data-tw="${n.id}" data-depth="${depth}" aria-label="Развернуть">${icon('chevron-down', 14)}</button>` : '<span class="tw"></span>'}<span title="${esc(n.name)}">${esc(n.name)}</span></div></td>
        ${c.status ? `<td>${stBadge(r)}</td>` : ''}
        ${c.pct ? `<td><span class="mini-pct">${progress(r.progress)}${Math.round(r.progress)}%</span></td>` : ''}
        ${c.start ? `<td>${fmt(r.start)}</td>` : ''}${c.end ? `<td class="${isOverdue(r) ? 'danger-t' : ''}">${fmt(r.end)}</td>` : ''}
        ${c.budget ? `<td class="num">${money(r.budget)}</td>` : ''}
        <td class="w-actions"><button class="icon-btn" data-pop data-nmenu="${n.id}" aria-label="Действия">${icon('ellipsis', 18)}</button></td>
      </tr>`).join('')}</tbody></table></div>`;
}
function structure(p) {
  return `<div class="head-row" style="justify-content:flex-end;margin-top:-8px">
      <div class="toolbar" style="margin:0">
        <button class="tool" data-act="import" data-guide="import">${icon('upload', 18)} Импорт из Excel</button>
        <button class="tool" data-act="xlsx">${icon('download', 18)} Экспорт в Excel</button>
        <button class="tool" data-pop data-tool="cols">${icon('columns-3', 18)} Поля</button>
        <button class="tool ${TS.status !== 'all' ? 'on' : ''}" data-pop data-tool="filter">${icon('list-filter', 18)} Фильтр</button>
        <button class="icon-btn" data-pop data-tool="more" aria-label="Ещё">${icon('ellipsis', 18)}</button>
      </div></div>
    <div class="card" style="padding:26px 30px">
      <div class="card-h" style="margin-bottom:22px;flex-wrap:wrap"><h3 class="section-title" style="font-size:19px;font-weight:500">Структура проекта</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-outline" data-act="addstage">${icon('plus', 18)} Этап</button><button class="btn btn-accent" data-act="costfc">${icon('sparkles', 18)} Прогноз затрат</button></div></div>
      <p class="hint">${icon('info', 16)} Нажмите на строку, чтобы изменить сроки, бюджет или процент выполнения. Прогресс работ с задачами считается автоматически по закрытым задачам.</p>
      <div id="tree">${structureTable(p)}</div>
    </div>`;
}

export function nodeDrawer(p0, nodeId, onChange = () => {}) {
  const pid = p0.id;
  const P = () => project(pid), N = () => findNode(P(), nodeId);
  const n0 = N(); if (!n0) return;
  const isLeaf = !n0.children.length;
  const resp = ['ivanov', 'vasiliev', 'ivanova', 'krasnoselskikh'][n0.name.length % 4];
  const key = nodeId;
  const comments = () => [...COMMENTS_SEED, ...(store.get().comments[key] || [])];
  const ids = () => leaves(N()).map((l) => l.id);
  const tasks = () => tasksOf(pid).filter((t) => ids().includes(t.nodeId));
  const head = () => { const r = roll(N()); return `${stBadge(r)} <span class="faint" style="margin-left:6px">${Math.round(r.progress)}%</span>`; };
  const form = () => {
    const n = N(), r = roll(n);
    return isLeaf ? `<form id="nform" class="form-grid">
        <label class="field full"><span class="flabel">Название</span><input class="input" name="name" value="${esc(n.name)}"></label>
        <label class="field"><span class="flabel">Начало</span><input class="input" type="date" name="start" value="${n.start}"></label>
        <label class="field"><span class="flabel">Окончание</span><input class="input" type="date" name="end" value="${n.end}"></label>
        <label class="field"><span class="flabel">Бюджет, руб</span><input class="input" name="budget" value="${money(n.budget)}" inputmode="numeric"></label>
        <label class="field"><span class="flabel">Выполнено: <b id="pv">${n.progress}%</b></span><input type="range" name="progress" min="0" max="100" step="5" value="${n.progress}" ${n.auto !== false && tasks().length ? 'disabled' : ''}></label>
        ${tasks().length ? `<label class="check full" style="font-size:14px"><input type="checkbox" name="auto" ${n.auto !== false ? 'checked' : ''}> Считать прогресс по закрытым задачам (${tasks().filter((t) => t.status === 'closed').length} из ${tasks().length})</label>` : ''}
        <button class="btn btn-accent full">Сохранить изменения</button></form>`
      : `<form id="nform" class="form-grid"><label class="field full"><span class="flabel">Название</span><input class="input" name="name" value="${esc(n.name)}"></label>
        <div class="full muted" style="font-size:14px">Сроки ${fmt(r.start, true)} – ${fmt(r.end, true)}, бюджет ${money(r.budget)} руб — считаются по вложенным работам.</div>
        <button class="btn btn-accent full">Сохранить</button></form>`;
  };
  const tasksHTML = () => { const ts = tasks(); return ts.length ? ts.map((t) => `<div class="ntask"><label class="check"><input type="checkbox" data-close-task="${t.id}" ${t.status === 'closed' ? 'checked' : ''}></label><button data-open-task="${t.id}" class="${t.status === 'closed' ? 'done' : ''}">${esc(t.name)}<small class="${isLate(t) ? 'danger-t' : 'faint'}">${fmt(t.due, true)} · ${PEOPLE[t.resp]?.name}</small></button>${tbadge(t.status)}</div>`).join('') : '<p class="faint" style="margin:0">Задач пока нет</p>'; };
  const cHTML = () => comments().map((c) => `<div class="comment">${avatar(c.who, 36)}<div><div class="comment-bubble"><b>${esc(PEOPLE[c.who]?.name || c.who)}</b><small class="faint">${esc(c.ago)}</small><div style="margin-top:6px">${esc(c.text)}</div></div><div class="comment-actions"><button>Ответить</button><button>Ещё</button></div></div></div>`).join('');
  const d = drawer({
    width: 540,
    html: `<div class="drawer-h"><div id="nhead">${head()}</div><button class="icon-btn" data-close aria-label="Закрыть">${icon('x', 20)}</button></div>
    <div class="drawer-b">
      <h3 style="font-size:19px;font-weight:600;margin-bottom:6px" id="ntitle">${esc(n0.name)}</h3>
      <div class="person" style="margin-bottom:18px">${avatar(resp, 28)}<span class="muted">Ответственный: ${PEOPLE[resp].name}</span></div>
      <div id="nf">${form()}</div>
      <div class="card-h" style="margin:26px 0 8px"><h4 class="dsub" style="margin:0">Задачи</h4><button class="link" data-act="ntask">+ Задача</button></div>
      <div id="ntasks">${tasksHTML()}</div>
      <div class="seg-tabs"><button class="active" data-seg="c">Комментарии</button><button data-seg="h">История изменений</button></div>
      <div id="segBody">${cHTML()}</div>
      <form class="comment-new" id="cform">${avatar('anisimov', 36)}<div class="input-wrap"><input class="input" placeholder="Добавить комментарий" aria-label="Комментарий"><button type="submit" class="icon-btn" aria-label="Отправить">${icon('send', 18)}</button></div></form>
    </div>`,
    onMount(el, api) {
      const refresh = () => { el.querySelector('#nhead').innerHTML = head(); el.querySelector('#ntasks').innerHTML = tasksHTML(); el.querySelector('#nf').innerHTML = form(); onChange(); };
      el.addEventListener('input', (e) => {
        if (e.target.name === 'progress') el.querySelector('#pv').textContent = e.target.value + '%';
        if (e.target.name === 'budget') { const v = e.target.value.replace(/\D/g, ''); e.target.value = v ? money(+v) : ''; }
      });
      el.addEventListener('change', (e) => {
        if (e.target.name === 'auto') { el.querySelector('[name=progress]').disabled = e.target.checked; }
        const ct = e.target.dataset.closeTask;
        if (ct) { db.updateTask(ct, { status: e.target.checked ? 'closed' : 'work' }); track('task_closed'); refresh(); toast(e.target.checked ? 'Задача закрыта — прогресс пересчитан' : 'Задача возвращена в работу', 'ok'); }
      });
      el.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.id === 'nform') {
          const f = e.target, patch = { name: f.name.value.trim() || N().name };
          if (isLeaf) {
            Object.assign(patch, { start: f.start.value, end: f.end.value, budget: +String(f.budget.value).replace(/\D/g, '') || 0 });
            const auto = f.auto ? f.auto.checked : false;
            if (!auto) patch.progress = +f.progress.value;
            db.updateNode(pid, nodeId, patch);
            if (auto) { db.updateNode(pid, nodeId, { auto: true }); db.updateTask(tasks()[0].id, {}); }
          } else db.updateNode(pid, nodeId, patch);
          el.querySelector('#ntitle').textContent = patch.name;
          track('stage_edited'); refresh(); toast('Изменения сохранены. Гант, финансы и прогноз пересчитаны.', 'ok');
        }
        if (e.target.id === 'cform') {
          const i = e.target.querySelector('input'), text = i.value.trim(); if (!text) return;
          store.set((s) => ({ comments: { ...s.comments, [key]: [...(s.comments[key] || []), { who: 'anisimov', ago: 'только что', text }] } }));
          el.querySelector('#segBody').innerHTML = cHTML(); i.value = '';
        }
      });
      el.addEventListener('click', (e) => {
        const s = e.target.closest('[data-seg]');
        if (s) { $$('[data-seg]', el).forEach((b) => b.classList.toggle('active', b === s)); el.querySelector('#segBody').innerHTML = s.dataset.seg === 'c' ? cHTML() : HISTORY_SHORT.map(([w, ago, a]) => `<div class="hist-row"><small>${ago}</small><div><div class="who">${avatar(w, 32)}${PEOPLE[w].name}</div><p>${a}</p></div></div>`).join(''); el.querySelector('#cform').classList.toggle('hide', s.dataset.seg !== 'c'); }
        const ot = e.target.closest('[data-open-task]'); if (ot) { api.close(); setTimeout(() => taskDrawer(tasksOf(pid).find((t) => t.id === ot.dataset.openTask), onChange), 260); }
        if (e.target.closest('[data-act="ntask"]')) { api.close(); newTaskModal(() => onChange(), { project: pid, nodeId: isLeaf ? nodeId : leaves(N())[0].id }); }
      });
    },
  });
}

function nodeMenu(anchor, p, nodeId, redraw) {
  const n = findNode(p, nodeId);
  popover(anchor, [
    { icon: 'pencil', label: 'Открыть и изменить', onClick: () => nodeDrawer(p, nodeId, redraw) },
    { icon: 'plus', label: 'Добавить подэтап', onClick: () => { const id = db.addNode(p.id, nodeId); TS.open[p.id + nodeId] = true; redraw(); toast('Подэтап добавлен', 'ok'); nodeDrawer(project(p.id), id, redraw); } },
    { icon: 'square-check-big', label: 'Добавить задачу', onClick: () => newTaskModal(redraw, { project: p.id, nodeId: n.children.length ? leaves(n)[0].id : nodeId }) },
    { icon: 'chevron-right', label: 'Сдвинуть на неделю позже', onClick: () => { db.shiftNode(p.id, nodeId, 7); redraw(); toast(`«${esc(n.name)}» сдвинут на 7 дней. Прогноз пересчитан.`, 'ok'); } },
    '-', { icon: 'trash-2', label: 'Удалить', danger: true, onClick: () => { db.deleteNode(p.id, nodeId); redraw(); toast(`«${esc(n.name)}» удалён`); } },
  ]);
}

const ZOOMS = [
  { name: 'Месяц', ppd: 4, unit: 'm' }, { name: 'Квартал', ppd: 1.6, unit: 'q' }, { name: 'Полугодие', ppd: 0.75, unit: 'h' }, { name: 'Год', ppd: 0.36, unit: 'y' },
];
const GS = { open: {}, zoom: 2, collapsed: false, status: 'all' };
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
function scaleCells(min, max, z) {
  const cells = [];
  const m0 = D(min);
  let d = new Date(m0.getFullYear(), z.unit === 'm' ? m0.getMonth() : z.unit === 'q' ? Math.floor(m0.getMonth() / 3) * 3 : z.unit === 'h' ? (m0.getMonth() < 6 ? 0 : 6) : 0, 1);
  const step = { m: 1, q: 3, h: 6, y: 12 }[z.unit];
  const end = D(max);
  while (d <= end) {
    const nx = new Date(d.getFullYear(), d.getMonth() + step, 1);
    const label = z.unit === 'm' ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : z.unit === 'q' ? `Квартал ${d.getMonth() / 3 + 1}, ${d.getFullYear()}` : z.unit === 'h' ? `Полугодие ${d.getMonth() < 6 ? 1 : 2}, ${d.getFullYear()}` : `${d.getFullYear()} г.`;
    cells.push({ start: d, end: nx, label }); d = nx;
  }
  return cells;
}
function ganttHTML(p) {
  const z = ZOOMS[GS.zoom];
  const s = summary(p);
  const openFn = (id, depth) => { const k = p.id + id; return k in GS.open ? GS.open[k] : depth <= 1; };
  const rows = [{ n: p.wbs, r: s, depth: 0, root: true }, ...visibleRows(p, GS, openFn)];
  const cells = scaleCells(addDays(s.start, -15), addDays(s.end > TODAY ? s.end : TODAY, 30), z);
  const min = cells[0].start, x = (iso) => ((D(iso) - min) / 864e5) * z.ppd;
  const width = ((cells[cells.length - 1].end - min) / 864e5) * z.ppd;
  const dur = (r) => diff(r.start, r.end) + 1;
  return `<div class="gantt ${GS.collapsed ? 'collapsed' : ''}" style="--ppd:${z.ppd}">
    <div class="g-left"><table><colgroup><col class="c-n"><col class="c-d"><col class="c-d"><col class="c-d"></colgroup><thead><tr><th>Задача</th><th>Длит-ть</th><th>Начало</th><th>Окончание</th></tr></thead><tbody>
      ${rows.map(({ n, r, depth, root }) => `<tr class="${root ? 'root' : rowCls(n, depth)}" ${root ? '' : `data-node="${n.id}"`}><td><div class="g-name" style="padding-left:${Math.max(0, depth - 1) * 14}px">${!root && n.children.length ? `<button class="tw" data-gtw="${n.id}" data-depth="${depth}" style="display:inline-grid;transform:rotate(${openFn(n.id, depth) ? 0 : -90}deg)">${icon('chevron-down', 14)}</button>` : '<span style="width:20px;flex:none"></span>'}<span title="${esc(root ? p.name : n.name)}">${esc(root ? p.name : n.name)}</span></div></td><td>${dur(r)} дн</td><td>${fmt(r.start)}</td><td>${fmt(r.end)}</td></tr>`).join('')}
    </tbody></table></div>
    <button class="g-toggle" data-act="gcollapse" aria-label="Скрыть таблицу">${icon('chevron-left', 16)}</button>
    <div class="g-right"><div style="width:${width + 260}px">
      <div class="g-scale">${cells.map((c) => `<div style="width:${((c.end - c.start) / 864e5) * z.ppd}px">${c.label}</div>`).join('')}</div>
      <div class="g-rows">
        <div class="g-grid">${cells.map((c) => `<div style="width:${((c.end - c.start) / 864e5) * z.ppd}px"></div>`).join('')}</div>
        <div class="g-today" style="left:${x(TODAY)}px"></div>
        ${rows.map(({ n, r, depth, root }) => { const name = root ? p.name : n.name; const leaf = !root && !n.children.length; return `<div class="g-row"><div class="g-bar ${root ? 'root' : ''} ${nstatus(r) === 'wait' ? 'wait' : ''} ${isOverdue(r) ? 'late' : ''} ${root ? '' : 'drag'}" ${root ? '' : `data-gnode="${n.id}"`} style="left:${x(r.start)}px;width:${Math.max(6, x(addDays(r.end, 1)) - x(r.start))}px" title="${esc(name)}: ${Math.round(r.progress)}% · ${fmt(r.start)}–${fmt(r.end)}"><i style="width:${Math.min(100, r.progress)}%"></i>${leaf ? '<b class="g-handle" data-edge="end"></b>' : ''}<em>${esc(name.length > 40 ? name.slice(0, 40) + '…' : name)} (${fmt(r.start)} - ${fmt(r.end)})</em></div></div>`; }).join('')}
      </div></div></div>
  </div>`;
}
function gantt(p) {
  return `<div class="card gantt-card" id="gcard">
    <div class="gantt-head"><div><h3 class="section-title">График проекта</h3><p class="hint" style="margin:6px 0 0">${icon('info', 16)} Перетащите полосу, чтобы сдвинуть этап; тяните правый край работы, чтобы изменить срок.</p></div>
      <div class="toolbar" style="margin:0">
        <button class="tool ${GS.status !== 'all' ? 'on' : ''}" data-pop data-tool="gfilter">${icon('list-filter', 18)} Фильтр</button>
        <button class="tool" data-act="gprint">${icon('printer', 18)} Печать</button>
        <label class="zoom"><input type="range" min="0" max="3" step="1" value="${GS.zoom}" id="gzoom" aria-label="Масштаб"><span id="gzl">${ZOOMS[GS.zoom].name}</span></label>
        <button class="icon-btn" data-pop data-tool="gmore" aria-label="Ещё">${icon('ellipsis', 18)}</button>
        <button class="icon-btn" data-act="gfull" aria-label="Во весь экран">${icon('maximize-2', 18)}</button>
      </div></div>
    <div id="gantt">${ganttHTML(p)}</div></div>`;
}
function bindGanttDrag(root, p, redraw) {
  let st = null;
  const onDown = (e) => {
    const bar = e.target.closest('.g-bar.drag'); if (!bar || e.button > 0) return;
    const z = ZOOMS[GS.zoom];
    st = { bar, id: bar.dataset.gnode, edge: e.target.dataset.edge || 'both', x0: e.clientX, left: bar.offsetLeft, w: bar.offsetWidth, ppd: z.ppd, moved: false };
    bar.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!st) return;
    const dx = e.clientX - st.x0;
    if (Math.abs(dx) > 3) st.moved = true;
    if (!st.moved) return;
    if (st.edge === 'end') st.bar.style.width = Math.max(6, st.w + dx) + 'px'; else st.bar.style.left = st.left + dx + 'px';
    st.bar.classList.add('dragging');
    const days = Math.round(dx / st.ppd);
    st.bar.dataset.tip = `${days > 0 ? '+' : ''}${days} дн.`;
  };
  const onUp = (e) => {
    if (!st) return;
    const s = st; st = null;
    if (!s.moved) return nodeDrawer(p, s.id, redraw);
    const days = Math.round((e.clientX - s.x0) / s.ppd);
    if (!days) return redraw();
    db.shiftNode(p.id, s.id, days, s.edge);
    track('gantt_drag');
    redraw();
    const fc = forecast(project(p.id));
    toast(`${s.edge === 'end' ? 'Срок изменён' : 'Этап сдвинут'} на ${days > 0 ? '+' : ''}${days} дн. Прогноз окончания проекта: ${fmt(fc.fEnd, true)}${fc.delay > 0 ? ` (+${fc.delay} дн.)` : ''}`, 'ok');
  };
  const g = root.querySelector('#gantt');
  g.addEventListener('pointerdown', onDown);
  g.addEventListener('pointermove', onMove);
  g.addEventListener('pointerup', onUp);
  g.addEventListener('pointercancel', () => { st = null; redraw(); });
}

function monitoring(p) {
  const m = taskStats(p.id);
  const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
  const tile = (k, ic, tone, label, val) => `<a class="card mon-tile ${k === 'all' ? 'mon-total' : ''}" href="#/tasks/all?f=${k === 'all' ? 'all' : k}&p=${p.id}"><span class="mi ${tone}">${icon(ic, 32)}</span><span>${label}<b>${val}</b></span></a>`;
  const labels = m.months.map((x) => MONTHS[+x.slice(5) - 1]);
  const upcoming = leaves(p.wbs).map((l) => ({ l, r: roll(l) })).filter(({ r }) => r.progress < 100).sort((a, b) => (a.r.end < b.r.end ? -1 : 1)).slice(0, 4);
  return `<div class="mon-grid">
    ${tile('closed', 'list-checks', 'green', 'Завершённые задачи', m.done)}
    ${tile('undone', 'clipboard-x', 'yellow', 'Незавершенные задачи', m.undone)}
    <div class="card mon-ring">${ring(pct)}<dl><dt>Завершённые задачи</dt><dd>${pct}% (${m.done})</dd><dt>Незавершенные задачи</dt><dd>${100 - pct}% (${m.undone})</dd></dl></div>
    ${tile('late', 'clock-alert', 'red', 'Просроченные задачи', m.overdue)}
    ${tile('work', 'cog', 'blue', 'Задачи в работе', m.inwork)}
    ${tile('all', 'clipboard-list', 'gray', 'Всего задач', m.total)}
    <section class="card mon-activity"><div class="card-h"><h3>Активность</h3><span class="muted" style="font-size:13px">закрыто задач по месяцам</span></div>${bars(m.activity, labels, { max: Math.max(4, ...m.activity) * 1.15, ticks: [], showValues: true, fmt: (v) => v || '' })}</section>
    <section class="card mon-events"><div class="card-h"><h3>Ближайшие сроки</h3></div><div class="events">${upcoming.map(({ l, r }) => { const late = r.end < TODAY, near = diff(TODAY, r.end) < 30; const dd = D(r.end); return `<button class="event" data-node="${l.id}"><span class="date ${late ? 'red' : near ? 'yellow' : 'blue'}">${MONTHS[dd.getMonth()]}<b>${dd.getDate()}</b></span><span><b style="font-weight:500">${esc(l.name)}</b><br><span class="chip-s ${late ? 'red' : near ? 'yellow' : 'blue'}">${late ? `просрочено ${-diff(TODAY, r.end)} дн.` : `${Math.round(r.progress)}% · через ${diff(TODAY, r.end)} дн.`}</span></span>${icon('chevron-right', 20)}</button>`; }).join('') || '<p class="faint">Все работы завершены</p>'}</div></section>
  </div>`;
}

export default {
  title: (ctx) => projectById(ctx.params.id)?.name || 'Проект',
  back: () => '#/projects',
  render(ctx) {
    const p = projectById(ctx.params.id);
    if (!p) return `<div class="empty">${icon('folder-kanban', 28)}<p>Проект не найден</p><a class="btn btn-accent" href="#/projects">К проектам</a></div>`;
    const tab = TABS.some(([k]) => k === ctx.params.tab) ? ctx.params.tab : 'overview';
    const n = unpaid();
    const tabs = `<nav class="tabs project-tabs" aria-label="Разделы проекта">${TABS.map(([k, v]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/project/${p.id}/${k}" ${k === 'forecast' ? 'data-guide="forecast"' : k === 'gantt' ? 'data-guide="gantt"' : ''}>${k === 'forecast' ? icon('sparkles', 15) + ' ' : ''}${v}${k === 'invoices' && n ? ` <span class="nav-count">${n}</span>` : ''}</a>`).join('')}</nav>`;
    const body = ({ overview, forecast: forecastTab, structure, gantt, monitoring, bim: bimTab.render, files: filesTab.render, live: liveTab.render, invoices: invoicesTab.render, gos: gosTab.render })[tab](p, ctx);
    return tabs + `<div id="tabBody">${body}</div>`;
  },
  mount(root, ctx) {
    const p0 = projectById(ctx.params.id); if (!p0) return;
    const pid = p0.id, P = () => project(pid);
    const tab = ctx.params.tab || 'overview';
    root.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (tab === 'forecast') track('forecast_opened');
    const redrawTree = () => { const t = $('#tree', root); if (t) t.innerHTML = structureTable(P()); };
    const redrawGantt = () => { const g = $('#gantt', root); if (g) { const sl = g.querySelector('.g-right')?.scrollLeft || 0; g.innerHTML = ganttHTML(P()); g.querySelector('.g-right').scrollLeft = sl; } };
    const rerender = () => { root.firstElementChild.innerHTML = this.render(ctx); };
    const redraw = () => { redrawTree(); redrawGantt(); if (tab === 'overview' || tab === 'monitoring') rerender(); };

    if (tab === 'gantt') {
      const zr = $('#gzoom', root);
      zr.oninput = () => { GS.zoom = +zr.value; $('#gzl', root).textContent = ZOOMS[GS.zoom].name; redrawGantt(); };
      bindGanttDrag(root, P(), redrawGantt);
      setTimeout(() => { const gr = root.querySelector('.g-right'), t = root.querySelector('.g-today'); if (gr && t) gr.scrollLeft = Math.max(0, t.offsetLeft - gr.clientWidth / 2); }, 30);
    }
    if (tab === 'structure' && ctx.query) setTimeout(() => nodeDrawer(P(), ctx.query, redrawTree), 60);
    if (tab === 'forecast') {
      root.addEventListener('input', (e) => {
        const k = e.target.dataset.sc; if (!k) return;
        SC[pid][k] = +e.target.value;
        $('#sv_' + k, root).textContent = `${k === 'crew' && +e.target.value > 0 ? '+' : ''}${e.target.value} ${e.target.dataset.u}`;
        clearTimeout(this._t); this._t = setTimeout(() => { const y = scrollY; $('#fcRoot', root).innerHTML = forecastBody(P(), SC[pid]); scrollTo(0, y); track('whatif_used'); }, 120);
      });
    }

    const handler = (e) => {
      const tw = e.target.closest('[data-tw]');
      if (tw) { e.stopPropagation(); const k = pid + tw.dataset.tw; TS.open[k] = !isOpen(pid, tw.dataset.tw, +tw.dataset.depth); return redrawTree(); }
      const gtw = e.target.closest('[data-gtw]');
      if (gtw) { const k = pid + gtw.dataset.gtw; GS.open[k] = !(k in GS.open ? GS.open[k] : +gtw.dataset.depth <= 1); return redrawGantt(); }
      const nm = e.target.closest('[data-nmenu]'); if (nm) { e.stopPropagation(); return nodeMenu(nm, P(), nm.dataset.nmenu, redraw); }
      const node = e.target.closest('[data-node]');
      if (node && ['structure', 'gantt', 'monitoring'].includes(tab) && !e.target.closest('.g-bar')) return nodeDrawer(P(), node.dataset.node, redraw);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'history') return openHistory();
      if (act === 'pmenu') return popover(e.target.closest('[data-act]'), [
        { icon: 'pencil', label: 'Редактировать проект', onClick: () => editProject(P(), rerender) },
        { icon: 'square-check-big', label: 'Новая задача в проекте', onClick: () => newTaskModal(rerender, { project: pid }) },
        { icon: 'download', label: 'Выгрузить структуру в Excel', onClick: () => exportStructure(P()) },
        '-', { icon: 'trash-2', label: 'Удалить проект', danger: true, onClick: () => deleteProject(P()) },
      ]);
      if (act === 'addfactor') return modal({ title: 'Внешний фактор', size: 'sm', body: '<form id="ff"><input class="input" name="f" placeholder="Например: задержка поставки лифтового оборудования"><button class="btn btn-accent btn-block" style="margin-top:14px">Добавить</button></form>', onMount(el, m) { el.querySelector('#ff').onsubmit = (ev) => { ev.preventDefault(); const v = ev.target.f.value.trim(); if (!v) return; db.updateProject(pid, { factors: [...(P().factors || []), v] }); m.close(); rerender(); toast('Фактор добавлен — индекс риска пересчитан', 'ok'); }; } });
      const df = e.target.closest('[data-delfactor]'); if (df) { const f = [...(P().factors || [])]; f.splice(+df.dataset.delfactor, 1); db.updateProject(pid, { factors: f }); return rerender(); }
      if (act === 'addstage') { const id = db.addNode(pid, null, { name: `Этап ${P().wbs.children.length + 1}` }); redrawTree(); toast('Этап добавлен', 'ok'); return nodeDrawer(P(), id, redrawTree); }
      if (act === 'import') return importModal({ projectId: pid, onDone: () => { rerender(); } });
      if (act === 'xlsx') return exportStructure(P());
      if (act === 'costfc') return import('../modals.js').then((m) => m.openForecast());
      if (act === 'gcollapse') { GS.collapsed = !GS.collapsed; $('.gantt', root).classList.toggle('collapsed', GS.collapsed); return; }
      if (act === 'gfull') { const c = $('#gcard', root); if (document.fullscreenElement) document.exitFullscreen(); else c.requestFullscreen?.().catch(() => {}); return; }
      if (act === 'gprint') return printGantt(P());
      if (act === 'screset') { SC[pid] = { pay: 0, price: 0, crew: 0 }; return rerender(); }
      if (act === 'fcxlsx') return exportForecast(P());
      const rec = e.target.closest('[data-rec]');
      if (rec) { const r = recommendations(P(), forecast(P()))[+rec.dataset.rec]; SC[pid] = { pay: 0, price: 0, crew: 0, ...r.apply }; rerender(); return toast('Сценарий применён — сравните прогноз с базовым', 'info'); }
      const tool = e.target.closest('[data-tool]');
      if (tool) {
        const t = tool.dataset.tool;
        if (t === 'cols') popover(tool, [['status', 'Статус'], ['pct', '% выполнения'], ['start', 'Начало'], ['end', 'Окончание'], ['budget', 'Бюджет']].map(([k, v]) => ({ label: v, check: TS.cols[k], onClick: () => { TS.cols[k] = !TS.cols[k]; redrawTree(); } })));
        if (t === 'filter' || t === 'gfilter') {
          const S = t === 'filter' ? TS : GS;
          popover(tool, [['all', 'Все статусы'], ['done', 'Выполнено'], ['work', 'В работе'], ['wait', 'Ожидание'], ['late', 'Просрочено']].map(([k, v]) => ({ label: v, check: S.status === k, onClick: () => { S.status = k; tool.classList.toggle('on', k !== 'all'); t === 'filter' ? redrawTree() : redrawGantt(); } })));
        }
        if (t === 'more' || t === 'gmore') {
          const S = t === 'more' ? TS : GS, rd = t === 'more' ? redrawTree : redrawGantt;
          popover(tool, [
            { icon: 'chevron-down', label: 'Развернуть все', onClick: () => { (function w(n) { n.children.forEach((c) => { if (c.children.length) { S.open[pid + c.id] = true; w(c); } }); })(P().wbs); rd(); } },
            { icon: 'chevron-up', label: 'Свернуть все', onClick: () => { (function w(n) { n.children.forEach((c) => { if (c.children.length) { S.open[pid + c.id] = false; w(c); } }); })(P().wbs); rd(); } },
            { icon: 'download', label: 'Экспорт в Excel', onClick: () => exportStructure(P()) },
          ]);
        }
        return;
      }
    };
    root.addEventListener('click', handler);
    let extra = null;
    if (tab === 'bim') extra = bimTab.mount(root, P());
    if (tab === 'files') extra = filesTab.mount(root, P(), rerender);
    if (tab === 'live') extra = liveTab.mount(root, P());
    if (tab === 'invoices') extra = invoicesTab.mount(root, P(), rerender);
    if (tab === 'gos') extra = gosTab.mount(root, P(), rerender);
    return () => { root.removeEventListener('click', handler); extra && extra(); };
  },
};

function exportStructure(p) {
  exportXlsx(`PMIC_${p.name}_структура.xlsx`, [{ name: 'Структура', rows: wbsRows(p) }]).then(() => { toast('Структура выгружена в Excel', 'ok'); track('excel_export'); });
}
function exportForecast(p) {
  const fc = forecast(p, SC[p.id] || {});
  exportXlsx(`PMIC_${p.name}_прогноз.xlsx`, [
    { name: 'Прогноз', rows: [['Показатель', 'Значение'], ['Плановое окончание', fmt(fc.r.end, true)], ['Прогноз окончания', fmt(fc.fEnd, true)], ['Отклонение, дн.', fc.delay], ['Бюджет, руб', Math.round(fc.r.budget)], ['Прогноз стоимости (EAC), руб', Math.round(fc.eac)], ['Индекс риска', fc.risk], ['Вероятность срыва, %', fc.prob], ['SPI', +fc.spi.toFixed(2)], ['CPI', +fc.cpi.toFixed(2)]] },
    { name: 'Этапы', rows: [['Этап', 'Готовность, %', 'План', 'Прогноз', 'Отклонение, дн.'], ...fc.stages.map((s) => [s.name, Math.round(s.progress), fmt(s.end, true), fmt(s.fEnd, true), s.delay])] },
    { name: 'Факторы риска', rows: [['Фактор', 'Вклад', 'Пояснение'], ...fc.factors.map((f) => [f.label, Math.round(f.v), f.hint])] },
  ]).then(() => { toast('Прогноз выгружен в Excel', 'ok'); track('excel_export'); });
}
function printGantt(p) {
  const s = summary(p), span = Math.max(1, diff(s.start, s.end));
  const rows = []; (function w(n, d) { n.children.forEach((c) => { rows.push([c, d]); if (d < 2) w(c, d + 1); }); })(p.wbs, 1);
  const sheet = `<div class="muted">${new Date().toLocaleString('ru-RU')}</div><h4>График проекта «${esc(p.name)}»</h4>
    <table style="width:100%;border-collapse:collapse;font-size:9px">${rows.map(([n, d]) => { const r = roll(n); return `<tr><td style="padding:3px 4px;width:42%;${d < 2 ? 'font-weight:600' : ''};padding-left:${4 + d * 8}px">${esc(n.name)}</td><td style="width:16%">${fmt(r.start)}–${fmt(r.end)}</td>
      <td><div style="position:relative;height:8px;background:#eef1f5;border-radius:4px"><div style="position:absolute;left:${(diff(s.start, r.start) / span) * 100}%;width:${Math.max(1, (diff(r.start, r.end) / span) * 100)}%;top:0;bottom:0;background:#4081E1;border-radius:4px"></div></div></td></tr>`; }).join('')}</table>`;
  printDialog({ title: 'График проекта', sheet });
}

export function collisionSheet() {
  const { cols, rows } = COLLISIONS;
  const totals = cols.map((c) => Object.values(rows).reduce((s, r) => s + (r[c] || 0), 0));
  const color = (v) => !v ? '' : v > 3000 ? 'background:#E0567E;color:#fff' : v > 1500 ? 'background:#EDA0B8' : v > 400 ? 'background:#F5C9D6' : '';
  return `<div class="muted">${new Date().toLocaleString('ru-RU')}</div><h4>Отчёт-матрица коллизий</h4>
    <table class="cmatrix"><tr><th>Раздел</th>${cols.map((c) => `<th>${c}</th>`).join('')}<th>Всего</th></tr>
    ${Object.entries(rows).map(([r, v]) => `<tr><th>${r}</th>${cols.map((c) => `<td style="${color(v[c])}">${v[c] || ''}</td>`).join('')}<td style="background:#fff">${Object.values(v).reduce((a, b) => a + b, 0)}</td></tr>`).join('')}
    <tr><th>Всего</th>${totals.map((t) => `<td style="background:#fff">${t}</td>`).join('')}<td style="background:#fff">${totals.reduce((a, b) => a + b, 0)}</td></tr></table>`;
}
