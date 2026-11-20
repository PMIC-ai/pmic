import { icon } from '../icons.js';
import { $, $$, esc, avatar, avatars, docIcon, docStatus, money, modal, drawer, toast, popover, nav, printHTML, download } from '../ui.js';
import { FILES, PEOPLE, CAMERAS, INVOICES, BANKS, GOS_SERVICES, COMMENTS_SEED, HISTORY_SHORT, EMPLOYEE_IDS } from '../data.js';
import { store } from '../store.js';

// ================= Файлы =================
const FS = { open: {}, collapsed: {}, sort: 'date', type: 'all' };
const dkey = (d) => d.id || d.name;
export const statusOf = (d) => store.get().docStatus[dkey(d)] || d.status;
function groups() {
  const added = store.get().addedFiles;
  const gs = FILES.map((g) => ({ ...g, items: g.group === 'Первичная документация' ? [...added, ...g.items] : [...g.items] }));
  const toD = (d) => d.date.split('.').reverse().join('') + d.time;
  gs.forEach((g) => {
    if (FS.type !== 'all') g.items = g.items.filter((d) => d.type === FS.type);
    if (FS.sort === 'name') g.items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (FS.sort === 'date') g.items.sort((a, b) => toD(b).localeCompare(toD(a)));
    if (FS.sort === 'status') g.items.sort((a, b) => statusOf(a).localeCompare(statusOf(b), 'ru'));
  });
  return gs;
}
export function docRow(d, gi, di, { project } = {}) {
  return `<tr data-doc="${gi}:${di}">
    <td class="first"><div class="doc-name">${docIcon(d.type)}<div style="min-width:0"><b title="${esc(d.name)}">${esc(d.name)}</b><span class="sub">${d.tag ? d.tag + ' | ' : ''}${d.pages} стр</span></div></div></td>
    <td data-label="Дата">${d.date}<span class="sub">${d.time}</span></td>
    ${project ? `<td data-label="Проект">${esc(project)}</td>` : `<td data-label="Тип">${d.kind}</td>`}
    <td data-label="Статус">${docStatus(statusOf(d))}</td>
    <td data-label="Создатель"><span class="person">${avatar(d.by, 28)}<span>${PEOPLE[d.by].name}</span></span></td>
    ${project ? '' : `<td data-label="Доступ">${avatars(d.access, 28)}</td>`}
    <td class="w-actions"><button class="icon-btn" data-pop data-dmore="${gi}:${di}" aria-label="Действия">${icon('ellipsis', 18)}</button></td></tr>`;
}
function filesTable() {
  return `<div class="table-wrap"><table class="tbl hover cards">
    <thead><tr><th>Название</th><th>Дата</th><th>Тип</th><th>Статус</th><th>Создатель</th><th>Доступ</th><th></th></tr></thead>
    <tbody>${groups().map((g, gi) => {
      const col = FS.collapsed[gi], all = FS.open[gi], items = all ? g.items : g.items.slice(0, 5);
      return `<tr class="group-row ${col ? 'collapsed' : ''}"><td colspan="7"><div style="display:flex;justify-content:space-between;align-items:center"><button class="gtoggle" data-gcol="${gi}">${icon('chevron-down', 16)} ${g.group} <span class="faint">(${g.items.length})</span></button>${g.items.length > 5 ? `<button class="link" data-gall="${gi}" style="font-weight:500">${all ? 'Свернуть' : 'Показать все'}</button>` : ''}</div></td></tr>
        ${col ? '' : items.map((d, di) => docRow(d, gi, di)).join('')}`;
    }).join('')}</tbody></table></div>`;
}
function docByRef(ref) {
  const [gi, di] = ref.split(':').map(Number);
  const g = groups()[gi];
  const items = FS.open[gi] ? g.items : g.items.slice(0, 5);
  return items[di];
}
function pagePreview(seed) {
  const lines = Array.from({ length: 9 }, (_, i) => `<rect x="${i % 3 === 0 ? 8 : 14}" y="${30 + i * 9}" width="${70 + ((seed * (i + 3)) % 90)}" height="3" rx="1.5" fill="#cfd6e2"/>`).join('');
  return `<svg viewBox="0 0 200 125"><rect x="8" y="8" width="70" height="8" rx="2" fill="#9fb5dd"/><rect x="140" y="8" width="52" height="16" fill="none" stroke="#cfd6e2"/>${lines}
    <g transform="translate(8 ${seed % 2 ? 100 : 108})">${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 31}" y="0" width="30" height="12" fill="none" stroke="#cfd6e2"/>`).join('')}</g></svg>`;
}
export function docDrawer(d, onChange) {
  const key = 'doc:' + d.name;
  const comments = () => [{ ...COMMENTS_SEED[0] }, { who: 'samoilov', ago: '10 минут назад', text: 'Ожидается согласование' }, ...(store.get().comments[key] || [])];
  const cHTML = () => `<button class="link">Ещё 10 комментариев</button>${comments().map((c) => `<div class="comment">${avatar(c.who, 36)}<div><div class="comment-bubble"><b>${esc(PEOPLE[c.who].name)}</b><small class="faint">${esc(c.ago)}</small><div style="margin-top:6px">${esc(c.text)}</div></div><div class="comment-actions"><button>Ответить</button><button>Ещё</button></div></div></div>`).join('')}`;
  const hHTML = () => HISTORY_SHORT.map(([w, ago, a]) => `<div class="hist-row"><small>${ago}</small><div><div class="who">${avatar(w, 32)}${PEOPLE[w].name}</div><p>${a === 'Добавлен комментарий' ? 'Подписал проекта документа' : a}</p></div></div>`).join('');
  const st = () => statusOf(d);
  drawer({
    width: 560,
    html: `<div class="drawer-h"><div class="doc-name">${docIcon(d.type)}<div><b style="max-width:360px;white-space:normal">${esc(d.name)} <button class="icon-btn" data-dl style="width:26px;height:26px" aria-label="Скачать">${icon('download', 16)}</button></b><span class="sub faint">${d.pages} стр</span></div></div><button class="icon-btn" data-close aria-label="Закрыть">${icon('x', 20)}</button></div>
    <div class="drawer-b">
      <h3 style="font-size:19px;font-weight:500;margin-bottom:16px">Детали</h3>
      <dl class="kv2"><dt class="muted">Дата создания</dt><dd>${d.date}</dd><dt class="muted">Тип</dt><dd>${d.kind}</dd>
        <dt class="muted">Дата согласования (п)</dt><dd>10.07.2023</dd><dt class="muted">Создатель</dt><dd>${avatar(d.by, 28)}</dd>
        <dt class="muted">Дата согласования (ф)</dt><dd>10.07.2023</dd><dt class="muted">Доступ</dt><dd>${avatars(d.access, 28)}</dd>
        <dt class="muted">Статус</dt><dd id="dst">${docStatus(st())}</dd></dl>
      <div style="display:flex;gap:10px;margin:20px 0 26px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" data-set="Согласован">${icon('check', 16)} Согласовать</button><button class="btn btn-sm btn-outline" data-set="Отклонен">${icon('x', 16)} Отклонить</button></div>
      <div class="card-h"><h3 style="font-size:19px;font-weight:500">Предпросмотр</h3><button class="btn btn-outline btn-sm" data-refresh style="color:var(--primary)">Обновить</button></div>
      <div class="preview-pages" id="pv"><div class="paper">${pagePreview(3)}</div><div class="paper">${pagePreview(8)}</div></div>
      <div class="seg-tabs"><button class="active" data-seg="c">Комментарии</button><button data-seg="h">История изменений</button></div>
      <div id="segBody">${cHTML()}</div>
      <form class="comment-new" id="cform">${avatar('anisimov', 36)}<div class="input-wrap"><input class="input" placeholder="Добавить комментарий"><button class="icon-btn" aria-label="Отправить">${icon('send', 18)}</button></div></form>
    </div>`,
    onMount(el) {
      el.addEventListener('click', (e) => {
        const s = e.target.closest('[data-seg]');
        if (s) { $$('[data-seg]', el).forEach((b) => b.classList.toggle('active', b === s)); $('#segBody', el).innerHTML = s.dataset.seg === 'c' ? cHTML() : hHTML(); $('#cform', el).classList.toggle('hide', s.dataset.seg !== 'c'); }
        const set = e.target.closest('[data-set]');
        if (set) { setStatus(d, set.dataset.set); $('#dst', el).innerHTML = docStatus(st()); onChange && onChange(); }
        if (e.target.closest('[data-refresh]')) { const pv = $('#pv', el); pv.style.opacity = .3; setTimeout(() => { pv.style.opacity = 1; toast('Предпросмотр обновлён'); }, 500); }
        if (e.target.closest('[data-dl]')) fakeDownload(d);
      });
      $('#cform', el).addEventListener('submit', (e) => {
        e.preventDefault(); const i = e.target.querySelector('input'); if (!i.value.trim()) return;
        store.set((s) => ({ comments: { ...s.comments, [key]: [...(s.comments[key] || []), { who: 'anisimov', ago: 'только что', text: i.value.trim() }] } }));
        i.value = ''; $('#segBody', el).innerHTML = cHTML();
      });
    },
  });
}
export function setStatus(d, s) {
  store.set((st) => ({ docStatus: { ...st.docStatus, [dkey(d)]: s } }));
  toast(`Статус документа <b>${esc(d.name)}</b> изменен на «${s}»`, s === 'Отклонен' ? 'warn' : 'ok');
}
export function fakeDownload(d) {
  const txt = `PMIC — демонстрационная копия документа\n\n${d.name}\nДата: ${d.date} ${d.time}\nТип: ${d.kind}\nСтатус: ${statusOf(d)}\nСоздатель: ${PEOPLE[d.by].name}\n`;
  download(`${d.name}.txt`, txt);
}

function newDocModal(onSaved) {
  const rights = [];
  let picked = null;
  modal({
    title: 'Новый документ', size: 'md',
    body: `<form id="nd" novalidate>
      <input class="input" name="name" placeholder="Название документа" style="margin-bottom:12px">
      <div class="chips" id="rch"><input placeholder="Назначение прав" autocomplete="off"><div class="suggest hide"></div></div>
      <div class="upload-src">
        <button type="button" data-src="local">${icon('download', 26)}Загрузить</button>
        <button type="button" data-src="Яндекс Диск">${icon('cloud', 26)}Яндекс диск</button>
        <button type="button" data-src="Dropbox">${icon('box', 26)}Dropbox</button>
        <button type="button" data-src="Google Диск">${icon('hard-drive', 26)}Гугл диск</button>
      </div>
      <input type="file" id="ndFile" hidden>
      <div class="dropzone" id="dz">Вы можете перетащить сюда файлы. Максимальный размер файла - 100MB</div>
      <div id="picked"></div>
      <div class="err-msg hide" id="ndErr" style="margin-top:10px">Укажите название документа</div>
      <button class="btn btn-accent btn-block" style="margin-top:16px">Сохранить</button></form>`,
    onMount(el, m) {
      const box = $('#rch', el), inp = box.querySelector('input'), sug = box.querySelector('.suggest');
      const people = [...EMPLOYEE_IDS, 'ivanova', 'ivanov', 'vasiliev'];
      const draw = () => { $$('.chip', box).forEach((c) => c.remove()); rights.forEach((id) => inp.insertAdjacentHTML('beforebegin', `<span class="chip">${PEOPLE[id].name}<button type="button" data-rm="${id}">${icon('x', 12)}</button></span>`)); };
      const show = () => { const q = inp.value.toLowerCase(); sug.innerHTML = people.filter((id) => !rights.includes(id) && PEOPLE[id].name.toLowerCase().includes(q)).map((id) => `<button type="button" data-add="${id}">${avatar(id, 24)}${PEOPLE[id].name}<span class="faint" style="margin-left:auto;font-size:12px">${PEOPLE[id].role}</span></button>`).join('') || '<div class="faint" style="padding:8px">Нет совпадений</div>'; sug.classList.remove('hide'); };
      inp.onfocus = show; inp.oninput = show; inp.onblur = () => setTimeout(() => sug.classList.add('hide'), 150);
      box.addEventListener('mousedown', (e) => {
        const a = e.target.closest('[data-add]'); if (a) { e.preventDefault(); rights.push(a.dataset.add); inp.value = ''; draw(); show(); }
        const r = e.target.closest('[data-rm]'); if (r) { e.preventDefault(); rights.splice(rights.indexOf(r.dataset.rm), 1); draw(); }
      });
      const setPicked = (name, size, src) => {
        picked = { name, size, src };
        const f = $('#nd', el); if (!f.name.value) f.name.value = name.replace(/\.[^.]+$/, '');
        $('#picked', el).innerHTML = `<div class="file-picked">${docIcon(/\.pdf$/i.test(name) ? 'pdf' : /\.xlsx?$/i.test(name) ? 'xls' : 'doc')}<span style="flex:1">${esc(name)}<br><span class="faint">${src}${size ? ' · ' + (size / 1024 / 1024).toFixed(2) + ' МБ' : ''}</span></span>${icon('circle-check-big', 18, 'ok-t')}</div>`;
      };
      el.addEventListener('click', (e) => {
        const s = e.target.closest('[data-src]'); if (!s) return;
        $$('[data-src]', el).forEach((b) => b.classList.toggle('on', b === s));
        if (s.dataset.src === 'local') $('#ndFile', el).click();
        else { s.innerHTML = `${icon('loader-circle', 26, 'spin')}Подключение…`; setTimeout(() => { s.innerHTML = `${icon('circle-check-big', 26)}${s.dataset.src === 'Google Диск' ? 'Гугл диск' : s.dataset.src === 'Яндекс Диск' ? 'Яндекс диск' : 'Dropbox'}`; setPicked('Сводный сметный расчёт.xlsx', 1.4 * 1048576, s.dataset.src); }, 700); }
      });
      $('#ndFile', el).onchange = (e) => { const f = e.target.files[0]; if (f) setPicked(f.name, f.size, 'С компьютера'); };
      const dz = $('#dz', el);
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) { if (f.size > 100 * 1048576) return toast('Файл больше 100 МБ', 'warn'); setPicked(f.name, f.size, 'Перетаскивание'); } };
      $('#nd', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.name.value.trim();
        $('#ndErr', el).classList.toggle('hide', !!name); e.target.name.classList.toggle('err', !name);
        if (!name) return;
        const now = new Date();
        const type = picked && /\.pdf$/i.test(picked.name) ? 'pdf' : picked && /\.xlsx?$/i.test(picked.name) ? 'xls' : 'doc';
        const doc = { name, type, pages: 1 + Math.round(Math.random() * 4), date: now.toLocaleDateString('ru-RU'), time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), kind: 'Односторонний', status: 'Ожидание', by: 'anisimov', access: rights.length ? rights.slice(0, 3) : ['ivanova'] };
        store.set((s) => ({ addedFiles: [doc, ...s.addedFiles] }));
        m.close();
        toast(`Документ <b>${esc(name)}</b> успешно загружен`, 'ok');
        onSaved();
      });
    },
  });
}

export const filesTab = {
  render() {
    return `<div class="card" style="padding:26px 28px">
      <div class="card-h" style="margin-bottom:12px"><h3 class="section-title">Документы</h3>
        <div class="toolbar" style="margin:0"><button class="tool" data-pop data-ft="sort">${icon('arrow-up-down', 18)} Сортировка</button><button class="tool ${FS.type !== 'all' ? 'on' : ''}" data-pop data-ft="filter">${icon('list-filter', 18)} Фильтр</button>
        <button class="btn btn-accent btn-icon" data-ft="new" aria-label="Новый документ" title="Новый документ">${icon('plus', 20)}</button></div></div>
      <div id="ftable">${filesTable()}</div></div>`;
  },
  mount(root) {
    const redraw = () => { const t = $('#ftable', root); if (t) t.innerHTML = filesTable(); };
    const h = (e) => {
      const ft = e.target.closest('[data-ft]');
      if (ft) {
        const k = ft.dataset.ft;
        if (k === 'new') return newDocModal(redraw);
        if (k === 'sort') return popover(ft, [['date', 'По дате'], ['name', 'По названию'], ['status', 'По статусу']].map(([v, l]) => ({ label: l, check: FS.sort === v, onClick: () => { FS.sort = v; redraw(); } })));
        if (k === 'filter') return popover(ft, [['all', 'Все типы'], ['doc', 'DOC'], ['pdf', 'PDF'], ['xls', 'XLS']].map(([v, l]) => ({ label: l, check: FS.type === v, onClick: () => { FS.type = v; ft.classList.toggle('on', v !== 'all'); redraw(); } })));
      }
      const gc = e.target.closest('[data-gcol]'); if (gc) { FS.collapsed[gc.dataset.gcol] = !FS.collapsed[gc.dataset.gcol]; return redraw(); }
      const ga = e.target.closest('[data-gall]'); if (ga) { FS.open[ga.dataset.gall] = !FS.open[ga.dataset.gall]; return redraw(); }
      const more = e.target.closest('[data-dmore]');
      if (more) {
        const d = docByRef(more.dataset.dmore);
        const isAdded = store.get().addedFiles.some((x) => x.name === d.name);
        return popover(more, [
          { icon: 'eye', label: 'Открыть', onClick: () => docDrawer(d, redraw) },
          { icon: 'check', label: 'Согласовать', onClick: () => { setStatus(d, 'Согласован'); redraw(); } },
          { icon: 'x', label: 'Отклонить', onClick: () => { setStatus(d, 'Отклонен'); redraw(); } },
          { icon: 'download', label: 'Скачать', onClick: () => fakeDownload(d) },
          ...(isAdded ? ['-', { icon: 'x', label: 'Удалить', danger: true, onClick: () => { store.set((s) => ({ addedFiles: s.addedFiles.filter((x) => x.name !== d.name) })); redraw(); toast(`Документ «${esc(d.name)}» удалён`); } }] : []),
        ]);
      }
      const row = e.target.closest('[data-doc]'); if (row) docDrawer(docByRef(row.dataset.doc), redraw);
    };
    root.addEventListener('click', h);
    return () => root.removeEventListener('click', h);
  },
};

// ================= Прямой эфир =================
export const liveTab = {
  render() {
    return `<div class="card" style="padding:26px 28px"><div class="live-title">Прямой эфир</div>
      <div class="cams">${CAMERAS.map((c, i) => `<button class="cam" data-cam="${i}">
        <div class="cam-img"><img src="${c.img}" alt="${esc(c.title)}"><span class="live">LIVE · Камера ${i + 1}</span><time data-clock></time></div>
        <div class="cam-body"><h4>${esc(c.title)}</h4>
          <div class="kv-line"><span>Отклонение от плановых сроков:</span><b style="font-weight:500">${c.dev}%</b></div>
          <div class="${c.ok ? '' : 'danger-t'}">${c.ok ? 'Полное соответствие графику работ' : 'Отклонение от графика работ'}</div>
        </div></button>`).join('')}</div></div>`;
  },
  mount(root) {
    const tick = () => { const t = new Date().toLocaleTimeString('ru-RU'); $$('[data-clock]').forEach((x) => (x.textContent = t)); };
    tick(); const iv = setInterval(tick, 1000);
    const h = (e) => {
      const c = e.target.closest('[data-cam]'); if (!c) return;
      const cam = CAMERAS[+c.dataset.cam];
      modal({
        title: cam.title, size: 'xl',
        body: `<div class="cam-modal"><div class="cam-img" style="border-radius:12px">${`<img src="${cam.img}" alt="">`}<span class="live">LIVE · Камера ${+c.dataset.cam + 1}</span><time data-clock>${new Date().toLocaleTimeString('ru-RU')}</time></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px">
            <div class="fin-kpi"><small>Отклонение от плана</small><b class="${cam.ok ? 'ok-t' : 'danger-t'}">${cam.dev}%</b></div>
            <div class="fin-kpi"><small>PMIC AI: рабочих в кадре</small><b>${cam.ok ? 24 : 11}</b></div>
            <div class="fin-kpi"><small>Нарушения ОТ (СИЗ)</small><b>${cam.ok ? 0 : 1}</b></div>
          </div></div>`,
        footer: `<a class="btn btn-outline" href="${cam.img}" download="PMIC_снимок_камеры.jpg">${icon('download', 18)} Снимок</a><button class="btn btn-accent" data-close>Закрыть</button>`,
      });
    };
    root.addEventListener('click', h);
    return () => { clearInterval(iv); root.removeEventListener('click', h); };
  },
};

// ================= Счета =================
const isPaid = (inv) => !!store.get().paid[inv.id];
function invoicesTable() {
  return `<div class="table-wrap"><table class="tbl cards">
    <thead><tr><th>№</th><th>Контрагент</th><th>Назначение платежа</th><th>Статья</th><th class="num">Сумма</th><th></th><th></th></tr></thead>
    <tbody>${INVOICES.map((inv, i) => `<tr>
      <td data-label="№">${i + 1}</td>
      <td class="first"><span class="contractor"><i>ПИК</i>${esc(inv.contractor)}</span></td>
      <td data-label="Назначение">${esc(inv.purpose)}</td><td data-label="Статья">${inv.article}</td>
      <td class="num" data-label="Сумма">${money(inv.sum)}</td>
      <td data-label="Печать" style="width:50px"><button class="icon-btn" data-print="${i}" aria-label="Печать счёта">${icon('printer', 18)}</button></td>
      <td data-label="Оплата" style="width:150px;text-align:right">${isPaid(inv) ? `<span class="paid-label">${icon('circle-check-big', 18)} Оплачено</span>` : `<button class="btn btn-accent" data-pay="${i}" style="width:120px">Оплатить</button>`}</td>
    </tr>`).join('')}</tbody></table></div>`;
}
function payModal(inv) {
  let bank = null;
  modal({
    title: 'Онлайн оплата', size: 'md',
    body: `<form id="pf" novalidate>
      <p style="margin:0 0 8px;font-weight:500">Внимание! Чтобы получить чек об оплате, не забудьте указать свою электронную почту в соответствующем поле формы оплаты.</p>
      <p class="note" style="margin:0 0 16px">Для оплаты (ввода реквизитов Вашей карты) Вы будете перенаправлены на платежный шлюз выбранного банка.</p>
      <div class="form-grid">
        <div class="input-wrap"><input class="input" value="${money(inv.sum)}" readonly aria-label="Сумма"><span class="suffix">руб</span></div>
        <input class="input" value="${inv.article}" readonly aria-label="Статья">
        <input class="input" name="email" type="email" placeholder="Email" value="${'anisimov@mail.ru'}">
        <input class="input" name="phone" type="tel" placeholder="Телефон">
      </div>
      <div class="modal-sub" style="margin:18px 0 0">Выберите банк</div>
      <div class="banks">${BANKS.map((b) => `<button type="button" class="bank" data-bank="${b.id}"><i style="background:${b.color}">${b.name[0]}</i>${b.name}</button>`).join('')}</div>
      <div class="err-msg hide" id="pErr" style="margin:-6px 0 10px"></div>
      <button class="btn btn-accent btn-block">Оплатить</button></form>`,
    onMount(el, m) {
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-bank]'); if (!b) return; bank = b.dataset.bank; $$('.bank', el).forEach((x) => x.classList.toggle('on', x === b)); });
      $('#pf', el).addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        const err = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Укажите email для получения чека' : !bank ? 'Выберите банк' : '';
        $('#pErr', el).textContent = err; $('#pErr', el).classList.toggle('hide', !err);
        if (err) return;
        m.close(); sessionStorage.setItem('pmicReturn', location.hash); nav(`pay/${inv.id}/${bank}`);
      });
    },
  });
}
export const invoicesTab = {
  render() { return `<div class="card" style="padding:22px 28px" id="invs">${invoicesTable()}</div>`; },
  mount(root) {
    const h = (e) => {
      const p = e.target.closest('[data-pay]'); if (p) return payModal(INVOICES[+p.dataset.pay]);
      const pr = e.target.closest('[data-print]');
      if (pr) { const inv = INVOICES[+pr.dataset.print]; printHTML(`<h1>Счёт на оплату</h1><div class="muted">${esc(inv.purpose)}</div><table><tr><th>Контрагент</th><td>${inv.contractor}</td></tr><tr><th>Проект</th><td>Дворец спорта</td></tr><tr><th>Статья</th><td>${inv.article}</td></tr><tr><th>Сумма</th><td>${money(inv.sum)} руб.</td></tr><tr><th>Статус</th><td>${isPaid(inv) ? 'Оплачено' : 'К оплате'}</td></tr></table>`, 'Счёт'); }
    };
    root.addEventListener('click', h);
    return () => root.removeEventListener('click', h);
  },
};

// ================= Госуслуги =================
const gosStatus = (id) => store.get().gos[id];
function gosModal(s) {
  modal({
    size: 'md',
    body: `<div class="gos-word">Госуслуги</div>
      <h2 class="modal-title" style="margin:10px 0 12px">${esc(s.title)}</h2>
      <p class="note" style="margin:0 0 20px">Для получения услуги «${esc(s.title.toLowerCase())}» Вы будете перенаправлены на портал Госуслуг (в демо — на имитацию шага).</p>
      <div class="modal-sub">Выберите необходимое действие</div>
      <div class="form-grid"><button class="btn btn-outline-accent" data-guide>Ознакомиться с инструкцией</button><button class="btn btn-accent" data-apply>Подать заявление</button></div>`,
    onMount(el, m) {
      el.querySelector('[data-apply]').onclick = () => { m.close(); sessionStorage.setItem('pmicReturn', location.hash); nav(`gos/${s.id}`); };
      el.querySelector('[data-guide]').onclick = () => {
        m.close();
        modal({
          title: 'Инструкция', size: 'md',
          body: `<ol style="padding-left:20px;line-height:1.7;margin:0">
            <li>Проверьте комплектность документов во вкладке «Файлы» (ИРД, проектная документация, акты).</li>
            <li>Нажмите «Подать заявление» — PMIC подставит реквизиты объекта и застройщика.</li>
            <li>Подтвердите вход через ЕСИА и отправьте заявление.</li>
            <li>Статус заявления отобразится на карточке услуги в PMIC.</li></ol>`,
          footer: `<button class="btn btn-accent" data-close>Понятно</button>`,
        });
      };
    },
  });
}
export const gosTab = {
  render() {
    return `<div class="card" style="padding:26px 28px">
      <div class="card-h" style="margin-bottom:20px"><h3 class="section-title">Услуги</h3><span class="muted" style="font-size:13px">${icon('shield-check', 16)} Интеграция с порталом Госуслуг</span></div>
      <div class="svc-grid">${GOS_SERVICES.map((s) => `<button class="svc" data-svc="${s.id}"><span class="si ${s.tone}">${icon(s.icon, 32)}</span><span><b>${esc(s.title)}</b><small>${esc(s.desc)}</small>${gosStatus(s.id) ? '<span class="badge b-done">Заявление подано</span>' : ''}</span></button>`).join('')}</div></div>`;
  },
  mount(root) {
    const h = (e) => { const s = e.target.closest('[data-svc]'); if (s) gosModal(GOS_SERVICES.find((x) => x.id === s.dataset.svc)); };
    root.addEventListener('click', h);
    return () => root.removeEventListener('click', h);
  },
};
