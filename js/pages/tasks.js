// Раздел «Задачи» — по макету MVP 2.0: все/мои, плитка/список, новая задача, карточка задачи.
// Задачи привязаны к работам проекта: закрытие задачи двигает прогресс этапа и проекта.
import { icon } from '../icons.js';
import { $, $$, esc, avatar, avatars, docIcon, modal, drawer, toast, popover, nav } from '../ui.js';
import { TASK_STATUS, TASK_FILES, PEOPLE, EMPLOYEE_IDS, COMMENTS_SEED, HISTORY_SHORT } from '../data.js';
import { store } from '../store.js';
import { db, allTasks as dbTasks, projects, project, findNode, parentOf, leaves, fmt, TODAY, diff } from '../db.js';
import { track } from '../analytics.js';

const S = { view: 'grid', q: '', sort: 'due', dir: 1, status: 'all', project: 'all', shown: 24 };
const pname = (id) => project(id)?.name || '—';
export const allTasks = () => dbTasks();
export const taskStatus = (t) => t.status;
export const tbadge = (st) => `<span class="badge b-${TASK_STATUS[st]?.cls || 'wait'}">${TASK_STATUS[st]?.label || st}</span>`;
export const isLate = (t) => t.status !== 'closed' && t.due < TODAY;
const PEOPLE_PICK = ['anisimov', ...EMPLOYEE_IDS, 'ivanova', 'ivanov', 'vasiliev', 'krasnoselskikh', 'samoilov', 'vasnetsov'];
const where = (t) => { const p = project(t.projectId); if (!p) return { stage: '—', work: '—' }; const n = findNode(p, t.nodeId); const par = n && parentOf(p, n.id); return { stage: par && par !== p.wbs ? par.name : n?.name || '—', work: n?.name || '—' }; };

function list(tab) {
  let a = allTasks().filter((t) => (tab !== 'my' || t.resp === 'anisimov' || t.exec === 'anisimov') && (S.status === 'all' || (S.status === 'late' ? isLate(t) : S.status === 'undone' ? t.status !== 'closed' : S.status === 'work' ? t.status === 'work' || t.status === 'review' : t.status === S.status)) && (S.project === 'all' || t.projectId === S.project)
    && `${t.name} ${pname(t.projectId)} ${PEOPLE[t.resp]?.name}`.toLowerCase().includes(S.q.toLowerCase()));
  const pr = { 'Высокий': 0, 'Средний': 1, 'Низкий': 2 };
  const order = Object.keys(TASK_STATUS);
  const f = { due: (x, y) => x.due.localeCompare(y.due), name: (x, y) => x.name.localeCompare(y.name, 'ru'), priority: (x, y) => pr[x.priority] - pr[y.priority], status: (x, y) => order.indexOf(x.status) - order.indexOf(y.status) }[S.sort];
  // по умолчанию сначала незакрытые
  return [...a].sort((x, y) => (S.sort === 'due' ? (x.status === 'closed') - (y.status === 'closed') : 0) || f(x, y) * S.dir);
}

export function taskCard(t) {
  return `<button class="tcard ${isLate(t) ? 'late' : ''}" data-tid="${t.id}"><span class="tc-proj">${esc(pname(t.projectId))}</span>
    <span class="tc-row"><b>${esc(t.name)}</b>${tbadge(t.status)}</span>
    <span class="tc-row"><span class="tc-due ${isLate(t) ? 'danger-t' : ''}">${icon(isLate(t) ? 'clock-alert' : 'clock', 15)} ${fmt(t.due, true)}</span>${avatars([t.resp, t.exec], 26)}</span></button>`;
}

function body(tab) {
  const rows = list(tab), shown = rows.slice(0, S.shown);
  if (!rows.length) return `<div class="empty">${icon('list-checks', 28)}<p>Задач не найдено</p></div>`;
  const more = rows.length > S.shown ? `<div style="text-align:center;margin-top:16px"><button class="btn btn-outline" id="tmore">Показать ещё (${rows.length - S.shown})</button></div>` : '';
  if (S.view === 'grid') return `<div class="tgrid">${shown.map(taskCard).join('')}</div>${more}`;
  const arrow = (k) => S.sort === k ? (S.dir > 0 ? ' ↑' : ' ↓') : '';
  return `<div class="table-wrap"><table class="tbl hover cards"><thead><tr>
    <th>№</th><th><button data-sortcol="name">Название${arrow('name')}</button></th><th><button data-sortcol="status">Статус${arrow('status')}</button></th>
    <th><button data-sortcol="due">Крайний срок${arrow('due')}</button></th><th><button data-sortcol="priority">Приоритет${arrow('priority')}</button></th><th>Ответственный</th></tr></thead>
    <tbody>${shown.map((t, i) => `<tr data-tid="${t.id}">
      <td data-label="№">${String(i + 1).padStart(2, '0')}</td>
      <td class="first">${esc(t.name)} ${icon('chevron-right', 14, 'faint')}<span class="sub">${esc(pname(t.projectId))}</span></td>
      <td data-label="Статус">${tbadge(t.status)}</td>
      <td data-label="Крайний срок" class="${isLate(t) ? 'danger-t strong' : t.priority === 'Высокий' ? 'strong' : ''}">${fmt(t.due, true)}</td>
      <td data-label="Приоритет" class="${t.priority === 'Высокий' ? 'strong' : ''}">${t.priority}</td>
      <td data-label="Ответственный"><span class="person">${avatar(t.resp, 30)}<span>${PEOPLE[t.resp]?.name}</span></span></td></tr>`).join('')}</tbody></table></div>${more}`;
}

// ---------- Карточка задачи ----------
export function taskDrawer(task, onChange = () => {}) {
  const id = task.id;
  const t = () => allTasks().find((x) => x.id === id) || task;
  const key = 'task:' + id;
  const statusPicker = () => `<button class="status-pick s-${TASK_STATUS[t().status].cls}" id="tst" data-pop>${TASK_STATUS[t().status].label} ${icon('chevron-down', 16)}</button>`;
  const setSt = (s, msg) => {
    const before = project(t().projectId), n0 = before && findNode(before, t().nodeId)?.progress;
    db.updateTask(id, { status: s });
    d.el.querySelector('#tst').outerHTML = statusPicker();
    const after = project(t().projectId), n1 = after && findNode(after, t().nodeId)?.progress;
    toast((msg || `Статус задачи: «${TASK_STATUS[s].label}»`) + (n0 !== n1 && n1 != null ? `<br><span class="faint">Прогресс работы «${esc(where(t()).work)}»: ${n0}% → ${n1}%</span>` : ''), s === 'closed' ? 'ok' : 'info');
    if (s === 'closed') track('task_closed');
    onChange();
  };
  const comments = () => [...COMMENTS_SEED, ...(store.get().comments[key] || [])];
  const cHTML = () => comments().map((c) => `<div class="comment">${avatar(c.who, 36)}<div><div class="comment-bubble"><b>${esc(PEOPLE[c.who]?.name)}</b><small class="faint">${esc(c.ago)}</small><div style="margin-top:6px">${esc(c.text)}</div></div><div class="comment-actions"><button>Ответить</button><button>Ещё</button></div></div></div>`).join('');
  const solHTML = () => { const sol = t().solution; return sol ? `<div class="comment-bubble" style="margin-top:12px"><b>Решение</b><small class="faint">${esc(PEOPLE.anisimov.name)}</small><div style="margin-top:6px;white-space:pre-line">${esc(sol)}</div></div>` : `<form id="solF" style="margin-top:12px"><textarea class="input" placeholder="Опишите решение задачи"></textarea><button class="btn btn-accent" style="margin-top:10px">Отправить решение на проверку</button></form>`; };
  const hHTML = () => HISTORY_SHORT.map(([w, ago, a]) => `<div class="hist-row"><small>${ago}</small><div><div class="who">${avatar(w, 32)}${PEOPLE[w].name}</div><p>${a}</p></div></div>`).join('');
  const person = (pid) => `<span class="person">${avatar(pid, 30)}<span>${PEOPLE[pid]?.name || pid}</span></span>`;
  const x = t(), w = where(x);
  const d = drawer({
    width: 560,
    html: `<div class="drawer-h"><div style="display:flex;align-items:center;gap:6px">${statusPicker()}
        <button class="icon-btn" data-ta="accept" title="Принять решение" aria-label="Принять решение">${icon('circle-check-big', 20)}</button>
        <button class="icon-btn" data-ta="reject" title="Отправить на доработку" aria-label="Отправить на доработку">${icon('x', 20)}</button>
        <button class="icon-btn" data-ta="reopen" title="Переоткрыть" aria-label="Переоткрыть">${icon('refresh-cw', 18)}</button></div>
      <div><button class="icon-btn" data-pop data-ta="more" aria-label="Ещё">${icon('ellipsis', 20)}</button><button class="icon-btn" data-close aria-label="Закрыть">${icon('x', 20)}</button></div></div>
    <div class="drawer-b">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:16px"><h3 style="font-size:var(--fs-h3);font-weight:600">${esc(x.name)}</h3><span class="faint">${esc(String(x.id))}</span></div>
      <dl class="kv task-kv"><dt>Дата начала</dt><dd>${fmt(x.start, true)}</dd>
        <dt>Крайний срок</dt><dd><input type="date" class="input" id="tdue" value="${x.due}" style="height:36px;width:auto"> ${isLate(x) ? '<span class="badge b-danger">просрочена</span>' : ''}</dd>
        <dt>Приоритет</dt><dd><select class="input select" id="tprio" style="height:36px;width:auto">${['Высокий', 'Средний', 'Низкий'].map((p) => `<option ${p === x.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></dd>
        <dt>Проект</dt><dd><a href="#/project/${x.projectId}/overview" data-close>${esc(pname(x.projectId))}</a></dd><dt>Этап</dt><dd>${esc(w.stage)}</dd><dt>Работа</dt><dd><a href="#/project/${x.projectId}/structure?${x.nodeId}" data-close>${esc(w.work)}</a></dd>
        <dt>Постановщик</dt><dd>${person(x.author)}</dd><dt>Ответственный</dt><dd>${person(x.resp)}</dd><dt>Исполнитель</dt><dd>${person(x.exec)}</dd><dt>Наблюдатели</dt><dd>${avatars(x.watchers || [], 30)}</dd></dl>
      <h4 class="dsub">Описание</h4><p style="white-space:pre-line;margin:0">${esc(x.desc || '')}</p>
      <h4 class="dsub">Вложения</h4>
      <div class="attach" id="att"><img src="assets/img/palace.jpg" alt=""><img src="assets/img/cams/cam1.jpg" alt=""><label class="att-up" title="Загрузить">${icon('upload', 22)}<input type="file" hidden multiple id="attF"></label></div>
      <div class="att-files" id="attL">${TASK_FILES.map(([n, ty]) => `<button class="att-file" data-file="${esc(n)}">${docIcon(ty)}<span>${esc(n)}</span></button>`).join('')}</div>
      <div class="seg-tabs"><button class="active" data-seg="c">Комментарии</button><button data-seg="s">Решение</button><button data-seg="h">История изменений</button></div>
      <div id="segBody">${cHTML()}</div>
      <form class="comment-new" id="cform">${avatar('anisimov', 36)}<div class="input-wrap"><input class="input" placeholder="Добавить комментарий"><button class="icon-btn" aria-label="Отправить">${icon('send', 18)}</button></div></form>
    </div>`,
    onMount(el) {
      el.addEventListener('change', (e) => {
        if (e.target.id === 'tdue' && e.target.value) { db.updateTask(id, { due: e.target.value }); toast(`Крайний срок изменён на ${fmt(e.target.value, true)}`, 'ok'); onChange(); }
        if (e.target.id === 'tprio') { db.updateTask(id, { priority: e.target.value }); toast('Приоритет изменён', 'ok'); onChange(); }
      });
      el.addEventListener('click', (e) => {
        if (e.target.closest('#tst')) return popover(e.target.closest('#tst'), Object.entries(TASK_STATUS).map(([k, v]) => ({ label: v.label, check: t().status === k, onClick: () => setSt(k) })), { align: 'left' });
        const a = e.target.closest('[data-ta]')?.dataset.ta;
        if (a === 'accept') return setSt('closed', 'Решение принято, задача закрыта');
        if (a === 'reject') return setSt('work', 'Задача отправлена на доработку');
        if (a === 'reopen') return setSt('open', 'Задача переоткрыта');
        if (a === 'more') return popover(e.target.closest('[data-ta]'), [
          { icon: 'user-plus', label: 'Назначить исполнителем меня', onClick: () => { db.updateTask(id, { exec: 'anisimov' }); toast('Вы назначены исполнителем', 'ok'); onChange(); } },
          '-', { icon: 'trash-2', label: 'Удалить задачу', danger: true, onClick: () => { db.deleteTask(id); d.close(); toast(`Задача «${esc(x.name)}» удалена`); onChange(); } },
        ]);
        const s = e.target.closest('[data-seg]');
        if (s) {
          $$('[data-seg]', el).forEach((b) => b.classList.toggle('active', b === s));
          $('#segBody', el).innerHTML = { c: cHTML, s: solHTML, h: hHTML }[s.dataset.seg]();
          $('#cform', el).classList.toggle('hide', s.dataset.seg !== 'c');
        }
        if (e.target.closest('[data-file]')) toast(`Файл «${esc(e.target.closest('[data-file]').dataset.file)}» открыт для просмотра`);
      });
      el.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.id === 'cform') {
          const i = e.target.querySelector('input'); if (!i.value.trim()) return;
          store.set((s) => ({ comments: { ...s.comments, [key]: [...(s.comments[key] || []), { who: 'anisimov', ago: 'только что', text: i.value.trim() }] } }));
          i.value = ''; $('#segBody', el).innerHTML = cHTML();
        }
        if (e.target.id === 'solF') {
          const v = e.target.querySelector('textarea').value.trim(); if (!v) return;
          db.updateTask(id, { solution: v, status: 'review' });
          $('#segBody', el).innerHTML = solHTML(); el.querySelector('#tst').outerHTML = statusPicker();
          toast('Решение отправлено на проверку', 'ok'); onChange();
        }
      });
      $('#attF', el).onchange = (e) => {
        [...e.target.files].forEach((f) => {
          if (f.type.startsWith('image/')) $('#att', el).insertAdjacentHTML('afterbegin', `<img src="${URL.createObjectURL(f)}" alt="">`);
          else $('#attL', el).insertAdjacentHTML('beforeend', `<button class="att-file">${docIcon(/pdf$/i.test(f.name) ? 'pdf' : /xlsx?$/i.test(f.name) ? 'xls' : 'doc')}<span>${esc(f.name)}</span></button>`);
        });
        toast('Вложения добавлены', 'ok');
      };
    },
  });
  return d;
}

// ---------- Новая задача ----------
export function newTaskModal(onCreated = () => {}, preset = {}) {
  const opts = (arr, sel) => arr.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const people = opts(PEOPLE_PICK.map((id) => [id, PEOPLE[id].name]));
  const ps = projects().filter((p) => p.wbs.children.length);
  const workOpts = (pid) => { const p = project(pid); if (!p) return '<option value="">Сначала выберите проект</option>'; return p.wbs.children.map((s) => `<optgroup label="${esc(s.name)}">${(s.children.length ? leaves(s) : [s]).map((l) => `<option value="${l.id}" ${l.id === preset.nodeId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</optgroup>`).join(''); };
  modal({
    title: 'Новая задача', size: 'lg',
    body: `<form id="ntf" class="form-grid" novalidate>
      <input class="input" name="name" placeholder="Название задачи">
      <select class="input select" name="project"><option value="">Проект</option>${opts(ps.map((p) => [p.id, p.name]), preset.project)}</select>
      <select class="input select full" name="node" aria-label="Этап и работа">${workOpts(preset.project)}</select>
      <label class="date-field">${icon('calendar', 18)}<input class="input" type="date" name="start" aria-label="Дата начала"><span>Дата начала</span></label>
      <label class="date-field">${icon('calendar', 18)}<input class="input" type="date" name="due" aria-label="Крайняя дата"><span>Крайняя дата</span></label>
      <select class="input select" name="resp"><option value="">Ответственный</option>${people}</select>
      <select class="input select" name="exec"><option value="">Исполнитель</option>${people}</select>
      <select class="input select" name="watch"><option value="">Наблюдатель</option>${people}</select>
      <select class="input select" name="priority"><option value="">Приоритет</option>${opts([['Высокий', 'Высокий'], ['Средний', 'Средний'], ['Низкий', 'Низкий']])}</select>
      <textarea class="input full" name="desc" placeholder="Описание"></textarea>
      <label class="dropzone full" id="ntdz" style="padding:20px;cursor:pointer">${icon('upload', 26)}<div style="margin-top:8px">Перетащите сюда файлы. Максимальный размер файла - 500MB</div><u style="color:var(--text);font-weight:600">Загрузить</u><input type="file" hidden multiple></label>
      <div class="err-msg full hide" id="ntErr">Укажите название задачи и проект</div>
      <button class="btn btn-accent btn-block full" id="ntBtn" disabled>Создать задачу</button></form>`,
    onMount(el, m) {
      const f = $('#ntf', el);
      const sync = () => { $('#ntBtn', el).disabled = !(f.name.value.trim() && f.project.value && f.node.value); $$('.date-field', el).forEach((l) => l.classList.toggle('filled', !!l.querySelector('input').value)); };
      f.project.addEventListener('change', () => { f.node.innerHTML = workOpts(f.project.value); });
      f.addEventListener('input', sync); f.addEventListener('change', sync); sync();
      const dz = $('#ntdz', el), fi = dz.querySelector('input');
      const show = (files) => { if (files.length) dz.querySelector('div').textContent = `Прикреплено файлов: ${files.length} (${[...files].map((x) => x.name).join(', ')})`; };
      fi.onchange = () => show(fi.files);
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); show(e.dataTransfer.files); };
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!(f.name.value.trim() && f.project.value && f.node.value)) return $('#ntErr', el).classList.remove('hide');
        const n = findNode(project(f.project.value), f.node.value);
        const t = db.addTask({
          name: f.name.value.trim(), projectId: f.project.value, nodeId: f.node.value, status: 'open',
          start: f.start.value || (n.start > TODAY ? n.start : TODAY), due: f.due.value || (n.end > TODAY ? n.end : TODAY), priority: f.priority.value || 'Средний',
          resp: f.resp.value || 'anisimov', exec: f.exec.value || 'ivanova', watchers: [f.watch.value || 'biryukova'], desc: f.desc.value.trim() || 'Описание не заполнено.',
        });
        m.close(); track('task_created');
        toast(`Задача <b>${esc(t.name)}</b> создана в «${esc(n.name)}». Прогресс работы теперь учитывает и её.`, 'ok'); onCreated(t);
      });
    },
  });
}

export default {
  title: 'Задачи',
  render(ctx) {
    const tab = ctx.params.tab === 'my' ? 'my' : 'all';
    const n = list(tab).length;
    return `<div class="head-row">
      <div class="seg-switch"><a href="#/tasks/all" class="${tab === 'all' ? 'active' : ''}">Все</a><a href="#/tasks/my" class="${tab === 'my' ? 'active' : ''}">Мои</a></div>
      <div class="toolbar" style="margin:0">
        <div class="tool-search">${icon('search', 18)}<input id="tq" placeholder="Поиск по задачам" value="${esc(S.q)}"></div>
        <button class="tool ${S.sort !== 'due' || S.dir < 0 ? 'on' : ''}" data-pop id="tsort">${icon('arrow-up-down', 18)} Сортировка</button>
        <button class="tool ${S.status !== 'all' || S.project !== 'all' ? 'on' : ''}" data-pop id="tfilt">${icon('list-filter', 18)} Фильтр</button>
        <div class="view-toggle"><button data-v="grid" class="${S.view === 'grid' ? 'active' : ''}" aria-label="Плитка">${icon('layout-grid', 18)}</button><button data-v="list" class="${S.view === 'list' ? 'active' : ''}" aria-label="Список">${icon('list', 18)}</button></div>
        <button class="btn btn-accent btn-icon" id="tnew" aria-label="Новая задача" title="Новая задача" data-guide="task">${icon('plus', 20)}</button>
      </div></div>
      <section class="card" style="padding:22px 22px 26px"><h3 class="card-title-lg">${tab === 'my' ? 'Мои задачи' : 'Все задачи'} <span class="faint">${n}</span>
        ${S.status !== 'all' || S.project !== 'all' ? `<button class="chip" id="tclear" style="margin-left:10px">${{ late: 'Просроченные', undone: 'Незавершённые', all: '' }[S.status] ?? TASK_STATUS[S.status]?.label}${S.project !== 'all' ? ' · ' + esc(pname(S.project)) : ''} ${icon('x', 12)}</button>` : ''}</h3><div id="tb">${body(tab)}</div></section>`;
  },
  mount(root, ctx) {
    const tab = ctx.params.tab === 'my' ? 'my' : 'all';
    if (ctx.query && ctx.query.startsWith('f=')) { const q = new URLSearchParams(ctx.query); S.status = q.get('f') || 'all'; S.project = q.get('p') || 'all'; root.firstElementChild.innerHTML = this.render(ctx); }
    const rerender = () => { root.firstElementChild.innerHTML = this.render(ctx); bind(); };
    const redraw = () => { $('#tb', root).innerHTML = body(tab); $('.card-title-lg .faint', root).textContent = list(tab).length; };
    const bind = () => { $('#tq', root).oninput = (e) => { S.q = e.target.value; redraw(); }; };
    bind();
    root.addEventListener('click', (e) => {
      if (e.target.closest('#tnew')) return newTaskModal((t) => { rerender(); taskDrawer(t, redraw); });
      if (e.target.closest('#tmore')) { S.shown += 24; return redraw(); }
      if (e.target.closest('#tclear')) { S.status = 'all'; S.project = 'all'; return rerender(); }
      const so = e.target.closest('#tsort');
      if (so) return popover(so, [['due', 1, 'Крайний срок ↑'], ['due', -1, 'Крайний срок ↓'], ['priority', 1, 'Приоритет'], ['status', 1, 'Статус'], ['name', 1, 'Название']].map(([k, d, l]) => ({ label: l, check: S.sort === k && S.dir === d, onClick: () => { S.sort = k; S.dir = d; rerender(); } })));
      const fi = e.target.closest('#tfilt');
      if (fi) return popover(fi, [{ label: 'Все статусы', check: S.status === 'all', onClick: () => { S.status = 'all'; rerender(); } },
        { label: 'Просроченные', check: S.status === 'late', onClick: () => { S.status = 'late'; rerender(); toast('Фильтр успешно применен', 'ok'); } },
        ...Object.entries(TASK_STATUS).map(([k, v]) => ({ label: v.label, check: S.status === k, onClick: () => { S.status = k; rerender(); toast('Фильтр успешно применен', 'ok'); } })), '-',
        { label: 'Все проекты', check: S.project === 'all', onClick: () => { S.project = 'all'; rerender(); } },
        ...projects().filter((p) => allTasks().some((t) => t.projectId === p.id)).map((p) => ({ label: p.name, check: S.project === p.id, onClick: () => { S.project = p.id; rerender(); toast('Фильтр успешно применен', 'ok'); } }))]);
      const v = e.target.closest('[data-v]'); if (v) { S.view = v.dataset.v; return rerender(); }
      const sc = e.target.closest('[data-sortcol]'); if (sc) { const k = sc.dataset.sortcol; S.dir = S.sort === k ? -S.dir : 1; S.sort = k; return redraw(); }
      const t = e.target.closest('[data-tid]'); if (t) taskDrawer(allTasks().find((x) => String(x.id) === t.dataset.tid), redraw);
    });
    if (ctx.query && !ctx.query.startsWith('f=')) { const t = allTasks().find((x) => String(x.id) === ctx.query); if (t) setTimeout(() => taskDrawer(t, redraw), 50); }
  },
};
