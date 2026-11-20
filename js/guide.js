// Гид по демо: приветствие, чек-лист «что попробовать», сброс демо-данных, обратная связь
import { icon } from './icons.js';
import { $, esc, modal, toast, nav, logoMark } from './ui.js';
import { store } from './store.js';
import { db } from './db.js';
import { CONFIG } from './config.js';
import { track } from './analytics.js';
import { sync } from './sync.js';

export const STEPS = [
  { id: 'project', goal: 'project_created', title: 'Создайте проект по шаблону', desc: 'Проекты → «+» → шаблон «Жилой дом». Этапы, сроки и бюджет разложатся сами.', go: 'projects' },
  { id: 'stage', goal: 'stage_edited', title: 'Измените этап', desc: 'В «Структуре» нажмите на работу и поменяйте срок, бюджет или процент выполнения.', go: 'project/palace/structure' },
  { id: 'gantt', goal: 'gantt_drag', title: 'Перетащите этап на диаграмме Ганта', desc: 'Сдвиньте полосу или потяните её правый край — прогноз пересчитается.', go: 'project/palace/gantt' },
  { id: 'task', goal: 'task_closed', title: 'Закройте задачу', desc: 'Закрытие задачи двигает прогресс работы, этапа и всего проекта.', go: 'tasks/my' },
  { id: 'forecast', goal: 'whatif_used', title: 'Посмотрите AI-прогноз', desc: 'Подвигайте сценарий «что если»: задержка оплаты, рост цен, численность.', go: 'project/palace/forecast' },
  { id: 'import', goal: 'import_done', title: 'Загрузите свой график из Excel', desc: 'Проекты → «+» → «Импорт из Excel». Можно начать с нашего шаблона.', go: 'projects', action: 'import' },
  { id: 'excel', goal: 'excel_export', title: 'Выгрузите данные в Excel', desc: 'Структура, финансы, прогноз и отчёты выгружаются в .xlsx.', go: 'project/palace/structure' },
];
const done = () => store.get().guide || {};
const count = () => STEPS.filter((s) => done()[s.id]).length;

export function mountGuide() {
  if (!$('#guideFab')) {
    document.body.insertAdjacentHTML('beforeend', `<button class="guide-fab" id="guideFab" aria-label="Гид по демо">${icon('target', 20)}<span>Гид по демо</span><b id="guideCount"></b></button>`);
    $('#guideFab').onclick = openGuide;
    window.addEventListener('pmic:goal', (e) => {
      const st = STEPS.find((s) => s.goal === e.detail);
      if (!st || done()[st.id]) return;
      store.set((s) => ({ guide: { ...(s.guide || {}), [st.id]: true } }));
      updateFab();
      setTimeout(() => toast(`${icon('circle-check-big', 16)} Гид: «${esc(st.title)}» — выполнено (${count()}/${STEPS.length})`, 'ok'), 400);
    });
  }
  updateFab();
}
export function unmountGuide() { $('#guideFab')?.remove(); }
function updateFab() { const c = $('#guideCount'); if (c) c.textContent = `${count()}/${STEPS.length}`; $('#guideFab')?.classList.toggle('complete', count() === STEPS.length); }

export function openGuide() {
  const m = modal({
    size: 'md', title: 'Что попробовать в PMIC',
    body: `<p class="muted" style="margin:-8px 0 16px">Это рабочая демо-версия: всё можно создавать, менять и удалять. Данные пересчитываются сразу${sync.enabled ? ` и видны всей команде (пространство «${esc(sync.ws)}»)` : ' и хранятся в вашем браузере'}.</p>
      <div class="guide-progress"><span style="width:${(count() / STEPS.length) * 100}%"></span></div>
      <ol class="guide-list">${STEPS.map((s) => `<li class="${done()[s.id] ? 'done' : ''}"><span class="g-check">${done()[s.id] ? icon('check', 16) : ''}</span><div><b>${esc(s.title)}</b><small>${esc(s.desc)}</small></div><button class="btn btn-sm ${done()[s.id] ? 'btn-outline' : 'btn-primary'}" data-step="${s.id}">${done()[s.id] ? 'Ещё раз' : 'Перейти'}</button></li>`).join('')}</ol>
      <div class="guide-foot"><button class="btn btn-outline btn-sm" id="gReset">${icon('refresh-cw', 16)} Сбросить демо-данные</button><button class="btn btn-accent btn-sm" id="gFb">${icon('message-square', 16)} Обсудить внедрение</button></div>`,
    onMount(el, api) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (b) { const s = STEPS.find((x) => x.id === b.dataset.step); api.close(); nav(s.go); if (s.action === 'import') setTimeout(() => import('./pages/import.js').then((mm) => mm.importModal()), 350); }
      });
      $('#gReset', el).onclick = () => { api.close(); confirmReset(); };
      $('#gFb', el).onclick = () => { api.close(); openFeedback(); };
    },
  });
  return m;
}

export function confirmReset() {
  modal({
    size: 'sm', title: 'Сбросить демо?',
    body: `<p class="muted" style="margin:0">Проекты, задачи, комментарии и все изменения вернутся к исходному состоянию${sync.enabled ? ' <b>для всей команды</b>' : ''}. Тема оформления и вход сохранятся.</p>`,
    footer: '<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-accent" id="rOk">Сбросить</button>',
    onMount(el, api) { el.querySelector('#rOk').onclick = () => { store.resetData(); db.reset(); api.close(); updateFab(); location.hash = '#/dashboard'; dispatchEvent(new HashChangeEvent('hashchange')); toast('Демо-данные сброшены', 'ok'); }; },
  });
}

export function welcome() {
  if (store.get().welcomed) return;
  store.set({ welcomed: true });
  modal({
    size: 'md', cls: 'welcome-ov',
    body: `<div class="welcome-m"><span class="logo-box" style="width:64px;height:64px">${logoMark(44)}</span>
      <h2 class="modal-title" style="margin-top:18px">Добро пожаловать в PMIC</h2>
      <p class="muted" style="margin:0 0 18px">Платформа прогнозного управления стоимостью, сроками и рисками строительных проектов. Это рабочее демо — пробуйте смело:</p>
      <ul class="welcome-list"><li>${icon('folder-plus', 18)} создайте свой проект по шаблону или загрузите график из Excel;</li><li>${icon('calendar', 18)} двигайте этапы на диаграмме Ганта, закрывайте задачи;</li><li>${icon('sparkles', 18)} смотрите, как PMIC AI пересчитывает прогноз срока и бюджета.</li></ul>
      <div class="form-grid" style="margin-top:22px"><button class="btn btn-accent" id="wGuide">${icon('target', 18)} Пройти гид (5 минут)</button><button class="btn btn-outline" data-close>Осмотрюсь сам</button></div></div>`,
    onMount(el, api) { el.querySelector('#wGuide').onclick = () => { api.close(); setTimeout(openGuide, 250); }; },
  });
}

// ---------- Обратная связь ----------
export function openFeedback() {
  let rate = 0;
  modal({
    size: 'md', title: 'Обсудить внедрение',
    body: `<p class="muted" style="margin:-8px 0 16px">Расскажите, что понравилось и чего не хватает — подготовим пилот на ваших объектах.</p>
      <form id="fbf" class="form-grid" novalidate>
        <input class="input" name="name" placeholder="Имя">
        <input class="input" name="company" placeholder="Компания">
        <input class="input" name="contact" placeholder="Телефон или email">
        <select class="input select" name="role"><option value="">Ваша роль</option><option>Руководитель / собственник</option><option>Руководитель проекта</option><option>ПТО / технадзор</option><option>Финансы / сметы</option><option>ИТ</option></select>
        <div class="full"><div class="flabel" style="margin-bottom:6px">Насколько PMIC подходит вашей компании?</div><div class="stars">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-rate="${i}" aria-label="${i} из 5">${i}</button>`).join('')}</div></div>
        <textarea class="input full" name="msg" placeholder="Что понравилось, чего не хватает, какие у вас объекты"></textarea>
        <label class="check full" style="font-size:14px"><input type="checkbox" name="pilot" checked> Хочу обсудить пилот на своих данных</label>
        <div class="err-msg full hide" id="fbErr">Укажите телефон или email для связи</div>
        <button class="btn btn-accent btn-block full">Отправить</button></form>`,
    onMount(el, api) {
      el.addEventListener('click', (e) => { const r = e.target.closest('[data-rate]'); if (!r) return; rate = +r.dataset.rate; el.querySelectorAll('[data-rate]').forEach((b) => b.classList.toggle('on', +b.dataset.rate <= rate)); });
      $('#fbf', el).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target, data = { name: f.name.value.trim(), company: f.company.value.trim(), contact: f.contact.value.trim(), role: f.role.value, rate, msg: f.msg.value.trim(), pilot: f.pilot.checked, guide: `${count()}/${STEPS.length}`, at: new Date().toISOString(), page: location.hash };
        if (!data.contact) { $('#fbErr', el).classList.remove('hide'); return; }
        store.set((s) => ({ feedback: [...(s.feedback || []), data], feedbackSent: true }));
        track('feedback_sent', { rate });
        let sent = false;
        if (CONFIG.feedbackUrl) {
          try { const r = await fetch(CONFIG.feedbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) }); sent = r.ok; } catch { sent = false; }
        }
        api.close();
        if (sent) return toast('Спасибо! Мы свяжемся с вами в ближайшее время.', 'ok');
        const body = `Имя: ${data.name}\nКомпания: ${data.company}\nКонтакт: ${data.contact}\nРоль: ${data.role}\nОценка: ${rate || '—'}/5\nПилот: ${data.pilot ? 'да' : 'нет'}\n\n${data.msg}`;
        location.href = `mailto:${CONFIG.feedbackEmail}?subject=${encodeURIComponent('PMIC: обсуждение внедрения — ' + (data.company || data.name))}&body=${encodeURIComponent(body)}`;
        toast(`Открыли письмо на ${CONFIG.feedbackEmail} — проверьте и отправьте его.`, 'ok', 7000);
      });
    },
  });
}
