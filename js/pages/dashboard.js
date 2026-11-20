import { icon } from '../icons.js';
import { $, esc, docIcon, progress, popover, toast, nav } from '../ui.js';
import { halfDonut, legend } from '../charts.js';
import { USER, APPROVALS } from '../data.js';
import { projects, summary, forecast, allTasks, fmt, TODAY, plural } from '../db.js';
import { milestonesHTML } from './project.js';
import { taskCard, taskDrawer, isLate } from './tasks.js';

const C = { y: 'var(--yellow)', b: 'var(--primary)', g: 'var(--green)' };
const mlnRub = (v) => (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн руб.';

export default {
  title: 'Личный кабинет',
  render() {
    const ps = projects(), sums = ps.map((p) => ({ p, s: summary(p) }));
    const cons = sums.filter((x) => x.p.group === 'construction'), ops = sums.filter((x) => x.p.group === 'operation');
    const pre = cons.filter((x) => x.s.status === 'wait'), build = cons.filter((x) => x.s.status !== 'wait');
    const active = sums.filter((x) => x.s.status === 'work').length;
    const sumAc = (arr) => arr.reduce((s, x) => s + x.s.ac, 0);
    const pinned = ps.find((p) => p.pinned) || cons[0]?.p;
    const risks = cons.filter((x) => x.s.progress < 99.9).map((x) => ({ ...x, fc: forecast(x.p) })).sort((a, b) => b.fc.risk - a.fc.risk).slice(0, 4);
    const mine = allTasks().filter((t) => (t.resp === 'anisimov' || t.exec === 'anisimov') && t.status !== 'closed').sort((a, b) => (a.due < b.due ? -1 : 1));
    const late = mine.filter(isLate).length;
    const showAll = sessionStorage.getItem('dashTasksAll') === '1';
    const pf = pinned && forecast(pinned);
    return `
    <section class="welcome"><h2>Добро пожаловать, ${USER.first}!</h2><p>Отслеживайте, управляйте и прогнозируйте проекты и сроки.</p></section>
    <div class="dash">
      <a class="card kpi" href="#/projects" aria-label="Всего проектов">
        <h3>Всего проектов</h3><div class="big">${ps.length}</div>
        ${legend([{ label: `Предпроекты · ${pre.length}`, color: C.y }, { label: `Строительство · ${build.length}`, color: C.b }, { label: `Эксплуатация · ${ops.length}`, color: C.g }])}
        ${halfDonut([{ label: 'Предпроекты', value: pre.length || 0.0001, color: C.y }, { label: 'Строительство', value: build.length, color: C.b }, { label: 'Эксплуатация', value: ops.length, color: C.g }])}
      </a>
      <a class="card kpi" href="#/projects/construction">
        <h3>Активные проекты</h3><div class="big">${active}<small>/${ps.length}</small></div>
        ${progress(ps.length ? (active / ps.length) * 100 : 0, 'blue')}
        <div class="muted" style="margin-top:12px;font-size:13px">${cons.filter((x) => x.s.overdue).length} ${plural(cons.filter((x) => x.s.overdue).length, ['проект', 'проекта', 'проектов'])} с просроченным сроком</div>
      </a>
      <a class="card kpi" href="#/finance">
        <h3>Финансы</h3><div class="big">${mlnRub(sumAc(sums))}</div>
        ${legend([{ label: 'Предпроекты', color: C.y }, { label: 'Строительство', color: C.b }, { label: 'Эксплуатация', color: C.g }])}
        ${halfDonut([{ label: 'Предпроекты', value: sumAc(pre) || 0.0001, color: C.y, title: mlnRub(sumAc(pre)) }, { label: 'Строительство', value: sumAc(build), color: C.b, title: mlnRub(sumAc(build)) }, { label: 'Эксплуатация', value: sumAc(ops), color: C.g, title: mlnRub(sumAc(ops)) }])}
      </a>
      <div class="dash-left">
        ${pinned ? `<a class="card" href="#/project/${pinned.id}/overview" style="color:inherit;text-decoration:none">
          <div class="card-h" style="margin-bottom:0"><h3>Проект «${esc(pinned.name)}» <span style="color:var(--primary)">${icon('bookmark', 16)}</span></h3></div>
          ${milestonesHTML(pinned)}
          <div class="risk-line">${icon('circle-alert', 18)}<div><b>Риски:</b> ${pf.delay > 0 ? `прогноз окончания ${fmt(pf.fEnd, true)} (+${pf.delay} дн.)` : 'проект идёт по графику'}${pinned.factors?.length ? ` · ${esc(pinned.factors[0])}` : ''}</div></div>
        </a>` : ''}
        <section class="card">
          <div class="card-h"><h3>Мои задачи (${mine.length})${late ? ` <span class="badge b-danger" style="margin-left:6px">${late} просрочено</span>` : ''}</h3><a class="link" href="#/tasks/my">Показать все</a></div>
          <div class="tgrid">${mine.slice(0, showAll ? 8 : 4).map(taskCard).join('') || '<p class="faint">Открытых задач нет</p>'}</div>
          ${mine.length > 4 ? `<button class="link" id="allTasks" style="margin-top:12px">${showAll ? 'Свернуть' : 'Ещё задачи'}</button>` : ''}
        </section>
      </div>
      <div class="dash-right">
        <section class="card ai-card">
          <div class="card-h"><h3>${icon('sparkles', 18)} Риски по проектам · PMIC AI</h3></div>
          ${risks.map(({ p, s, fc }) => `<a class="risk-row" href="#/project/${p.id}/forecast"><span class="rscore ${fc.risk >= 60 ? 'hi' : fc.risk >= 30 ? 'mid' : 'lo'}">${fc.risk}</span><span><b>${esc(p.name)}</b><small>${fc.delay > 0 ? `прогноз +${fc.delay} дн. · вероятность срыва ${fc.prob}%` : 'в графике'} · ${Math.round(s.progress)}%</small></span>${icon('chevron-right', 18)}</a>`).join('')}
        </section>
        <section class="card appr-card">
          <div class="card-h"><h3>Согласование (${APPROVALS.length})</h3><a class="link" href="#/documents/pending">Показать все</a></div>
          <div class="approvals">${APPROVALS.map((d, i) => `
            <div class="appr">${docIcon(d.type)}
              <button class="appr-wrap" data-doc="${i}"><b>${esc(d.name)}</b><small class="${d.overdue ? 'over' : ''}">согласовать до ${d.due}</small></button>
              <button class="icon-btn" data-pop data-more="${i}" aria-label="Действия">${icon('ellipsis', 18)}</button></div>`).join('')}</div>
        </section>
      </div>
    </div>`;
  },
  mount(root) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('#allTasks')) { sessionStorage.setItem('dashTasksAll', sessionStorage.getItem('dashTasksAll') === '1' ? '0' : '1'); root.firstElementChild.innerHTML = this.render(); return; }
      const t = e.target.closest('[data-tid]');
      if (t) return taskDrawer(allTasks().find((x) => x.id === t.dataset.tid), () => { root.firstElementChild.innerHTML = this.render(); });
      const d = e.target.closest('[data-doc]');
      if (d) return nav('documents/pending');
      const m = e.target.closest('[data-more]');
      if (m) {
        const doc = APPROVALS[+m.dataset.more];
        popover(m, [
          { icon: 'check', label: 'Согласовать', onClick: () => { m.closest('.appr').style.opacity = .45; toast(`Документ «${esc(doc.name)}» согласован`, 'ok'); } },
          { icon: 'x', label: 'Отклонить', danger: true, onClick: () => toast(`Документ «${esc(doc.name)}» отклонён`, 'warn') },
        ]);
      }
    });
  },
};
