import { CONFIG } from './config.js';

const id = String(CONFIG.metrikaId || '').trim();
if (id) {
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  window.ym(+id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, trackHash: true });
}
export function track(goal, params) {
  try { if (id && window.ym) window.ym(+id, 'reachGoal', goal, params); } catch {}
  window.dispatchEvent(new CustomEvent('pmic:goal', { detail: goal }));
}
