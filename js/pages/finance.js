import { icon } from '../icons.js';
import { $, esc, money, avatar, popover, toast, nav, table, mln } from '../ui.js';
import { gauge, bars, pie, legend } from '../charts.js';
import { PEOPLE, INVOICES } from '../data.js';
import { store } from '../store.js';
import { projects, project, roll, leaves, fmt, TODAY, addDays, forecast } from '../db.js';
import { invoicesTab } from './project-tabs.js';
import { exportXlsx } from '../excel.js';

const FS = { open: {}, art: 'all', sort: 'date' };
const TABS = [['budget', 'Бюджет проекта'], ['transactions', 'Транзакции'], ['dashboard', 'Панель управления'], ['invoices', 'Счета']];
const COLORS = ['var(--primary)', 'var(--green)', 'var(--red)', 'var(--yellow)', 'var(--sky)', 'var(--accent)', '#8E6CDB', '#2FA4A9'];
const pick = (id) => project(id || 'palace') || projects()[0];

function stages(p) {
  return p.wbs.children.map((s) => { const r = roll(s); return { id: s.id, name: s.name, budget: r.budget, spent: r.ac, ev: r.ev, children: (s.children.length ? s.children : [s]).map((c) => { const cr = roll(c); return { name: c.name, budget: cr.budget, spent: cr.ac }; }) }; });
}
// Транзакции выводятся из данных проекта: оплата закрытых работ и авансы по счетам
function transactions(p) {
  const tx = [];
  const who = ['vasiliev', 'ivanova', 'ivanov', 'krasnoselskikh'];
  leaves(p.wbs).forEach((l, i) => {
    const r = roll(l); if (r.ac <= 0) return;
    const date = l.progress >= 100 ? (l.end < TODAY ? l.end : TODAY) : addDays(TODAY, -((i * 7) % 40) - 1);
    tx.push({ who: who[i % 4], date, desc: `${l.progress >= 100 ? 'Закрытие работ' : 'Промежуточная оплата'}: ${l.name}`, art: l.progress >= 100 ? 'Закрытие работ' : 'Оплата по КС-2', sum: r.ac });
  });
  if (p.id === 'palace') INVOICES.filter((i) => store.get().paid[i.id]).forEach((i) => tx.push({ who: 'anisimov', date: TODAY, desc: i.purpose, art: 'Аванс', sum: i.sum }));
  return tx;
}

function budgetTab(p) {
  const st = stages(p), r = roll(p.wbs);
  return `<div class="card" style="padding:24px 26px">
    <div class="fin-kpis"><div class="fin-kpi"><small>Бюджет проекта (план)</small><b>${money(r.budget)} руб.</b></div><div class="fin-kpi"><small>Расходы</small><b>${money(r.ac)} руб.</b></div><div class="fin-kpi"><small>Остаток</small><b class="${r.budget - r.ac >= 0 ? 'ok-t' : 'danger-t'}">${money(r.budget - r.ac)} руб.</b></div></div>
    <div class="table-wrap tree"><table class="tbl"><thead><tr><th style="width:60px">№</th><th>Название</th><th class="num">Бюджет план (руб)</th><th class="num">Расходы (руб)</th><th class="num">Остаток (руб)</th></tr></thead><tbody>
    ${st.map((s, i) => { const open = FS.open[p.id + i] ?? i < 2; return `<tr class="stage ${open ? '' : 'closed'}" data-fst="${i}"><td>${i + 1}</td><td><div class="tname"><span class="tw">${icon('chevron-down', 14)}</span><span>${esc(s.name)}</span></div></td><td class="num">${money(s.budget)}</td><td class="num">${money(s.spent)}</td><td class="num ${s.budget - s.spent < 0 ? 'danger-t' : ''}">${money(s.budget - s.spent)}</td></tr>
      ${open ? s.children.map((c, j) => `<tr class="leaf"><td>${i + 1}.${j + 1}</td><td style="padding-left:40px"><span title="${esc(c.name)}">${esc(c.name.length > 48 ? c.name.slice(0, 48) + '…' : c.name)}</span></td><td class="num">${money(c.budget)}</td><td class="num">${money(c.spent)}</td><td class="num ${c.budget - c.spent < 0 ? 'danger-t' : ''}">${money(c.budget - c.spent)}</td></tr>`).join('') : ''}`; }).join('')}
    </tbody></table></div></div>`;
}

function txList(p) {
  let tx = transactions(p);
  if (FS.art !== 'all') tx = tx.filter((t) => t.art === FS.art);
  return tx.sort(FS.sort === 'sum' ? (a, b) => b.sum - a.sum : (a, b) => (a.date < b.date ? 1 : -1));
}
function txTab(p) {
  const rows = txList(p);
  return `<div class="card" style="padding:20px 24px">${rows.length ? table({
    cls: 'cards', rows,
    cols: [
      { label: '№', render: (_, i) => i + 1 }, { label: 'Ответственный', cls: 'first', render: (t) => `<span class="person">${avatar(t.who, 28)}<span>${PEOPLE[t.who].name}</span></span>` },
      { label: 'Дата', render: (t) => `${fmt(t.date, true)}<span class="sub">10:15</span>` }, { label: 'Описание', render: (t) => `<span style="display:block;max-width:340px;text-align:inherit">${esc(t.desc)}</span>` },
      { label: 'Тип', render: () => 'Расход' }, { label: 'Статья', render: (t) => t.art }, { label: 'Сумма', cls: 'num', render: (t) => `<span class="fin-amount">- ${money(t.sum)} руб</span>` },
    ],
  }) : `<div class="empty">${icon('wallet', 26)}<p>Расходов пока нет — они появятся, когда по работам будет выполнение</p></div>`}</div>`;
}

function dashTab(p) {
  const st = stages(p), r = roll(p.wbs), fc = forecast(p);
  const plan = r.budget, fact = r.ac;
  const adv = p.id === 'palace' ? 1150000000 + INVOICES.filter((i) => store.get().paid[i.id]).reduce((s, i) => s + i.sum, 0) : plan * 0.3;
  const short = st.map((s) => s.name.replace(/^Этап \d+:\s*/, ''));
  const k = st.map((s) => Math.round(s.spent / 1000));
  return `<div class="fin-dash">
    <section class="card"><div class="card-h"><h3>Бюджет проекта</h3></div><div class="gauge-row"><div>${gauge(fact, plan, { color: 'var(--yellow)' })}<div class="gauge-scale"><span>0,00 млн</span><span>${mln(plan)}</span></div></div>
      <dl><dt>Факт (руб.)</dt><dd>${money(fact)}</dd><dt>План (руб.)</dt><dd>${money(plan)}</dd><dt>Остаток (руб.)</dt><dd>${money(plan - fact)}</dd><dt>Прогноз итога (AI)</dt><dd class="${fc.over > 0 ? 'danger-t' : 'ok-t'}">${money(fc.eac)}</dd></dl></div></section>
    <section class="card"><div class="card-h"><h3>Аванс</h3></div><div class="gauge-row"><div>${gauge(adv, plan, { color: 'var(--accent)' })}<div class="gauge-scale"><span>0,00 млн</span><span>${mln(plan)}</span></div></div>
      <dl><dt>Аванс (руб.)</dt><dd>${money(adv)}</dd><dt>Бюджет план (руб.)</dt><dd>${money(plan)}</dd><dt>Остаток (руб.)</dt><dd>${money(plan - adv)}</dd></dl></div></section>
    <section class="card s3"><div class="card-h"><h3>Факт расходы по этапам (тыс. руб.)</h3></div>${bars(k, st.map((_, i) => String(i + 1)), { w: 300, h: 260, max: Math.max(1, ...k) * 1.25, ticks: [], showValues: true, color: 'var(--primary)', fmt: (v) => money(v) })}</section>
    <section class="card s3"><div class="card-h"><h3>План/факт расходы на этапы</h3></div><div class="pf-bars">${st.map((s, i) => { const pct = s.budget ? Math.round((s.spent / s.budget) * 100) : 0; const c = COLORS[i % COLORS.length]; return `<div><div class="pf-h"><span>${esc(short[i])}</span><b>${pct}%</b></div><div class="pbar" style="background:color-mix(in srgb, ${c} 14%, transparent)"><span style="width:${Math.min(100, pct)}%;background:${c}"></span></div></div>`; }).join('')}</div></section>
    <section class="card s5"><div class="card-h"><h3>Соотношение расходов по этапам</h3></div><div class="pie-row">${fact > 0 ? pie(st.map((s, i) => ({ label: short[i], value: s.spent, color: COLORS[i % COLORS.length] }))) : '<div class="empty">Расходов пока нет</div>'}${legend(st.map((s, i) => ({ label: `${short[i]} — ${fact ? Math.round((s.spent / fact) * 100) : 0}%`, color: COLORS[i % COLORS.length] })))}</div></section>
  </div>`;
}

export default {
  title: (ctx) => pick(ctx.params.id)?.name || 'Финансы',
  back: () => '#/dashboard',
  render(ctx) {
    const p = pick(ctx.params.id);
    const tab = TABS.some(([k]) => k === ctx.params.tab) ? ctx.params.tab : 'budget';
    const n = INVOICES.filter((i) => !store.get().paid[i.id]).length;
    const body = { budget: () => budgetTab(p), transactions: () => txTab(p), dashboard: () => dashTab(p), invoices: () => `<div id="tabBody">${invoicesTab.render()}</div>` }[tab]();
    return `<div class="head-row">
      <nav class="tabs">${TABS.map(([k, v]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/finance/${p.id}/${k}">${v}${k === 'invoices' && n ? ` <span class="nav-count">${n}</span>` : ''}</a>`).join('')}</nav>
      <div class="toolbar" style="margin:0">
        <button class="tool" data-pop id="fproj">${icon('folder-kanban', 18)} ${esc(p.name)} ${icon('chevron-down', 14)}</button>
        ${tab === 'transactions' ? `<button class="tool ${FS.sort !== 'date' ? 'on' : ''}" data-pop id="fsort">${icon('arrow-up-down', 18)} Сортировка</button><button class="tool ${FS.art !== 'all' ? 'on' : ''}" data-pop id="ffilt">${icon('list-filter', 18)} Фильтр</button>` : ''}
        <button class="tool" id="fxlsx">${icon('download', 18)} Excel</button>
      </div></div>${body}`;
  },
  mount(root, ctx) {
    const p = pick(ctx.params.id);
    const tab = ctx.params.tab || 'budget';
    const rerender = () => { root.firstElementChild.innerHTML = this.render(ctx); };
    const h = (e) => {
      const s = e.target.closest('[data-fst]'); if (s) { const k = p.id + s.dataset.fst; FS.open[k] = !(FS.open[k] ?? +s.dataset.fst < 2); return rerender(); }
      const t = e.target.closest('button[id]'); if (!t) return;
      if (t.id === 'fproj') popover(t, projects().map((x) => ({ label: x.name, check: x.id === p.id, onClick: () => nav(`finance/${x.id}/${tab}`) })), { align: 'left' });
      if (t.id === 'fsort') popover(t, [['date', 'По дате'], ['sum', 'По сумме']].map(([k, v]) => ({ label: v, check: FS.sort === k, onClick: () => { FS.sort = k; rerender(); } })));
      if (t.id === 'ffilt') popover(t, [['all', 'Все статьи'], ...[...new Set(transactions(p).map((x) => x.art))].map((a) => [a, a])].map(([k, v]) => ({ label: v, check: FS.art === k, onClick: () => { FS.art = k; rerender(); } })));
      if (t.id === 'fxlsx') exportFin(p);
    };
    root.addEventListener('click', h);
    let extra = null;
    if (tab === 'invoices') extra = invoicesTab.mount(root, p, rerender);
    return () => { root.removeEventListener('click', h); extra && extra(); };
  },
};

function exportFin(p) {
  const st = stages(p);
  const rows = [['№', 'Название', 'Бюджет план, руб', 'Расходы, руб', 'Остаток, руб']];
  st.forEach((s, i) => { rows.push([`${i + 1}`, s.name, Math.round(s.budget), Math.round(s.spent), Math.round(s.budget - s.spent)]); s.children.forEach((c, j) => rows.push([`${i + 1}.${j + 1}`, c.name, Math.round(c.budget), Math.round(c.spent), Math.round(c.budget - c.spent)])); });
  const tx = [['Дата', 'Описание', 'Статья', 'Ответственный', 'Сумма, руб'], ...transactions(p).map((t) => [fmt(t.date, true), t.desc, t.art, PEOPLE[t.who].name, -Math.round(t.sum)])];
  exportXlsx(`PMIC_${p.name}_финансы.xlsx`, [{ name: 'Бюджет', rows }, { name: 'Транзакции', rows: tx }]).then(() => toast('Финансы выгружены в Excel', 'ok'));
}
