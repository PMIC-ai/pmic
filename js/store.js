// Состояние приложения. Личные настройки — только в этом браузере,
// рабочие данные (проекты, задачи, комментарии…) — в браузере и, если включено, в общем пространстве команды.
const KEY = 'pmic-demo-v1';
export const PERSONAL = ['auth', 'remember', 'theme', 'accent', 'guide', 'welcomed', 'feedbackSent'];

const defaults = () => ({
  auth: false,
  remember: false,
  theme: 'light',
  accent: null,
  guide: {},         // пройденные шаги гида
  welcomed: false,
  paid: {},
  addedFiles: [],
  docStatus: {},
  comments: {},
  pins: [],
  gos: {},
  reports: [],
  invited: [],
  taskState: {},
  removedPeople: [],
  edits: {},
  feedback: [],
  db: null,          // проекты, этапы, задачи (см. db.js)
});

let state;
try { state = { ...defaults(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
catch { state = defaults(); }

const subs = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* хранилище недоступно */ } };

export const store = {
  get: () => state,
  set(patch, meta = {}) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...p };
    save();
    subs.forEach((f) => f(state, p, meta));
  },
  shared() { const o = {}; Object.keys(state).forEach((k) => { if (!PERSONAL.includes(k)) o[k] = state[k]; }); return o; },
  // Полный сброс рабочих данных (личные настройки и вход сохраняются)
  resetData() { const keep = {}; PERSONAL.forEach((k) => { keep[k] = state[k]; }); state = { ...defaults(), ...keep, guide: {} }; save(); subs.forEach((f) => f(state, { reset: true }, {})); },
  reset() { state = defaults(); try { localStorage.removeItem(KEY); } catch { /* */ } },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
};
