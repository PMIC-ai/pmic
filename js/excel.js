import { uid, parseRu, addDays, TODAY, leaves, roll, fmt } from './db.js';

let loading = null;
export function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return (loading ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/sheetjs/xlsx.mini.min.js';
    s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Не удалось загрузить модуль Excel'));
    document.head.appendChild(s);
  }));
}

export async function exportXlsx(filename, sheets) {
  const X = await loadXLSX();
  const wb = X.utils.book_new();
  sheets.forEach((sh) => {
    const ws = X.utils.aoa_to_sheet(sh.rows);
    ws['!cols'] = (sh.widths || sh.rows[0].map((_, i) => Math.min(60, Math.max(10, ...sh.rows.map((r) => String(r[i] ?? '').length + 2))))).map((w) => ({ wch: w }));
    X.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  });
  X.writeFile(wb, filename);
}

export function wbsRows(p) {
  const rows = [['Код', 'Уровень', 'Название', 'Начало', 'Окончание', 'Бюджет, руб', '% выполнения', 'Освоено, руб', 'Факт затрат, руб']];
  const walk = (n, depth, code) => n.children.forEach((c, i) => {
    const r = roll(c), cd = code ? `${code}.${i + 1}` : `${i + 1}`;
    rows.push([cd, depth, c.name, fmt(r.start, true), fmt(r.end, true), Math.round(r.budget), Math.round(r.progress), Math.round(r.ev), Math.round(r.ac)]);
    walk(c, depth + 1, cd);
  });
  walk(p.wbs, 1, '');
  return rows;
}

export async function downloadTemplate() {
  const s = addDays(TODAY, 14), d = (n) => fmt(addDays(s, n), true);
  await exportXlsx('PMIC_шаблон_графика.xlsx', [{ name: 'График', rows: [
    ['Код', 'Название', 'Начало', 'Окончание', 'Бюджет, руб', '% выполнения'],
    ['1', 'Подготовительный период', d(0), d(45), '', ''],
    ['1.1', 'Ограждение и временные сети', d(0), d(20), 4500000, 0],
    ['1.2', 'Геодезическая разбивка', d(10), d(45), 1200000, 0],
    ['2', 'Нулевой цикл', d(40), d(160), '', ''],
    ['2.1', 'Котлован', d(40), d(90), 26000000, 0],
    ['2.2', 'Фундаментная плита', d(85), d(160), 48000000, 0],
    ['3', 'Каркас', d(150), d(330), '', ''],
    ['3.1', 'Монолитный каркас 1–5 этаж', d(150), d(240), 62000000, 0],
    ['3.2', 'Монолитный каркас 6–12 этаж', d(235), d(330), 71000000, 0],
  ] }]);
}

export async function readRows(file) {
  const X = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = X.read(buf, { type: 'array', cellDates: true, raw: false, codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
}

const H = {
  name: /назв|наимен|работ|задач|этап|name|task/i, code: /^(код|№|wbs|n|номер|id|outline)/i, level: /уров|level|вложен/i,
  start: /нач|start|begin/i, end: /оконч|конец|финиш|finish|end|срок/i, budget: /бюдж|стоим|сумм|cost|budget|руб/i, progress: /%|выполн|готов|progress|complete/i,
};
const num = (v) => { if (typeof v === 'number') return v; const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const dateOf = (v) => v instanceof Date ? parseRu(v) : typeof v === 'number' ? addDays('1899-12-30', v) : parseRu(v);

export function parseSchedule(rows) {
  const hi = rows.findIndex((r) => r.some((c) => H.name.test(String(c))) && r.some((c) => H.start.test(String(c))));
  if (hi < 0) throw new Error('Не нашли заголовки. Нужны колонки «Название», «Начало», «Окончание» (остальные — по желанию).');
  const head = rows[hi].map((c) => String(c).trim());
  const col = {};
  Object.entries(H).forEach(([k, re]) => { const i = head.findIndex((h, j) => re.test(h) && !Object.values(col).includes(j)); if (i >= 0) col[k] = i; });
  if (col.name == null) throw new Error('Нет колонки с названием работ.');
  const items = [];
  rows.slice(hi + 1).forEach((r) => {
    const raw = String(r[col.name] ?? ''); const name = raw.trim(); if (!name) return;
    let level = 1;
    const code = col.code != null ? String(r[col.code]).trim() : '';
    if (col.level != null && num(r[col.level])) level = num(r[col.level]);
    else if (/^\d+(\.\d+)*\.?$/.test(code)) level = code.replace(/\.$/, '').split('.').length;
    else { const m = raw.match(/^\s+/); level = m ? 1 + Math.floor(m[0].length / 2) : 1; }
    items.push({ level, name, start: col.start != null ? dateOf(r[col.start]) : null, end: col.end != null ? dateOf(r[col.end]) : null, budget: col.budget != null ? num(r[col.budget]) : 0, progress: col.progress != null ? Math.max(0, Math.min(100, num(r[col.progress]) * (num(r[col.progress]) <= 1 && String(r[col.progress]).includes('.') ? 100 : 1))) : 0 });
  });
  if (!items.length) throw new Error('В файле нет строк с работами.');
  const root = { id: uid(), name: 'root', children: [] };
  const stack = [{ node: root, level: 0 }];
  items.forEach((it) => {
    while (stack.length > 1 && stack[stack.length - 1].level >= it.level) stack.pop();
    const n = { id: uid(), name: it.name, children: [], start: it.start, end: it.end, budget: it.budget, progress: it.progress, auto: true };
    stack[stack.length - 1].node.children.push(n);
    stack.push({ node: n, level: it.level });
  });
  let cursor = TODAY;
  leaves(root).forEach((l) => {
    if (!l.start) l.start = cursor;
    if (!l.end || l.end < l.start) l.end = addDays(l.start, 30);
    cursor = l.end;
  });
  (function clean(n) { if (n.children.length) { ['start', 'end', 'budget', 'progress', 'auto'].forEach((k) => delete n[k]); n.children.forEach(clean); } })(root);
  root.children.forEach((c) => { if (!c.children.length) return; });
  return { wbs: root, count: items.length, stages: root.children.length, leaves: leaves(root).length };
}
