// Карточка сотрудника — по макету MVP 2.0 (Figma «5.5 Employee card»)
import { icon } from '../icons.js';
import { $, esc, avatar, avatars, modal, toast, nav, progress } from '../ui.js';
import { PEOPLE } from '../data.js';
import { projects, summary, fmt } from '../db.js';
import { store } from '../store.js';
import { allTasks, taskCard, taskDrawer } from './tasks.js';

const FULL = {
  anisimov: ['Алексей', 'Анисимов', 'Владимирович', '14.03.1986'], biryukova: ['Анна', 'Бирюкова', 'Петровна', '02.11.1979'], sergeev: ['Андрей', 'Сергеев', 'Алексеевич', '19.06.1983'],
  shcherbakov: ['Виктор', 'Щербаков', 'Тимофеевич', '27.01.1981'], melnikov: ['Эдуард', 'Мельников', 'Олегович', '08.08.1990'], anisimova: ['Светлана', 'Анисимова', 'Дмитриевна', '15.05.1992'],
  aleksandrova: ['Ксения', 'Александрова', 'Михайловна', '30.09.1985'], belyaev: ['Артур', 'Беляев', 'Петрович', '11.12.1988'], ilina: ['Дарья', 'Ильина', 'Сергеевна', '04.04.1984'],
  valeeva: ['Ирина', 'Валеева', 'Викторовна', '21.02.1991'], maltseva: ['Елена', 'Мальцева', 'Андреевна', '07.07.1993'], osipov: ['Сергей', 'Осипов', 'Евгеньевич', '18.10.1987'], nikolaev: ['Роман', 'Николаев', 'Андреевич', '25.03.1994'],
};
const field = (id, k) => store.get().edits[id]?.[k];

export default {
  title: 'Карточка сотрудника',
  back: '#/employees',
  render(ctx) {
    const id = ctx.params.id, p = PEOPLE[id];
    if (!p) return `<div class="empty">${icon('user', 28)}<p>Сотрудник не найден</p></div>`;
    const [first, last, middle, birth] = FULL[id] || [p.name.split(' ')[1] || '', p.name.split(' ')[0], '', '—'];
    const v = (k, def) => esc(field(id, k) ?? def);
    const projs = projects().filter((x, i) => x.group === 'construction' && (i + id.length) % 2 === 0).slice(0, 3).map((x) => ({ ...x, s: summary(x) }));
    let tasks = allTasks().filter((t) => t.resp === id || t.exec === id);
    if (!tasks.length) tasks = allTasks().filter((t) => t.status !== 'closed').slice(id.length % 6, id.length % 6 + 6);
    tasks = tasks.filter((t) => t.status !== 'closed').slice(0, 9);
    const ed = (k, val) => `<dd data-edit="${k}"><span>${val}</span><button class="edit-btn" aria-label="Изменить">${icon('pencil', 14)}</button></dd>`;
    return `<section class="card" style="padding:24px 28px">
      <div class="emp-card">
        ${p.photo ? `<img class="emp-big" src="${p.photo}" alt="${esc(p.name)}">` : `<div class="emp-big">${avatar(id, 96)}</div>`}
        <dl><dt>Имя</dt>${ed('first', v('first', first))}<dt>Фамилия</dt>${ed('last', v('last', last))}<dt>Отчество</dt>${ed('middle', v('middle', middle))}
          <dt>Должность</dt>${ed('role', v('role', p.role))}<dt>Дата рождения</dt><dd>${birth}</dd></dl>
        <dl><dt>Направление</dt><dd>${esc(p.role.includes('Бухгалтер') || p.dept.includes('Финанс') ? 'Финансы' : p.dept.includes('охраны') ? 'Охрана труда' : p.dept.includes('Экономич') ? 'Экономика' : 'Строительство')}</dd>
          <dt>Отдел</dt><dd>${esc(p.dept)}</dd><dt>Роль</dt><dd>${id === 'anisimov' ? 'Администратор' : 'Сотрудник'}</dd><dt>Email</dt><dd><a href="mailto:${p.email}">${p.email}</a></dd>
          <dt>Пароль</dt><dd>●●●●●●● <button class="link" id="pwReset" style="font-size:13px;margin-left:6px">Сбросить</button></dd>
          <dt></dt><dd><button class="link danger-t" id="delAcc">Удалить учетную запись</button></dd></dl>
      </div>
      <h3 class="card-title-lg" style="margin-top:28px">Проекты</h3>
      <div class="tgrid">${projs.map((x) => `<a class="mini-proj" href="#/project/${x.id}/overview"><b>${esc(x.name)}</b><div class="ms-pct">${Math.round(x.s.progress)}%</div>${progress(x.s.progress)}<div class="tc-row"><span class="tc-due">${icon('clock', 15)} ${fmt(x.s.end)}</span>${avatars(['ivanova', 'ivanov', 'vasiliev'], 26)}</div></a>`).join('')}</div>
      <h3 class="card-title-lg" style="margin-top:28px">Задачи <span class="faint">${tasks.length}</span></h3>
      <div class="tgrid">${tasks.map(taskCard).join('')}</div>
    </section>`;
  },
  mount(root, ctx) {
    const id = ctx.params.id;
    root.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit] .edit-btn');
      if (ed) {
        const dd = ed.closest('[data-edit]'), k = dd.dataset.edit, span = dd.querySelector('span');
        dd.innerHTML = `<input value="${esc(span.textContent)}" aria-label="Новое значение">`;
        const i = dd.querySelector('input'); i.focus(); i.select();
        let done = false;
        const save = () => { if (done) return; done = true; store.set((s) => ({ edits: { ...s.edits, [id]: { ...(s.edits[id] || {}), [k]: i.value.trim() || span.textContent } } })); root.firstElementChild.innerHTML = this.render(ctx); toast('Изменения сохранены', 'ok'); };
        i.onkeydown = (ev) => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') { done = true; root.firstElementChild.innerHTML = this.render(ctx); } };
        i.onblur = save;
        return;
      }
      if (e.target.closest('#pwReset')) return toast(`Ссылка для смены пароля отправлена на ${PEOPLE[id].email}`, 'ok');
      if (e.target.closest('#delAcc')) {
        return modal({
          size: 'sm', title: 'Удалить учетную запись?',
          body: `<p class="muted" style="margin:0">Сотрудник <b style="color:var(--text)">${PEOPLE[id].name}</b> потеряет доступ к PMIC. Его задачи останутся в проектах.</p>`,
          footer: `<button class="btn btn-ghost" data-close>Отмена</button><button class="btn" style="background:var(--red);color:#fff" id="delOk">Удалить</button>`,
          onMount(el, m) { el.querySelector('#delOk').onclick = () => { store.set((s) => ({ removedPeople: [...s.removedPeople, id] })); m.close(); nav('employees'); toast(`Учетная запись ${PEOPLE[id].name} удалена`, 'warn'); }; },
        });
      }
      const t = e.target.closest('[data-tid]'); if (t) taskDrawer(allTasks().find((x) => String(x.id) === t.dataset.tid), () => { root.firstElementChild.innerHTML = this.render(ctx); });
    });
  },
};
