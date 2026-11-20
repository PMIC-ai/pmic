import { icon } from '../icons.js';
import { $, $$, esc, modal, toast, popover, money, printHTML, download } from '../ui.js';
import { bars } from '../charts.js';
import { REPORTS, AUTO_REPORTS } from '../data.js';
import { projects, project, roll, fmt, TODAY } from '../db.js';
import { exportXlsx, wbsRows } from '../excel.js';
import { track } from '../analytics.js';
import { store } from '../store.js';

const S = { sort: 'default', filter: 'all' };
const thumb = (name, i, auto, own) => `<div class="rep ${auto ? 'auto' : ''}" role="button" tabindex="0" data-rep="${esc(name)}" data-own="${own ? 1 : ''}">
  <div class="rep-thumb">${i % 3 === 1 ? '<div class="blk" style="height:20%"></div><div class="blk" style="height:50%"></div>' : '<div class="blk"></div>' + '<div class="ln"></div>'.repeat(5)}
  <button class="icon-btn more" data-pop data-rmore="${esc(name)}" aria-label="Действия">${icon('ellipsis-vertical', 16)}</button></div><p title="${esc(name)}">${esc(name)}</p></div>`;
const newTile = (auto) => `<button class="rep rep-new" data-new="${auto ? 'auto' : 'manual'}"><div class="rep-thumb">${icon('plus', 42)}</div><p>Новый отчет</p></button>`;

function sorted(arr) {
  let a = arr.filter((n) => S.filter === 'all' || (S.filter === 'fin' ? /прибыл|баланс|финанс|денеж/i.test(n) : !/прибыл|баланс|финанс|денеж/i.test(n)));
  if (S.sort === 'name') a = [...a].sort((x, y) => x.localeCompare(y, 'ru'));
  return a;
}

function reportData(opts = {}) {
  const p = project(opts.projectId) || projects().find((x) => x.name === opts.project) || project('palace') || projects()[0];
  const r = roll(p.wbs);
  const rows = p.wbs.children.map((s) => { const sr = roll(s); return [s.name, sr.budget, sr.ac, sr.budget - sr.ac, Math.round(sr.progress)]; });
  return { p, r, rows };
}
function reportDoc(name, opts = {}) {
  const { p, r, rows } = reportData(opts), period = opts.period || 'С начала проекта';
  return `<div class="report-doc"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div style="color:#4081E1;font-weight:700">PMIC</div><h2 style="font-size:20px;margin:6px 0 2px">${esc(name)}</h2><div style="color:#667">Проект: ${esc(p.name)} · Период: ${esc(period)}</div></div><div style="color:#667;font-size:12px">Сформирован ${new Date().toLocaleString('ru-RU')}</div></div>
    <table><tr><th>Этап</th><th class="num">План, руб</th><th class="num">Факт, руб</th><th class="num">Остаток</th><th class="num">Готовность</th></tr>
    ${rows.map(([n, b, a, o, pr]) => `<tr><td>${esc(n)}</td><td class="num">${money(b)}</td><td class="num">${money(a)}</td><td class="num">${money(o)}</td><td class="num">${pr}%</td></tr>`).join('')}
    <tr><th>Итого</th><th class="num">${money(r.budget)}</th><th class="num">${money(r.ac)}</th><th class="num">${money(r.budget - r.ac)}</th><th class="num">${Math.round(r.progress)}%</th></tr></table>
    <p style="color:#667;font-size:12px;margin-top:12px">Данные на ${fmt(TODAY, true)}. Сроки проекта: ${fmt(r.start, true)} – ${fmt(r.end, true)}.</p></div>`;
}
function openReport(name, opts = {}) {
  const html = reportDoc(name, opts);
  modal({
    title: name, size: 'xl', body: html,
    footer: `<button class="btn btn-outline" data-xlsx>${icon('download', 18)} Скачать Excel</button><button class="btn btn-accent" data-print>${icon('printer', 18)} Печать / PDF</button>`,
    onMount(el) {
      el.querySelector('[data-print]').onclick = () => printHTML(html, name);
      el.querySelector('[data-xlsx]').onclick = () => { const { p, rows } = reportData(opts); exportXlsx(`${name}.xlsx`, [{ name: 'Отчёт', rows: [['Этап', 'План, руб', 'Факт, руб', 'Остаток, руб', 'Готовность, %'], ...rows.map(([n, b, a, o, pr]) => [n, Math.round(b), Math.round(a), Math.round(o), pr])] }, { name: 'Структура', rows: wbsRows(p) }]).then(() => { toast('Отчёт выгружен в Excel', 'ok'); track('excel_export'); }); };
    },
  });
}

function newReport(auto, redraw) {
  modal({
    title: auto ? 'Новый автоматический отчет' : 'Новый отчет', size: 'md',
    body: `<form id="rf" class="form-grid">
      <div class="field full"><label>Название</label><input class="input" name="name" placeholder="Например, Отчет о реализации проекта" required></div>
      <div class="field"><label>Тип</label><select class="input select" name="type"><option>Финансовый</option><option>Сроки и график</option><option>Риски</option><option>Сводный</option></select></div>
      <div class="field"><label>Проект</label><select class="input select" name="project">${projects().map((p) => `<option value="${p.id}" ${p.id === 'palace' ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      ${auto ? `<div class="field"><label>Периодичность</label><select class="input select" name="period"><option>Еженедельно (пн, 09:00)</option><option>Ежемесячно (1-е число)</option><option>Ежеквартально</option></select></div>
      <div class="field"><label>Получатели</label><input class="input" name="to" value="anisimov@mail.ru"></div>` : `<div class="field full"><label>Период</label><select class="input select" name="period"><option>3 квартал 2023</option><option>2 квартал 2023</option><option>2023 год</option><option>С начала проекта</option></select></div>`}
      <button class="btn btn-accent btn-block full" style="margin-top:8px">${auto ? 'Настроить' : 'Сформировать'}</button></form>`,
    onMount(el, m) {
      $('#rf', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        const name = f.name.trim() || 'Новый отчет';
        store.set((s) => ({ reports: [...s.reports, { name, auto, projectId: f.project, period: f.period }] }));
        m.close(); redraw();
        if (auto) toast(`Автоматический отчет «${esc(name)}» настроен: ${esc(f.period.toLowerCase())}`, 'ok');
        else openReport(name, { projectId: f.project, period: f.period });
      });
    },
  });
}

export default {
  title: 'Отчеты',
  render() {
    const own = store.get().reports;
    const manual = [...own.filter((r) => !r.auto).map((r) => r.name), ...sorted(REPORTS)];
    const auto = [...own.filter((r) => r.auto).map((r) => r.name), ...sorted(AUTO_REPORTS)];
    const ownNames = new Set(own.map((r) => r.name));
    return `<div class="toolbar">
        <button class="tool ${S.sort !== 'default' ? 'on' : ''}" data-pop id="rs">${icon('arrow-up-down', 18)} Сортировка</button>
        <button class="tool ${S.filter !== 'all' ? 'on' : ''}" data-pop id="rfilt">${icon('list-filter', 18)} Фильтр</button></div>
      <div class="card" style="padding:26px 28px">
        <div class="rep-grid">${newTile(false)}${manual.map((n, i) => thumb(n, i, false, ownNames.has(n))).join('')}</div>
        <h3 style="font-size:16px;font-weight:600;margin:30px 0 16px">Автоматические отчеты</h3>
        <div class="rep-grid">${newTile(true)}${auto.map((n, i) => thumb(n, i, true, ownNames.has(n))).join('')}</div>
      </div>`;
  },
  mount(root) {
    const redraw = () => { root.firstElementChild.innerHTML = this.render(); };
    root.addEventListener('click', (e) => {
      if (e.target.closest('#rs')) return popover(e.target.closest('#rs'), [['default', 'По умолчанию'], ['name', 'По названию']].map(([k, v]) => ({ label: v, check: S.sort === k, onClick: () => { S.sort = k; redraw(); } })));
      if (e.target.closest('#rfilt')) return popover(e.target.closest('#rfilt'), [['all', 'Все отчёты'], ['fin', 'Финансовые'], ['other', 'Проектные']].map(([k, v]) => ({ label: v, check: S.filter === k, onClick: () => { S.filter = k; redraw(); } })));
      const nw = e.target.closest('[data-new]'); if (nw) return newReport(nw.dataset.new === 'auto', redraw);
      const more = e.target.closest('[data-rmore]');
      if (more) {
        const name = more.dataset.rmore, own = more.closest('[data-own]')?.dataset.own;
        return popover(more, [
          { icon: 'eye', label: 'Открыть', onClick: () => openReport(name) },
          { icon: 'printer', label: 'Печать', onClick: () => printHTML(reportDoc(name), name) },
          ...(own ? ['-', { icon: 'x', label: 'Удалить', danger: true, onClick: () => { store.set((s) => ({ reports: s.reports.filter((r) => r.name !== name) })); redraw(); toast('Отчет удален'); } }] : []),
        ]);
      }
      const r = e.target.closest('[data-rep]'); if (r) openReport(r.dataset.rep, store.get().reports.find((x) => x.name === r.dataset.rep));
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-rep]')) e.target.click(); });
  },
};
