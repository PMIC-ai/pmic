import { esc, avatar, nav } from '../ui.js';
import { USER, PEOPLE } from '../data.js';
import { projects, summary, allTasks, fmt } from '../db.js';
import { taskDrawer, tbadge, isLate } from './tasks.js';
import { stBadge } from './project.js';

export default {
  title: 'Профиль',
  back: '#/dashboard',
  render() {
    const team = ['biryukova', 'anisimova', 'osipov', 'belyaev', 'shcherbakov', 'valeeva', 'melnikov', 'sergeev', 'aleksandrova'];
    const tasks = allTasks().filter((t) => (t.resp === 'anisimov' || t.exec === 'anisimov') && t.status !== 'closed').sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 8);
    const ps = projects().filter((p) => (p.team || []).includes('anisimov') || p.mine).slice(0, 8);
    return `
    <div class="profile-head">${avatar('anisimov', 96)}
      <div><h2>${USER.full} <small>${USER.email}</small></h2><div style="margin-top:10px">${USER.role}</div></div></div>
    <div class="profile-grid">
      <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
        <section class="card"><div class="card-h"><h3>Задачи (${tasks.length})</h3><a class="link" href="#/tasks/my">Все мои задачи</a></div>
          <div class="plist">${tasks.map((t) => `<div class="plist-row click" data-t="${t.id}"><span class="t">${esc(t.name)}</span><span>${tbadge(t.status)}</span><span class="right ${isLate(t) ? 'danger-t' : ''}">${fmt(t.due, true)}</span></div>`).join('')}</div></section>
        <section class="card"><div class="card-h"><h3>Мои проекты (${ps.length})</h3></div>
          <div class="plist">${ps.map((p) => { const s = summary(p); return `<div class="plist-row click" data-p="${p.id}"><span class="t">${esc(p.name)}</span><span>${stBadge(s)}</span><span class="right ${s.overdue ? 'danger-t' : ''}">${fmt(s.start)} - ${fmt(s.end)}</span></div>`; }).join('')}</div></section>
      </div>
      <section class="card"><div class="card-h"><h3>Сотрудники</h3><a class="link" href="#/employees">Все</a></div>
        <div class="people-list">${team.map((id) => `<a class="person" href="#/employee/${id}" style="color:inherit;text-decoration:none">${avatar(id, 40)}<span><b>${PEOPLE[id].name}</b><small>${PEOPLE[id].email}</small></span></a>`).join('')}</div></section>
    </div>`;
  },
  mount(root) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-t]'); if (t) return taskDrawer(allTasks().find((x) => x.id === t.dataset.t), () => { root.firstElementChild.innerHTML = this.render(); });
      const p = e.target.closest('[data-p]'); if (p) nav(`project/${p.dataset.p}/overview`);
    });
  },
};
