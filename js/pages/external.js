// Демо-экраны внешних интеграций (банк, Госуслуги). Это имитация шага, без брендинга сторонних сервисов.
import { icon } from '../icons.js';
import { $, esc, money, toast } from '../ui.js';
import { INVOICES, BANKS, GOS_SERVICES, USER } from '../data.js';
import { store } from '../store.js';

const back = () => { location.hash = sessionStorage.getItem('pmicReturn') || '#/project/palace/invoices'; };
const ribbon = '<div class="demo-ribbon">Демонстрационный режим PMIC: реальные платежи и заявления не отправляются</div>';

export const payPage = {
  title: 'Оплата',
  render(ctx) {
    const inv = INVOICES.find((i) => String(i.id) === ctx.params.invoice) || INVOICES[0];
    const bank = BANKS.find((b) => b.id === ctx.params.bank) || BANKS[0];
    return `<div class="ext">
      <div class="ext-top"><div class="ext-brand"><i style="background:${bank.color}">${bank.name[0]}</i>${bank.name} · платёжный шлюз</div>
        <div class="person"><span style="text-align:right"><b style="display:block;font-weight:500">${USER.short}</b><small class="faint">ID клиента</small></span>${icon('user', 22)}</div></div>
      ${ribbon}
      <div class="ext-card" id="payCard">
        <h1>ОПЛАТА ПО РЕКВИЗИТАМ</h1><p class="muted" style="margin:0">Проверьте данные и нажмите «Оплатить»</p>
        <h3>Получатель</h3>
        <dl class="ext-kv"><dt>Наименование:</dt><dd>ПЕРЕВОД ОРГАНИЗАЦИИ</dd><dt>Услуга:</dt><dd>ОПЛАТА ПО РЕКВИЗИТАМ</dd><dt>Регион оплаты:</dt><dd>Доступен во всех регионах</dd><dt>Списать со счета:</dt><dd>•••• •••• •••• 4417</dd></dl>
        <h3>Детали платежа</h3>
        <dl class="ext-kv"><dt>Счет получателя платежа:</dt><dd>40702 810 0 0000 0000123</dd><dt>ИНН:</dt><dd>7700000000</dd><dt>БИК:</dt><dd>044500000</dd><dt>К/С:</dt><dd>30101 810 0 0000 0000000</dd>
          <dt>Банк получателя:</dt><dd>${bank.name.toUpperCase()}</dd><dt>Наименование организации:</dt><dd>${esc(inv.contractor)}</dd><dt>Назначение платежа</dt><dd>${esc(inv.article)} · ${esc(inv.purpose)}</dd><dt>Сумма платежа</dt><dd>${money(inv.sum)} руб.</dd></dl>
        <div class="ext-actions"><button class="btn btn-outline" id="payCancel" style="color:${bank.color};border-color:${bank.color}">Отменить</button><button class="btn" id="payOk" style="background:${bank.color};color:#fff">Оплатить</button></div>
      </div></div>`;
  },
  mount(root, ctx) {
    const inv = INVOICES.find((i) => String(i.id) === ctx.params.invoice) || INVOICES[0];
    $('#payCancel', root).onclick = () => { back(); toast('Оплата отменена', 'warn'); };
    $('#payOk', root).onclick = (e) => {
      e.currentTarget.innerHTML = icon('loader-circle', 18, 'spin') + ' Обработка…'; e.currentTarget.disabled = true;
      setTimeout(() => {
        store.set((s) => ({ paid: { ...s.paid, [inv.id]: true } }));
        $('#payCard', root).innerHTML = `<div class="center"><div class="success-ic">${icon('check', 40)}</div><h1>Платёж выполнен</h1><p class="muted">${money(inv.sum)} руб. · ${esc(inv.purpose)}</p><p class="muted" style="font-size:13px">Чек отправлен на почту ${USER.email}</p>
          <button class="btn btn-accent btn-block" id="toPmic" style="margin-top:22px">${icon('chevron-left', 18)} Вернуться в PMIC</button></div>`;
        $('#toPmic', root).onclick = () => { back(); setTimeout(() => toast(`Счёт № ${inv.id} оплачен`, 'ok'), 300); };
      }, 1100);
    };
  },
};

export const gosPage = {
  title: 'Госуслуги',
  render(ctx) {
    const s = GOS_SERVICES.find((x) => x.id === ctx.params.service) || GOS_SERVICES[5];
    return `<div class="ext">
      <div class="ext-top"><div class="ext-brand"><span class="gos-word">Госуслуги</span><span class="faint" style="font-weight:400;font-size:14px">· демо-интеграция PMIC</span></div>
        <nav class="muted" style="display:flex;gap:20px;font-size:14px"><span>Заявления</span><span>Документы</span><span>Платежи</span><span>Помощь</span></nav></div>
      ${ribbon}
      <div class="ext-card gos-flow" id="gos">${step1(s)}</div></div>`;
  },
  mount(root, ctx) {
    const s = GOS_SERVICES.find((x) => x.id === ctx.params.service) || GOS_SERVICES[5];
    const box = $('#gos', root);
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-g]')?.dataset.g; if (!a) return;
      if (a === 'cancel') return back();
      if (a === 'login') { e.target.closest('button').innerHTML = icon('loader-circle', 18, 'spin') + ' Вход…'; setTimeout(() => { box.innerHTML = step2(s); }, 700); }
      if (a === 'send') { e.target.closest('button').innerHTML = icon('loader-circle', 18, 'spin') + ' Отправка…'; setTimeout(() => { store.set((st) => ({ gos: { ...st.gos, [s.id]: 'submitted' } })); box.innerHTML = step3(); }, 900); }
      if (a === 'done') { back(); setTimeout(() => toast(`Заявление «${esc(s.title)}» подано`, 'ok'), 300); }
    });
  },
};

const steps = (n) => `<div class="gos-steps">${[1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}"></span>`).join('')}</div>`;
const step1 = (s) => `${steps(1)}<h1>Вход в личный кабинет юридического лица</h1><p class="muted">Для подачи заявления «${esc(s.title)}» подтвердите вход через ЕСИА. В демо-режиме вход выполняется без ввода учётных данных.</p>
  <dl class="ext-kv" style="margin:22px 0"><dt>Организация</dt><dd>АО «СпортСтрой» (застройщик, демо)</dd><dt>Представитель</dt><dd>${USER.full}</dd><dt>Объект</dt><dd>Дворец спорта, г. Екатеринбург, ул. Олимпийская, д. 32</dd></dl>
  <div class="ext-actions"><button class="btn btn-outline" data-g="cancel">Отмена</button><button class="btn btn-primary" data-g="login">Войти (демо)</button></div>`;
const step2 = (s) => `${steps(2)}<h1>${s.id === 'commission' ? 'Выдача разрешения на ввод объекта в эксплуатацию' : esc(s.title)}</h1><hr style="border:0;border-top:1px solid var(--border);margin:18px 0">
  ${s.id === 'commission' ? `<p>После завершения строительства, реконструкции <a>объекта капитального строительства</a>, <a>застройщику</a> необходимо ввести объект в эксплуатацию</p>
  <p><b>Срок услуги</b> 5 рабочих дней</p><p><b>Результатом услуги</b> является <a>разрешение на ввод объекта в эксплуатацию</a> в электронной форме</p>
  <p>После окончания строительства <a>индивидуального жилого дома</a> или <a>садового дома</a>, получать разрешение на ввод не требуется</p>` : `<p>${esc(s.desc)}.</p><p>PMIC автоматически приложит к заявлению документы проекта из раздела «Файлы».</p>`}
  <div class="file-picked">${icon('paperclip', 18)} Приложено документов из PMIC: 9</div>
  <div class="ext-actions"><button class="btn btn-outline" data-g="cancel">Отмена</button><button class="btn btn-primary" data-g="send">Отправить заявление</button></div>`;
const step3 = () => `${steps(3)}<div class="center"><div class="success-ic">${icon('file-check', 36)}</div><h1>Заявление успешно принято</h1>
  <p class="muted">Заявление принято и находится в очереди на рассмотрение.<br>Ожидайте ответа в течение 7 рабочих дней.</p>
  <button class="btn btn-accent btn-block" data-g="done" style="margin-top:20px">Вернуться в PMIC</button></div>`;
