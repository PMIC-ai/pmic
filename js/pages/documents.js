import { icon } from '../icons.js';
import { $, esc, avatar, docIcon, docStatus, popover } from '../ui.js';
import { DOC_NAMES, PROJECTS, APPROVALS } from '../data.js';
import { docDrawer, setStatus, fakeDownload, statusOf } from './project-tabs.js';

const TABS = [['approved', 'Согласованные', 'Согласован'], ['rejected', 'Несогласованные', 'Отклонен'], ['pending', 'Ожидание', 'Ожидание']];
const S = { sort: 'date', project: 'all' };
const projNames = PROJECTS.filter((p) => p.group === 'construction').map((p) => p.name);

// 55 документов: 39 согласованных, 6 отклонённых, 10 на согласовании
const DOCS = (() => {
  const out = [];
  const push = (status, n, offset) => {
    for (let i = 0; i < n; i++) {
      const [name, type, pages, tag] = DOC_NAMES[(i + offset) % DOC_NAMES.length];
      const day = String(1 + ((i * 3 + offset) % 27)).padStart(2, '0');
      out.push({ id: `D${status[0]}${i}`, name, type, pages, tag, date: `${day}.07.2023`, time: ['11:37', '13:21', '08:21', '09:35', '14:21'][i % 5], kind: ['Односторонний', 'Двусторонний', 'Трехсторонний'][i % 3], status, by: i % 3 === 0 ? 'anisimov' : 'ivanova', access: ['ivanova', 'ivanov'], project: projNames[Math.floor(i / 2) % projNames.length] });
    }
  };
  push('Согласован', 39, 0); push('Отклонен', 6, 2);
  APPROVALS.forEach((a, i) => out.push({ id: 'DA' + i, name: a.name, type: a.type, pages: 2 + i, date: a.due, time: '10:00', kind: 'Двусторонний', status: 'Ожидание', by: 'biryukova', access: ['anisimov', 'ivanova'], project: projNames[i % projNames.length] }));
  push('Ожидание', 3, 5);
  return out;
})();

function list(status) {
  let a = DOCS.filter((d) => statusOf(d) === status && (S.project === 'all' || d.project === S.project));
  const k = (d) => d.date.split('.').reverse().join('') + d.time;
  a.sort(S.sort === 'name' ? (x, y) => x.name.localeCompare(y.name, 'ru') : (x, y) => k(y).localeCompare(k(x)));
  return a;
}
function tableHTML(tab) {
  const status = TABS.find((t) => t[0] === tab)[2];
  const rows = list(status);
  if (!rows.length) return `<div class="empty">${icon('file-text', 28)}<p>Документов нет</p></div>`;
  return `<div class="table-wrap"><table class="tbl hover cards"><thead><tr><th>Название</th><th>Дата</th><th>Проект</th><th>Статус</th><th>Создатель</th><th></th></tr></thead><tbody>
    ${rows.map((d) => `<tr data-id="${d.id}"><td class="first"><div class="doc-name">${docIcon(d.type)}<div style="min-width:0"><b title="${esc(d.name)}">${esc(d.name)}</b><span class="sub">${d.tag ? d.tag + ' | ' : ''}${d.pages} стр</span></div></div></td>
      <td data-label="Дата">${d.date}<span class="sub">${d.time}</span></td><td data-label="Проект">${esc(d.project)}</td><td data-label="Статус">${docStatus(statusOf(d))}</td>
      <td data-label="Создатель"><span class="person">${avatar(d.by, 28)}<span>${({ anisimov: 'Анисимов А.В.', ivanova: 'Иванова Е.В.', biryukova: 'Бирюкова А.П.' })[d.by]}</span></span></td>
      <td class="w-actions"><button class="icon-btn" data-pop data-more="${d.id}" aria-label="Действия">${icon('ellipsis', 18)}</button></td></tr>`).join('')}</tbody></table></div>`;
}

export default {
  title: 'Документы',
  render(ctx) {
    const tab = TABS.some((t) => t[0] === ctx.params.tab) ? ctx.params.tab : 'approved';
    const count = (s) => DOCS.filter((d) => statusOf(d) === s).length;
    return `<div class="head-row">
      <nav class="tabs">${TABS.map(([k, v, s]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/documents/${k}">${v} ${k === 'rejected' ? `<span class="nav-count">${count(s)}</span>` : `(${count(s)})`}</a>`).join('')}</nav>
      <div class="toolbar" style="margin:0"><button class="tool ${S.sort !== 'date' ? 'on' : ''}" data-pop id="dsort">${icon('arrow-up-down', 18)} Сортировка</button><button class="tool ${S.project !== 'all' ? 'on' : ''}" data-pop id="dfilt">${icon('list-filter', 18)} Фильтр</button></div></div>
      <div class="card" style="padding:22px 26px" id="dt">${tableHTML(tab)}</div>`;
  },
  mount(root, ctx) {
    const rerender = () => { root.firstElementChild.innerHTML = this.render(ctx); };
    root.addEventListener('click', (e) => {
      const so = e.target.closest('#dsort'); if (so) return popover(so, [['date', 'По дате'], ['name', 'По названию']].map(([k, v]) => ({ label: v, check: S.sort === k, onClick: () => { S.sort = k; rerender(); } })));
      const fi = e.target.closest('#dfilt'); if (fi) return popover(fi, [['all', 'Все проекты'], ...projNames.map((n) => [n, n])].map(([k, v]) => ({ label: v, check: S.project === k, onClick: () => { S.project = k; rerender(); } })));
      const m = e.target.closest('[data-more]');
      if (m) {
        const d = DOCS.find((x) => x.id === m.dataset.more);
        return popover(m, [
          { icon: 'eye', label: 'Открыть', onClick: () => docDrawer(d, rerender) },
          { icon: 'check', label: 'Согласовать', onClick: () => { setStatus(d, 'Согласован'); rerender(); } },
          { icon: 'x', label: 'Отклонить', onClick: () => { setStatus(d, 'Отклонен'); rerender(); } },
          { icon: 'download', label: 'Скачать', onClick: () => fakeDownload(d) },
        ]);
      }
      const r = e.target.closest('[data-id]'); if (r) docDrawer(DOCS.find((x) => x.id === r.dataset.id), rerender);
    });
  },
};
