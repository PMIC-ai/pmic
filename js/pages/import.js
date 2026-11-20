// Импорт графика работ из Excel/CSV: в новый проект или вместо структуры текущего
import { icon } from '../icons.js';
import { $, esc, modal, toast, nav, money } from '../ui.js';
import { readRows, parseSchedule, downloadTemplate } from '../excel.js';
import { db, project, roll, fmt, leaves } from '../db.js';
import { track } from '../analytics.js';

export function importModal({ projectId = null, onDone = () => {} } = {}) {
  let parsed = null, fileName = '';
  const target = projectId ? project(projectId) : null;
  modal({
    title: 'Импорт графика из Excel', size: 'lg',
    body: `<p class="muted" style="margin:-6px 0 16px">Загрузите график работ в формате .xlsx, .xls или .csv. Нужны колонки «Название», «Начало», «Окончание»; «Бюджет» и «% выполнения» — по желанию. Вложенность — по коду (1, 1.1, 1.1.1), колонке «Уровень» или отступам.</p>
      <label class="dropzone" id="idz" style="padding:28px;cursor:pointer;display:block">${icon('upload', 30)}<div style="margin-top:8px"><b>Перетащите файл сюда</b> или нажмите, чтобы выбрать</div><input type="file" hidden accept=".xlsx,.xls,.csv,.ods"></label>
      <div style="margin-top:10px"><button class="link" id="itpl">${icon('download', 15)} Скачать шаблон для заполнения</button></div>
      <div id="iprev"></div>`,
    onMount(el, m) {
      const dz = $('#idz', el), fi = dz.querySelector('input');
      $('#itpl', el).onclick = () => downloadTemplate().then(() => toast('Шаблон скачан: заполните и загрузите обратно', 'ok'));
      const handle = async (file) => {
        if (!file) return;
        fileName = file.name.replace(/\.[^.]+$/, '');
        $('#iprev', el).innerHTML = `<div class="ai-loading">${icon('loader-circle', 24, 'spin')}<div>Читаем «${esc(file.name)}»…</div></div>`;
        try {
          parsed = parseSchedule(await readRows(file));
          const r = roll(parsed.wbs);
          $('#iprev', el).innerHTML = `<div class="import-ok">${icon('circle-check-big', 20)}<div><b>Распознано работ: ${parsed.count}</b> (этапов верхнего уровня: ${parsed.stages}, работ: ${parsed.leaves})<br><span class="muted">${fmt(r.start, true)} – ${fmt(r.end, true)} · бюджет ${money(r.budget)} руб</span></div></div>
            <div class="import-tree">${parsed.wbs.children.slice(0, 12).map((s) => { const sr = roll(s); return `<div class="it-row it-stage"><span>${esc(s.name)}</span><span>${fmt(sr.start)}–${fmt(sr.end)}</span><span>${money(sr.budget)}</span></div>${s.children.slice(0, 6).map((c) => { const cr = roll(c); return `<div class="it-row"><span>${esc(c.name)}</span><span>${fmt(cr.start)}–${fmt(cr.end)}</span><span>${money(cr.budget)}</span></div>`; }).join('')}${s.children.length > 6 ? `<div class="it-row faint">… ещё ${s.children.length - 6}</div>` : ''}`; }).join('')}</div>
            <div class="form-grid" style="margin-top:16px">
              ${target ? `<label class="check full"><input type="radio" name="imode" value="replace" checked> Заменить структуру проекта «${esc(target.name)}» (задачи проекта будут удалены)</label><label class="check full"><input type="radio" name="imode" value="new"> Создать новый проект</label>` : '<input type="hidden" name="imode" value="new">'}
              <input class="input full ${target ? 'hide' : ''}" id="iname" placeholder="Название проекта" value="${esc(fileName)}">
              <input class="input full ${target ? 'hide' : ''}" id="icity" placeholder="Адрес объекта">
              <button class="btn btn-accent btn-block full" id="igo">${target ? 'Применить график' : 'Создать проект из графика'}</button></div>`;
          el.querySelectorAll('[name=imode]').forEach((r) => { r.onchange = () => { const nw = el.querySelector('[name=imode]:checked').value === 'new'; $('#iname', el).classList.toggle('hide', !nw); $('#icity', el).classList.toggle('hide', !nw); $('#igo', el).textContent = nw ? 'Создать проект из графика' : 'Применить график'; }; });
          $('#igo', el).onclick = () => {
            const mode = el.querySelector('[name=imode]:checked')?.value || el.querySelector('[name=imode]').value;
            if (mode === 'replace' && target) { db.replaceWbs(target.id, parsed.wbs); m.close(); track('import_done'); toast(`График загружен: ${parsed.count} работ. Гант, финансы и прогноз пересчитаны.`, 'ok'); onDone(target.id); return; }
            const id = db.addProject({ name: $('#iname', el).value.trim() || fileName || 'Проект из Excel', city: $('#icity', el).value.trim(), wbs: parsed.wbs, template: 'import' });
            m.close(); track('import_done'); toast(`Проект создан из файла: ${parsed.count} работ`, 'ok'); nav(`project/${id}/gantt`);
          };
        } catch (err) {
          parsed = null;
          $('#iprev', el).innerHTML = `<div class="import-err">${icon('triangle-alert', 20)}<div><b>Не получилось разобрать файл</b><br>${esc(err.message)}<br><button class="link" id="itpl2">Скачать шаблон</button></div></div>`;
          $('#itpl2', el).onclick = () => downloadTemplate();
        }
      };
      fi.onchange = () => handle(fi.files[0]);
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); handle(e.dataTransfer.files[0]); };
    },
  });
}
