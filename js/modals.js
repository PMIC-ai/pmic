import { icon } from './icons.js';
import { $, $$, esc, modal, toast, money, avatar, download, printHTML, logoMark } from './ui.js';
import { store } from './store.js';
import { USER, PEOPLE, HISTORY, FORECAST_WORKS, RIGHTS } from './data.js';
import { projects } from './db.js';

// ---------- Настройки ----------
const THEMES = [
  { id: 'light', name: 'Светлая', side: '#F4F5F7', main: '#FFFFFF', line: '#E6E8EC' },
  { id: 'dark', name: 'Тёмная', side: '#0E1627', main: '#111A2C', line: '#22314F' },
  { id: 'blue', name: 'Голубая', side: '#DCE8FB', main: '#FFFFFF', line: '#CFDDF4' },
];
const ACCENTS = ['#4081E1', '#2FA4A9', '#6B5BD6', '#EC8841', '#3F9A47', '#DD5069'];

function applyTheme(theme, accent) {
  document.documentElement.dataset.theme = theme;
  if (accent) document.documentElement.style.setProperty('--primary', accent);
  else document.documentElement.style.removeProperty('--primary');
}

export function openSettings(tab = 'ui') {
  const st = store.get();
  let theme = st.theme, accent = st.accent, custom = !!st.accent;
  const tabs = { profile: 'Профиль', account: 'Учетная запись', ui: 'Интерфейс' };
  const body = () => `
    <div class="tabs" style="margin-bottom:22px">${Object.entries(tabs).map(([k, v]) => `<button class="tab ${k === tab ? 'active' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>
    <div data-pane="profile" class="${tab === 'profile' ? '' : 'hide'}">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">${avatar('anisimov', 64)}<div><b>${USER.full}</b><div class="muted">${USER.role}</div></div></div>
      <div class="form-grid">
        <div class="field"><label>Фамилия</label><input class="input" value="${USER.last}"></div>
        <div class="field"><label>Имя</label><input class="input" value="${USER.first}"></div>
        <div class="field"><label>Email</label><input class="input" type="email" value="${USER.email}"></div>
        <div class="field"><label>Телефон</label><input class="input" value="${USER.phone}"></div>
      </div>
    </div>
    <div data-pane="account" class="${tab === 'account' ? '' : 'hide'}">
      <div class="form-grid">
        <div class="field full"><label>Логин</label><input class="input" value="${USER.login}" disabled></div>
        <div class="field"><label>Текущий пароль</label><input class="input" type="password" placeholder="••••••••"></div>
        <div class="field"><label>Новый пароль</label><input class="input" type="password" placeholder="Не менее 8 символов"></div>
        <div class="field"><label>Язык интерфейса</label><select class="input select"><option>Русский</option><option>English</option></select></div>
        <div class="field"><label>Часовой пояс</label><select class="input select"><option>Москва (UTC+3)</option><option>Екатеринбург (UTC+5)</option></select></div>
        <label class="check full"><input type="checkbox" checked> Двухфакторная аутентификация</label>
        <label class="check full"><input type="checkbox" checked> Уведомления о согласовании документов на почту</label>
      </div>
    </div>
    <div data-pane="ui" class="${tab === 'ui' ? '' : 'hide'}">
      <div class="modal-sub">Темы оформления</div>
      <div class="settings-themes">
        ${THEMES.map((t) => `<button class="theme-sw ${!custom && theme === t.id ? 'on' : ''}" data-theme-id="${t.id}" style="background:${t.side}" aria-label="${t.name}" title="${t.name}">
          <span class="mini"><i style="background:${t.main}"></i><span class="r"><i style="background:${t.main};height:30%"></i><i style="background:${t.main};flex:1"></i></span></span></button>`).join('')}
        <button class="theme-sw add ${custom ? 'on' : ''}" data-theme-id="custom" aria-label="Своя тема" title="Свой акцентный цвет">${icon('plus', 26)}</button>
      </div>
      <div class="${custom ? '' : 'hide'}" id="accentBox">
        <div class="muted" style="margin-top:14px">Акцентный цвет</div>
        <div class="accent-row">${ACCENTS.map((c) => `<button data-accent="${c}" class="${accent === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          <label class="btn btn-outline btn-sm" style="height:30px">Свой… <input type="color" id="accentPick" value="${accent || '#4081E1'}" style="width:0;height:0;opacity:0;position:absolute"></label></div>
      </div>
    </div>`;
  const m = modal({
    title: 'Настройки', size: 'md', body: body(),
    footer: '<button class="btn btn-ghost" data-close>Отменить</button><button class="btn btn-accent" data-save>Сохранить</button>',
    onClose: () => { if (!saved) applyTheme(st.theme, st.accent); },
  });
  let saved = false;
  const el = m.el;
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; $$('[data-tab]', el).forEach((b) => b.classList.toggle('active', b === t)); $$('[data-pane]', el).forEach((p) => p.classList.toggle('hide', p.dataset.pane !== tab)); return; }
    const th = e.target.closest('[data-theme-id]');
    if (th) {
      const id = th.dataset.themeId;
      $$('.theme-sw', el).forEach((b) => b.classList.toggle('on', b === th));
      if (id === 'custom') { custom = true; $('#accentBox', el).classList.remove('hide'); accent = accent || ACCENTS[1]; $$('[data-accent]', el).forEach((b) => b.classList.toggle('on', b.dataset.accent === accent)); }
      else { custom = false; accent = null; theme = id; $('#accentBox', el).classList.add('hide'); }
      applyTheme(theme, accent); return;
    }
    const ac = e.target.closest('[data-accent]');
    if (ac) { accent = ac.dataset.accent; $$('[data-accent]', el).forEach((b) => b.classList.toggle('on', b === ac)); applyTheme(theme, accent); return; }
    if (e.target.closest('[data-save]')) {
      saved = true; store.set({ theme, accent: custom ? accent : null }); m.close();
      toast('Настройки сохранены', 'ok');
    }
  });
  $('#accentPick', el).addEventListener('input', (e) => { accent = e.target.value; $$('[data-accent]', el).forEach((b) => b.classList.remove('on')); applyTheme(theme, accent); });
}

// ---------- Приглашение ----------
export function openInvite() {
  const chosen = [];
  const m = modal({
    title: 'Приглашение в систему', size: 'md',
    body: `<form id="invForm" class="form-grid" novalidate>
      <input class="input" name="email" type="email" placeholder="Email" required>
      <input class="input" name="first" placeholder="Имя">
      <label class="date-field">${icon('calendar', 18)}<input class="input" type="date" name="birth" aria-label="Дата рождения"><span>Дата рождения</span></label>
      <input class="input" name="last" placeholder="Фамилия">
      <select class="input select" name="pos"><option value="">Должность</option><option>Аналитик</option><option>Инженер ПТО</option><option>Сметчик</option><option>Прораб</option><option>Руководитель проекта</option></select>
      <select class="input select" name="dir"><option value="">Направление</option><option>Строительство</option><option>Финансы</option><option>Экономика</option><option>Охрана труда</option></select>
      <select class="input select" name="dept"><option value="">Отдел</option><option>Отдел финансов</option><option>Проектный отдел</option><option>Отдел охраны труда</option><option>Экономический отдел</option></select>
      <select class="input select" name="role"><option value="">Роль в системе</option><option>Сотрудник</option><option>Наблюдатель</option><option>Менеджер проекта</option><option>Администратор</option></select>
      <div class="field full" style="margin-top:8px"><label style="color:var(--text);font-weight:500">Добавить в проекты</label>
        <div class="chips" id="projChips"><input placeholder="Начните вводить текст, чтобы добавить проекты" autocomplete="off"><div class="suggest hide"></div></div></div>
      <div class="full" style="display:flex;flex-wrap:wrap;gap:10px 28px;margin-top:6px">${Object.keys(RIGHTS).map((g, i) => `<label class="check"><input type="checkbox" data-group="${i}" ${i === 0 ? 'checked' : ''}> ${g}</label>`).join('')}</div>
      <button type="button" class="link full" id="rightsToggle" style="justify-self:start">Настройка дополнительных прав</button>
      <div class="rights-box full hide" id="rightsBox"><div class="rights-grid">${Object.entries(RIGHTS).map(([g, items], i) => `<details ${i === 0 ? 'open' : ''}><summary>${icon('chevron-down', 16)}<label class="check" onclick="event.stopPropagation()"><input type="checkbox" data-group="${i}" ${i === 0 ? 'checked' : ''}> ${g}</label></summary>
        <div class="rlist">${items.map((r) => `<label class="check"><input type="checkbox" data-item="${i}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div></details>`).join('')}</div></div>
      <div class="err-msg full hide" id="invErr">Укажите корректный email</div>
      <button class="btn btn-accent btn-block full" style="margin-top:12px">Отправить приглашение</button>
    </form>`,
    onMount(el) {
      const box = $('#projChips', el), inp = box.querySelector('input'), sug = box.querySelector('.suggest');
      const draw = () => {
        $$('.chip', box).forEach((c) => c.remove());
        chosen.forEach((id) => { const p = projects().find((x) => x.id === id); inp.insertAdjacentHTML('beforebegin', `<span class="chip">${esc(p.name)}<button type="button" data-rm="${id}" aria-label="Убрать">${icon('x', 12)}</button></span>`); });
      };
      const showSug = () => {
        const q = inp.value.trim().toLowerCase();
        const list = projects().filter((p) => !chosen.includes(p.id) && p.name.toLowerCase().includes(q)).slice(0, 8);
        sug.innerHTML = list.map((p) => `<button type="button" data-add="${p.id}">${icon('folder-kanban', 16)}${esc(p.name)}</button>`).join('') || '<div class="faint" style="padding:8px 10px">Нет совпадений</div>';
        sug.classList.remove('hide');
      };
      inp.addEventListener('focus', showSug); inp.addEventListener('input', showSug);
      inp.addEventListener('blur', () => setTimeout(() => sug.classList.add('hide'), 150));
      box.addEventListener('mousedown', (e) => {
        const a = e.target.closest('[data-add]'); if (a) { e.preventDefault(); chosen.push(a.dataset.add); inp.value = ''; draw(); showSug(); }
        const r = e.target.closest('[data-rm]'); if (r) { e.preventDefault(); chosen.splice(chosen.indexOf(r.dataset.rm), 1); draw(); }
      });
      $('#rightsToggle', el).onclick = () => { $('#rightsBox', el).classList.toggle('hide'); el.classList.toggle('m-xl'); };
      el.addEventListener('change', (e) => {
        const g = e.target.dataset.group, it = e.target.dataset.item;
        if (e.target.type === 'date') e.target.closest('.date-field').classList.toggle('filled', !!e.target.value);
        if (g != null) { $$(`[data-group="${g}"]`, el).forEach((c) => { c.checked = e.target.checked; c.indeterminate = false; }); $$(`[data-item="${g}"]`, el).forEach((c) => (c.checked = e.target.checked)); }
        if (it != null) { const items = $$(`[data-item="${it}"]`, el), n = items.filter((c) => c.checked).length; $$(`[data-group="${it}"]`, el).forEach((c) => { c.checked = n === items.length; c.indeterminate = n > 0 && n < items.length; }); }
      });
      $('#invForm', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target), email = String(f.get('email')).trim();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        $('#invErr', el).classList.toggle('hide', ok);
        e.target.email.classList.toggle('err', !ok);
        if (!ok) return;
        const rights = $$('[data-item]', el).filter((c) => c.checked).length;
        store.set((s) => ({ invited: [...s.invited, { email, projects: chosen, rights }] }));
        m.close();
        toast(`Пользователь <b>${esc(email)}</b> был добавлен в систему · прав доступа: ${rights}`, 'ok');
      });
    },
  });
}

// ---------- Помощь ----------
export function openHelp() {
  modal({
    size: 'sm', cls: 'center',
    body: `<div class="center"><h2 class="modal-title" style="padding:0">Свяжитесь с нами</h2>
      <p class="muted" style="margin:0 0 26px">Все еще сталкиваетесь с проблемой или не можете найти ответ? Напишите нам <a href="mailto:pmic@dbcgroup.ru">pmic@dbcgroup.ru</a> и мы постараемся помочь вам как можно скорее</p>
      <a class="btn btn-accent btn-block" href="mailto:pmic@dbcgroup.ru?subject=PMIC%3A%20вопрос%20по%20платформе">Написать на почту</a></div>`,
  });
}

// ---------- История изменений ----------
export function openHistory() {
  const tabs = ['Сегодня', 'Вчера', 'Текущая неделя', 'Прошлая неделя', 'Текущий месяц', 'Прошлый месяц'];
  const ranges = { 'Сегодня': 1, 'Вчера': 2, 'Текущая неделя': 3, 'Прошлая неделя': 4, 'Текущий месяц': 5, 'Прошлый месяц': 5 };
  let cur = 'Текущий месяц';
  const list = () => {
    let days = HISTORY.slice(0, ranges[cur]);
    if (cur === 'Вчера') days = HISTORY.slice(1, 2);
    if (cur === 'Прошлая неделя') days = HISTORY.slice(3, 5);
    return days.map((d) => `<div class="hist-modal-day">${d.day}</div>${d.items.map(([who, act, task, t]) => `
      <div class="hist-item"><span class="person">${avatar(who, 32)}<span>${PEOPLE[who].name}</span></span><span>${act} <a href="#/project/palace/structure" data-close>#${esc(task)}</a></span><time>${t}</time></div>`).join('')}`).join('');
  };
  modal({
    title: 'История изменений', size: 'xl',
    body: `<div class="tabs" style="margin-bottom:6px">${tabs.map((t) => `<button class="tab ${t === cur ? 'active' : ''}" data-h="${t}">${t}</button>`).join('')}</div><div id="hl">${list()}</div>`,
    onMount(el) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-h]'); if (!b) return;
        cur = b.dataset.h; $$('[data-h]', el).forEach((x) => x.classList.toggle('active', x === b)); $('#hl', el).innerHTML = list();
      });
    },
  });
}

// ---------- Диалог печати ----------
export function printDialog({ title, sheet, html, landscape = true }) {
  modal({
    size: 'xl', cls: 'print-ov',
    body: `<div class="print-modal">
      <div class="print-preview"><div class="print-sheet">${sheet}</div></div>
      <div class="print-side">
        <div class="row"><b>Печать</b><span style="opacity:.7">1 страница</span></div>
        <div class="row"><span>Принтер</span><select><option>Сохранить как PDF</option><option>Системный принтер</option></select></div>
        <div class="row"><span>Страницы</span><select><option>Все</option><option>Только текущая</option></select></div>
        <div class="row"><span>Раскладка</span><select id="pLayout"><option value="l" ${landscape ? 'selected' : ''}>Альбомная</option><option value="p" ${landscape ? '' : 'selected'}>Книжная</option></select></div>
        <div class="btns"><button class="btn btn-outline" data-close style="background:#fff;color:var(--accent)">Отмена</button><button class="btn btn-accent" data-print>Сохранить</button></div>
      </div></div>`,
    onMount(el, m) {
      el.style.padding = '0'; el.querySelector('.modal-x').style.display = 'none';
      el.querySelector('[data-print]').onclick = () => { printHTML(html || sheet, title, $('#pLayout', el).value === 'l'); m.close(); };
    },
  });
}

// ---------- Прогноз затрат (PMIC AI) ----------
export function openForecast() {
  const m = modal({
    brand: true, title: 'Прогноз затрат', size: 'md',
    body: `<form id="fc" novalidate>
      <p style="margin:-6px 0 14px">Введите исходные данные для запроса</p>
      <div class="form-grid">
        <select class="input select" name="work" required><option value="">Выберите наименование работ</option>${FORECAST_WORKS.map((w, i) => `<option value="${i}">${w.name}</option>`).join('')}</select>
        <div class="input-wrap"><input class="input" name="area" type="number" min="1" placeholder="Введите площадь объекта" inputmode="decimal"><span class="suffix">м2</span></div>
        <div class="input-wrap"><input class="input" name="days" type="number" min="1" placeholder="Директивный срок задачи" inputmode="numeric"><span class="suffix">дни</span></div>
        <div class="input-wrap"><input class="input" name="rate" type="number" min="1" placeholder="Стоимость ч/ч с налогами" inputmode="decimal"><span class="suffix">руб</span></div>
      </div>
      <div class="err-msg hide" id="fcErr" style="margin-top:10px">Заполните все поля</div>
      <button class="btn btn-accent btn-block" style="margin-top:22px">Рассчитать</button>
      <button type="button" class="link" id="fcDemo" style="margin-top:12px;font-size:13px">Подставить пример</button>
    </form>`,
    onMount(el) {
      $('#fcDemo', el).onclick = () => { const f = $('#fc', el); f.work.value = '0'; f.area.value = 11500; f.days.value = 36; f.rate.value = 1200; };
      $('#fc', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const vals = { work: f.work.value, area: +f.area.value, days: +f.days.value, rate: +f.rate.value };
        const bad = vals.work === '' || !(vals.area > 0) || !(vals.days > 0) || !(vals.rate > 0);
        $('#fcErr', el).classList.toggle('hide', !bad);
        ['work', 'area', 'days', 'rate'].forEach((k) => f[k].classList.toggle('err', k === 'work' ? vals.work === '' : !(vals[k] > 0)));
        if (bad) return;
        runForecast(m, vals);
      });
    },
  });
}

function runForecast(m, v) {
  const steps = ['Анализ исторических данных по 1 240 объектам…', 'Подбор аналогов по типу работ и площади…', 'Расчёт трудозатрат и численности бригады…', 'Оценка рисков и доверительного интервала…'];
  m.el.querySelector('.modal-title').textContent = 'Прогноз затрат';
  m.set(`<div class="ai-loading">${icon('sparkles', 28, 'spin')}<div id="aiStep">${steps[0]}</div><div class="bar"><span id="aiBar"></span></div></div>`);
  let i = 0;
  const t = setInterval(() => {
    i++;
    const bar = m.el.querySelector('#aiBar'); if (!bar) return clearInterval(t);
    bar.style.width = Math.min(100, i * 25) + '%';
    if (steps[i]) m.el.querySelector('#aiStep').textContent = steps[i];
    if (i >= 4) { clearInterval(t); setTimeout(() => showForecast(m, v), 250); }
  }, 420);
}

function showForecast(m, v) {
  const w = FORECAST_WORKS[+v.work];
  const volume = v.area * w.perM2;
  const labor = volume / w.prod;
  const workers = Math.max(1, Math.floor(labor / v.days));
  const cost = labor * 8 * v.rate * 1.25;
  const rows = [
    ['Наименование работ:', w.name], ['Площадь объекта:', `${money(v.area)} м2`], ['Директивный срок исполнения задачи:', `${v.days} дней`],
    ['Стоимость ч/ч с налогами:', `${money(v.rate)} руб`], ['Количество рабочих:', `${workers} чел`], ['Трудозатраты', `${money(labor)} ч/д`],
    ['Объем работ:', `${money(volume)} ${w.unit}`], ['Прогнозируемые затраты:', `${money(cost)} руб`],
    ['Доверительный интервал (P80):', `${money(cost * 0.93)} – ${money(cost * 1.08)} руб`],
  ];
  m.el.querySelector('.modal-title').innerHTML = `Прогнозируемые параметры <button class="icon-btn" id="fcPrint" title="Печать" style="vertical-align:middle">${icon('printer', 20)}</button>`;
  m.set(`<div class="forecast-res"><dl class="kv">${rows.map(([k, val]) => `<dt style="color:var(--text)">${k}</dt><dd>${val}</dd>`).join('')}</dl></div>
    <button class="btn btn-accent btn-block" id="fcDl">Выгрузить прогноз</button>
    <button class="btn btn-ghost btn-block" id="fcAgain" style="margin-top:8px">Новый расчёт</button>`);
  const tableHTML = `<h1>PMIC AI — прогноз затрат</h1><div class="muted">Проект «Дворец спорта» · ${new Date().toLocaleString('ru-RU')}</div><table>${rows.map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join('')}</table>`;
  m.el.querySelector('#fcPrint').onclick = () => printHTML(tableHTML, 'Прогноз затрат');
  m.el.querySelector('#fcDl').onclick = () => {
    const csv = '﻿Параметр;Значение\n' + rows.map(([k, val]) => `${k.replace(':', '')};${val}`).join('\n');
    download('PMIC_прогноз_затрат.csv', csv, 'text/csv;charset=utf-8');
    toast('Прогноз выгружен в <b>PMIC_прогноз_затрат.csv</b>', 'ok');
  };
  m.el.querySelector('#fcAgain').onclick = () => { m.close(); openForecast(); };
}

export { logoMark };
