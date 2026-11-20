import { store } from './store.js';
import { WBS as PALACE_WBS, PROJECTS as SEED_PROJECTS, PALACE } from './data.js';

const DAY = 864e5;
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const TODAY = iso(new Date());
export const addDays = (s, n) => { const d = D(s); d.setDate(d.getDate() + Math.round(n)); return iso(d); };
export const diff = (a, b) => Math.round((D(b) - D(a)) / DAY);
export const fmt = (s, long = false) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}.${m}.${long ? y : y.slice(2)}`; };
export const parseRu = (s) => {
  if (!s) return null;
  if (s instanceof Date) return iso(s);
  const t = String(s).trim();
  let m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
export const plural = (n, [a, b, c]) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
export const OFFSET = diff('2023-07-10', TODAY);
export const shiftRu = (s) => String(s).replace(/\b(\d{2})\.(\d{2})\.(\d{4}|\d{2})\b/g, (all, d, m, y) => {
  const out = addDays(`${y.length === 2 ? '20' + y : y}-${m}-${d}`, OFFSET);
  return y.length === 2 ? fmt(out) : fmt(out, true);
});

export const TEMPLATES = {
  mkd: { name: 'Жилой дом (МКД)', stages: [
    ['Этап 1: Исходно-разрешительная документация', 0.04, [['Градостроительный план и ТУ', 0, 0.06], ['Инженерные изыскания', 0.03, 0.08]]],
    ['Этап 2: Проектирование и экспертиза', 0.07, [['Проектная документация', 0.06, 0.16], ['Государственная экспертиза', 0.15, 0.2], ['Рабочая документация', 0.17, 0.3]]],
    ['Этап 3: Подготовка площадки и нулевой цикл', 0.18, [['Ограждение и временные сети', 0.2, 0.23], ['Котлован и шпунт', 0.22, 0.3], ['Фундаментная плита', 0.29, 0.38]]],
    ['Этап 4: Монолитный каркас', 0.3, [['Каркас подземной части', 0.36, 0.45], ['Каркас надземной части', 0.44, 0.66]]],
    ['Этап 5: Кровля, фасад, окна', 0.14, [['Кровля', 0.64, 0.7], ['Навесной фасад', 0.62, 0.8], ['Остекление', 0.66, 0.78]]],
    ['Этап 6: Инженерные системы', 0.15, [['Внутренние сети ВК и ОВ', 0.6, 0.85], ['Электроснабжение и слаботочка', 0.62, 0.86], ['Лифты', 0.78, 0.88]]],
    ['Этап 7: Отделка и благоустройство', 0.1, [['Отделка МОП', 0.82, 0.95], ['Благоустройство территории', 0.85, 0.96]]],
    ['Этап 8: Ввод в эксплуатацию', 0.02, [['Итоговая проверка ГСН', 0.95, 0.98], ['Разрешение на ввод', 0.98, 1]]],
  ] },
  sport: { name: 'Спортивный объект', stages: [
    ['Этап 1: Сбор ИРД', 0.05, [['Предпроектная проработка', 0, 0.06], ['Инженерные изыскания', 0.03, 0.09]]],
    ['Этап 2: Проектирование', 0.1, [['Проектная документация', 0.08, 0.2], ['Экспертиза', 0.18, 0.24], ['Рабочая документация', 0.2, 0.32]]],
    ['Этап 3: Выполнение СМР', 0.7, [['Подготовительные работы', 0.3, 0.36], ['Фундаменты', 0.34, 0.5], ['Металлокаркас и трибуны', 0.48, 0.7], ['Кровля и фасад', 0.66, 0.82], ['Инженерные сети', 0.6, 0.88], ['Спортивное оборудование', 0.82, 0.92]]],
    ['Этап 4: Ввод объекта в эксплуатацию', 0.15, [['Пусконаладочные работы', 0.9, 0.97], ['Получение разрешения на ввод', 0.96, 1]]],
  ] },
  izhs: { name: 'Индивидуальный жилой дом (ИЖС)', stages: [
    ['Проект и разрешения', 0.05, [['Эскизный проект', 0, 0.06], ['Уведомление о начале строительства', 0.05, 0.1]]],
    ['Фундамент', 0.15, [['Разметка и земляные работы', 0.1, 0.15], ['Монолитная плита', 0.14, 0.24]]],
    ['Коробка дома', 0.3, [['Стены первого этажа', 0.24, 0.38], ['Перекрытие', 0.37, 0.42], ['Стены мансарды', 0.41, 0.5]]],
    ['Кровля, окна, двери', 0.15, [['Стропильная система и кровля', 0.5, 0.6], ['Окна и входная дверь', 0.58, 0.64]]],
    ['Инженерия', 0.15, [['Электрика', 0.62, 0.74], ['Отопление и водоснабжение', 0.62, 0.78], ['Септик', 0.7, 0.76]]],
    ['Отделка и благоустройство', 0.2, [['Фасад', 0.74, 0.86], ['Внутренняя отделка', 0.76, 0.96], ['Отмостка и дорожки', 0.9, 1]]],
  ] },
  office: { name: 'Бизнес-центр', stages: [
    ['Этап 1: ИРД и проектирование', 0.08, [['Концепция', 0, 0.06], ['Проектная документация', 0.05, 0.18], ['Экспертиза', 0.16, 0.22]]],
    ['Этап 2: Нулевой цикл', 0.17, [['Котлован', 0.22, 0.3], ['Фундаменты и паркинг', 0.28, 0.42]]],
    ['Этап 3: Каркас', 0.3, [['Монолитный каркас', 0.4, 0.66]]],
    ['Этап 4: Фасад и инженерия', 0.3, [['Светопрозрачный фасад', 0.6, 0.82], ['Инженерные системы', 0.6, 0.88], ['Лифты и эскалаторы', 0.75, 0.88]]],
    ['Этап 5: Отделка и ввод', 0.15, [['Отделка общих зон', 0.84, 0.96], ['Ввод в эксплуатацию', 0.95, 1]]],
  ] },
  ops: { name: 'Эксплуатация объекта', stages: [
    ['Техническое обслуживание', 0.4, [['ТО инженерных систем', 0, 1], ['Ледовое/спортивное оборудование', 0, 1]]],
    ['Коммунальные услуги', 0.3, [['Электроэнергия', 0, 1], ['Тепло и вода', 0, 1]]],
    ['Текущий ремонт', 0.3, [['Ремонт кровли', 0.3, 0.55], ['Ремонт трибун и помещений', 0.5, 0.85]]],
  ] },
  empty: { name: 'Проект с нуля', stages: [['Этап 1', 1, [['Работа 1', 0, 0.5], ['Работа 2', 0.5, 1]]]] },
};

let seq = Date.now() % 1e6;
export const uid = (p = 'n') => p + (seq++).toString(36);

export function fromTemplate(key, start, end, budget) {
  const T = TEMPLATES[key] || TEMPLATES.empty, dur = Math.max(1, diff(start, end));
  return {
    id: uid(), name: 'root', children: T.stages.map(([name, share, subs]) => {
      const w = subs.map(([, a, b]) => Math.max(0.01, b - a)), ws = w.reduce((s, x) => s + x, 0);
      return { id: uid(), name, children: subs.map(([n, a, b], i) => ({
        id: uid(), name: n, start: addDays(start, a * dur), end: addDays(start, b * dur), budget: Math.round(budget * share * (w[i] / ws) / 1e5) * 1e5, progress: 0, auto: true, children: [],
      })) };
    }),
  };
}

export const leaves = (n) => n.children.length ? n.children.flatMap(leaves) : [n];
export function plannedPct(n, at = TODAY) {
  if (at <= n.start) return 0;
  if (at >= n.end) return 100;
  return (diff(n.start, at) / Math.max(1, diff(n.start, n.end))) * 100;
}
export function roll(n, at = TODAY) {
  if (!n.children.length) {
    const ev = n.budget * n.progress / 100;
    return { start: n.start, end: n.end, budget: n.budget, ev, pv: n.budget * plannedPct(n, at) / 100, ac: n.spent ?? ev, progress: n.progress };
  }
  const rs = n.children.map((c) => roll(c, at));
  const r = rs.reduce((a, b) => ({ start: a.start < b.start ? a.start : b.start, end: a.end > b.end ? a.end : b.end, budget: a.budget + b.budget, ev: a.ev + b.ev, pv: a.pv + b.pv, ac: a.ac + b.ac }));
  r.progress = r.budget ? (r.ev / r.budget) * 100 : 0;
  return r;
}
export function status(r) {
  if (r.progress >= 99.95) return 'done';
  if (TODAY < r.start) return 'wait';
  return 'work';
}
export const isOverdue = (r) => r.progress < 99.95 && r.end < TODAY;

function convertPalace(n) {
  const out = { id: n.id, name: n.name, children: n.children.map(convertPalace) };
  if (!n.children.length) {
    Object.assign(out, { start: addDays(parseRu(n.start), OFFSET), end: addDays(parseRu(n.end), OFFSET), budget: n.budget, progress: n.progress, auto: true });
    if (n.name.includes('Фундаменты')) { out.spent = 130000000; out.end = addDays('2023-11-30', OFFSET); }
  }
  return out;
}
function fillProgress(wbs, target) {
  const ls = leaves(wbs).sort((a, b) => (a.end < b.end ? -1 : 1));
  const total = ls.reduce((s, l) => s + l.budget, 0);
  let need = total * target / 100;
  ls.forEach((l) => {
    if (need >= l.budget) { l.progress = 100; need -= l.budget; }
    else { l.progress = Math.round((need / l.budget) * 100 / 20) * 20; need = 0; }
    if (l.progress === 100) l.spent = Math.round(l.budget * (0.97 + ((l.budget / 1e6) % 7) / 100));
  });
}
const ACTIONS = ['Подготовка документации', 'Закупка материалов', 'Выполнение работ', 'Контроль качества', 'Приёмка и исполнительная документация'];
const WHO = ['ivanova', 'ivanov', 'vasiliev', 'krasnoselskikh', 'samoilov', 'vasnetsov', 'anisimov'];
function seedTasks(p, h = 0) {
  const out = [];
  leaves(p.wbs).forEach((l, li) => {
    const n = l.progress > 0 && l.progress < 100 ? 5 : 2 + ((li + h) % 3);
    const closed = Math.round((n * l.progress) / 100);
    const dur = Math.max(1, diff(l.start, l.end));
    for (let i = 0; i < n; i++) {
      const due = addDays(l.start, ((i + 1) / n) * dur);
      const st = i < closed ? 'closed' : due < TODAY ? (i === closed ? 'review' : 'work') : l.start <= TODAY ? (i === closed ? 'work' : 'open') : 'open';
      out.push({
        id: 'T' + p.id.slice(0, 3) + li + '_' + i, projectId: p.id, nodeId: l.id, name: `${ACTIONS[i % ACTIONS.length]}: ${l.name.toLowerCase()}`,
        status: st, start: addDays(l.start, (i / n) * dur), due, priority: ['Высокий', 'Средний', 'Низкий'][(li + i) % 3],
        author: 'anisimov', resp: WHO[(li + i + h) % WHO.length], exec: WHO[(li + i + h + 2) % WHO.length], watchers: [WHO[(li + 3) % WHO.length]],
        desc: 'Выполнить работы согласно рабочей документации и графику производства работ. Результат подтвердить актом и фотофиксацией.',
        closedAt: st === 'closed' ? (due < TODAY ? due : TODAY) : undefined,
      });
    }
  });
  return out;
}
const SEED = {
  dolphin: { t: 'sport', s: -1700, e: -60, b: 1.2e9, pr: 90 }, basket: { t: 'sport', s: -1150, e: -150, b: 0.6e9, pr: 97 },
  library: { t: 'office', s: -1300, e: 160, b: 0.9e9, pr: 70 }, martial: { t: 'sport', s: -1500, e: 120, b: 1.4e9, pr: 84 },
  fok: { t: 'sport', s: -500, e: 380, b: 0.45e9, pr: 50 }, concert: { t: 'office', s: -620, e: 300, b: 1.8e9, pr: 60 },
  swim: { t: 'sport', s: -1400, e: 240, b: 1.1e9, pr: 76 },
};
export function seedDb() {
  const projects = [], tasks = [];
  SEED_PROJECTS.forEach((sp, i) => {
    const p = { id: sp.id, name: sp.name, group: sp.group, city: sp.city, icon: sp.icon, pinned: sp.pinned, since: sp.since, load: sp.load, tickets: sp.tickets,
      desc: sp.id === 'palace' ? PALACE.description : '', factors: sp.id === 'palace' ? PALACE.factors.slice() : ['Рост стоимости строительных материалов', 'Сезонность работ'], team: ['anisimov', 'ivanova', 'ivanov', 'vasiliev'], template: 'sport' };
    if (sp.id === 'palace') { p.wbs = convertPalace(PALACE_WBS); p.photo = 'assets/img/palace.jpg'; }
    else if (sp.group === 'operation') { const y = new Date().getFullYear(); p.wbs = fromTemplate('ops', `${y}-01-01`, `${y}-12-31`, [62e6, 120e6, 45e6, 28e6][i % 4]); fillProgress(p.wbs, Math.round(plannedPct({ start: `${y}-01-01`, end: `${y}-12-31` }) * 0.95)); p.template = 'ops'; }
    else { const c = SEED[sp.id]; p.wbs = fromTemplate(c.t, addDays(TODAY, c.s), addDays(TODAY, c.e), c.b); fillProgress(p.wbs, c.pr); p.template = c.t; }
    projects.push(p);
    tasks.push(...seedTasks(p, i));
  });
  return { version: 3, projects, tasks };
}

export function getDb() {
  let d = store.get().db;
  if (!d || d.version !== 3) { d = seedDb(); store.set({ db: d }); }
  return d;
}
export const projects = () => getDb().projects;
export const project = (id) => projects().find((p) => p.id === id);
export const tasksOf = (pid) => getDb().tasks.filter((t) => !pid || t.projectId === pid);
export const allTasks = () => getDb().tasks;
export function findNode(p, id) { let f = null; (function w(n) { if (n.id === id) f = n; else n.children.forEach(w); })(p.wbs); return f; }
export function parentOf(p, id) { let f = null; (function w(n) { n.children.forEach((c) => { if (c.id === id) f = n; else w(c); }); })(p.wbs); return f; }

export function summary(p) {
  const r = roll(p.wbs);
  const st = p.group === 'operation' ? 'work' : status(r);
  return { ...r, status: st, overdue: p.group !== 'operation' && isOverdue(r), days: diff(r.start, r.end), spi: r.pv > 0 ? r.ev / r.pv : 1, cpi: r.ac > 0 ? r.ev / r.ac : 1 };
}

function commit(mut) {
  const d = structuredClone(getDb());
  mut(d);
  store.set({ db: d });
  return d;
}
const inP = (d, pid) => d.projects.find((p) => p.id === pid);
function recalcLeaf(d, pid, nodeId) {
  const p = inP(d, pid), n = p && findNode(p, nodeId);
  if (!n || n.children.length || n.auto === false) return;
  const ts = d.tasks.filter((t) => t.projectId === pid && t.nodeId === nodeId);
  if (!ts.length) return;
  n.progress = Math.round((ts.filter((t) => t.status === 'closed').length / ts.length) * 100);
  if (n.spent != null && n.progress < 100) delete n.spent;
}
export const db = {
  updateNode(pid, nid, patch) { commit((d) => { const n = findNode(inP(d, pid), nid); if (!n) return; if ('progress' in patch) n.auto = false; Object.assign(n, patch); if (n.start > n.end) n.end = n.start; }); },
  addNode(pid, parentId, data = {}) {
    let id;
    commit((d) => {
      const p = inP(d, pid), par = parentId ? findNode(p, parentId) : p.wbs;
      if (!par.children.length && par !== p.wbs) {
        const { start, end, budget, progress } = par;
        par.children.push({ id: uid(), name: 'Работа 1', start, end, budget, progress, auto: true, children: [] });
        ['start', 'end', 'budget', 'progress', 'auto', 'spent'].forEach((k) => delete par[k]);
      }
      const ref = par.children.length ? roll(par) : { start: TODAY, end: addDays(TODAY, 30) };
      const n = { id: (id = uid()), name: data.name || `Новый этап ${par.children.length + 1}`, start: data.start || ref.end, end: data.end || addDays(data.start || ref.end, 30), budget: +data.budget || 0, progress: +data.progress || 0, auto: true, children: [] };
      par.children.push(n);
    });
    return id;
  },
  deleteNode(pid, nid) { commit((d) => { const p = inP(d, pid), par = parentOf(p, nid); if (!par) return; const ids = leaves(findNode(p, nid)).map((l) => l.id).concat(nid); par.children = par.children.filter((c) => c.id !== nid); d.tasks = d.tasks.filter((t) => !(t.projectId === pid && ids.includes(t.nodeId))); }); },
  shiftNode(pid, nid, days, edge = 'both') {
    commit((d) => {
      const n = findNode(inP(d, pid), nid);
      if (edge === 'end' && !n.children.length) { n.end = addDays(n.end, days); if (n.end < n.start) n.end = n.start; return; }
      leaves(n).forEach((l) => { l.start = addDays(l.start, days); l.end = addDays(l.end, days); });
      d.tasks.filter((t) => t.projectId === pid && leaves(n).some((l) => l.id === t.nodeId)).forEach((t) => { t.start = addDays(t.start, days); t.due = addDays(t.due, days); });
    });
  },
  replaceWbs(pid, wbs) { commit((d) => { const p = inP(d, pid); p.wbs = wbs; d.tasks = d.tasks.filter((t) => t.projectId !== pid); }); },
  addProject({ name, group = 'construction', template = 'mkd', start, end, budget, city, desc, resp, wbs }) {
    const p = { id: uid('p'), name, group, city: city || 'Адрес не указан', desc: desc || '', template, factors: [], team: ['anisimov', resp || 'ivanova'], mine: true, since: new Date().getFullYear(), load: 0, tickets: 0, icon: 'building-2', createdAt: TODAY };
    p.wbs = wbs || fromTemplate(template, start, end, budget || 100e6);
    commit((d) => { d.projects.unshift(p); if (!wbs) d.tasks.push(...seedTasks(p, 1).map((t) => ({ ...t, status: t.status === 'closed' ? 'closed' : 'open' }))); });
    return p.id;
  },
  updateProject(pid, patch) { commit((d) => Object.assign(inP(d, pid), patch)); },
  deleteProject(pid) { commit((d) => { d.projects = d.projects.filter((p) => p.id !== pid); d.tasks = d.tasks.filter((t) => t.projectId !== pid); }); },
  addTask(t) { const task = { id: uid('T'), status: 'open', author: 'anisimov', watchers: [], ...t }; commit((d) => { d.tasks.unshift(task); recalcLeaf(d, task.projectId, task.nodeId); }); return task; },
  updateTask(id, patch) { commit((d) => { const t = d.tasks.find((x) => x.id === id); if (!t) return; Object.assign(t, patch); if (patch.status === 'closed') t.closedAt = TODAY; recalcLeaf(d, t.projectId, t.nodeId); }); },
  deleteTask(id) { commit((d) => { const t = d.tasks.find((x) => x.id === id); d.tasks = d.tasks.filter((x) => x.id !== id); if (t) recalcLeaf(d, t.projectId, t.nodeId); }); },
  reset() { store.set({ db: seedDb() }); },
};

export function taskStats(pid) {
  const ts = tasksOf(pid);
  const done = ts.filter((t) => t.status === 'closed').length;
  const overdue = ts.filter((t) => t.status !== 'closed' && t.due < TODAY).length;
  const inwork = ts.filter((t) => t.status === 'work' || t.status === 'review').length;
  const lastClosed = ts.filter((t) => t.status === 'closed').map((t) => t.closedAt || t.due).sort().pop() || TODAY;
  const endM = D(lastClosed > addDays(TODAY, -60) ? TODAY : lastClosed);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(endM); d.setMonth(endM.getMonth() - 11 + i, 1); return iso(d).slice(0, 7); });
  const activity = months.map((m) => ts.filter((t) => t.status === 'closed' && (t.closedAt || t.due).slice(0, 7) === m).length);
  return { total: ts.length, done, undone: ts.length - done, overdue, inwork, months, activity };
}

export function forecast(p, sc = {}) {
  const pay = sc.pay || 0, price = sc.price || 0, crew = sc.crew || 0;
  const r = roll(p.wbs), T = Math.max(1, diff(r.start, r.end));
  const started = TODAY > r.start, done = r.progress >= 99.95;
  const spi = started && r.pv > 0 ? Math.min(1.5, Math.max(0.3, r.ev / r.pv)) : 1;
  const cpi = r.ac > 0 ? Math.min(1.5, Math.max(0.5, r.ev / r.ac)) : 1;
  let es = 0;
  if (started && !done) { let lo = 0, hi = Math.min(T, diff(r.start, TODAY)); for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (roll(p.wbs, addDays(r.start, mid)).pv <= r.ev) lo = mid; else hi = mid; } es = lo; }
  const at = Math.max(1, diff(r.start, TODAY));
  const spiT = started ? Math.max(0.3, Math.min(1.5, es / at)) : 1;
  const spiFuture = (0.6 * spiT + 0.4) * (1 + (crew / 100) * 0.6);
  const remain = done ? 0 : Math.max(0, T - es) / spiFuture + pay * 0.7;
  const base = started ? TODAY : r.start;
  const fEnd = done ? r.end : started ? addDays(TODAY, remain) : addDays(r.start, T / (1 + (crew / 100) * 0.6) + pay * 0.7);
  const delay = diff(r.end, fEnd);
  const eac = r.ac + ((r.budget - r.ev) / cpi) * (1 + (price / 100) * 0.55) * (1 + Math.max(0, crew) / 100 * 0.18);
  const st = taskStats(p.id);
  const f = [
    { key: 'spi', label: `Темп работ: SPI ${spi.toFixed(2).replace('.', ',')}`, hint: spi < 1 ? `выполнено ${Math.round(r.ev / Math.max(1, r.pv) * 100)}% от планового объёма на сегодня` : 'работы идут по графику или с опережением', v: Math.max(0, Math.min(40, (1 - spi) * 130)) },
    { key: 'cpi', label: `Стоимость работ: CPI ${cpi.toFixed(2).replace('.', ',')}`, hint: cpi < 1 ? `на каждый рубль освоения тратится ${(1 / cpi).toFixed(2).replace('.', ',')} руб.` : 'затраты в пределах бюджета', v: Math.max(0, Math.min(25, (1 - cpi) * 160)) },
    { key: 'tasks', label: `Просроченные задачи: ${st.overdue}`, hint: st.overdue ? 'задачи с истёкшим сроком тормозят следующие работы' : 'просроченных задач нет', v: Math.min(15, st.overdue * 1.8) },
    { key: 'ext', label: `Внешние факторы: ${p.factors?.length || 0}${pay ? ` + задержка оплаты ${pay} дн.` : ''}${price ? ` + рост цен ${price}%` : ''}`, hint: 'поставки, оплаты, нормативы, погода', v: Math.min(20, (p.factors?.length || 0) * 2.5 + pay / 5 + price / 2) },
  ];
  f.unshift({ key: 'delay', label: delay > 0 ? `Прогноз задержки: ${delay} ${plural(delay, ['день', 'дня', 'дней'])}` : 'Прогноз срока: без задержки', hint: delay > 0 ? `окончание ${fmt(fEnd, true)} вместо ${fmt(r.end, true)}` : 'проект укладывается в плановую дату', v: Math.max(0, Math.min(30, (delay / T) * 260)) });
  const risk = done ? 0 : Math.round(Math.min(98, 4 + f.reduce((s, x) => s + x.v, 0)));
  const prob = done ? 0 : Math.round(100 / (1 + Math.exp(-(delay - T * 0.02) / (T * 0.04 + 5))));
  const stages = p.wbs.children.map((s) => {
    const sr = roll(s), sspi = TODAY > sr.start && sr.pv > 0 ? Math.max(0.3, Math.min(1.5, sr.ev / sr.pv)) : 1;
    const sleft = 1 - sr.ev / Math.max(1, sr.budget), sT = Math.max(1, diff(sr.start, sr.end));
    const send = sr.progress >= 99.95 ? sr.end : TODAY > sr.start ? addDays(TODAY, Math.max(sleft * sT, diff(TODAY, sr.end) * sleft) / ((0.6 * sspi + 0.4) * (1 + crew / 100 * 0.6)) + pay * 0.7) : addDays(sr.end, Math.max(0, delay));
    return { id: s.id, name: s.name, end: sr.end, fEnd: send, delay: Math.max(0, diff(sr.end, send)), progress: sr.progress, spi: sspi };
  });
  const pts = [], last = fEnd > r.end ? fEnd : r.end;
  for (let d = r.start; d <= addDays(last, 31); d = addDays(d, 30)) {
    const plan = (roll(p.wbs, d).pv / r.budget) * 100;
    let fact = null, fc = null;
    if (d <= TODAY) fact = plan * (1 - (1 - spi) * (diff(r.start, d) / Math.max(1, diff(r.start, TODAY))));
    if (d >= TODAY) fc = Math.min(100, r.progress + (100 - r.progress) * (diff(TODAY, d) / Math.max(1, diff(TODAY, fEnd))));
    pts.push({ d, plan: Math.min(100, plan), fact: fact == null ? null : Math.min(100, fact), fc });
  }
  return { r, T, spi, cpi, fEnd, delay, eac, over: eac - r.budget, risk, prob, factors: f, stages, pts, done, st };
}
export function recommendations(p, fc) {
  const out = [];
  const worst = [...fc.stages].sort((a, b) => b.delay - a.delay)[0];
  if (fc.delay > 7 && worst) {
    const alt = forecast(p, { crew: 25 });
    out.push({ text: `Усилить «${worst.name}»: +25% численности сокращает задержку проекта с ${fc.delay} до ${Math.max(0, alt.delay)} дн.`, apply: { crew: 25 } });
  }
  if (fc.cpi < 0.98) out.push({ text: `Перерасход по факту: прогноз итоговой стоимости ${Math.round(fc.over / 1e6)} млн руб. сверх бюджета. Проверить закупки и объёмы по актам КС-2.` });
  if (fc.st.overdue) out.push({ text: `Закрыть ${fc.st.overdue} ${plural(fc.st.overdue, ['просроченную задачу', 'просроченные задачи', 'просроченных задач'])} — они блокируют следующие работы по графику.`, go: 'overdue' });
  if ((p.factors || []).some((x) => /оплат/i.test(x))) out.push({ text: 'Согласовать с заказчиком график авансирования: задержка оплаты на 30 дн. добавляет ≈ 21 дн. к сроку.', apply: { pay: 30 } });
  if (!out.length) out.push({ text: 'Проект идёт по плану. Рекомендуем зафиксировать текущий график как базовый план.' });
  return out;
}
