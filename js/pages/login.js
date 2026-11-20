import { icon } from '../icons.js';
import { $, nav, toast } from '../ui.js';
import { store } from '../store.js';
import { USER } from '../data.js';

const curve = (pts) => pts.map((v, i) => `${i ? 'L' : 'M'}${i * 30} ${100 - v}`).join(' ');
const preview = `<div class="lp-card">
  <div class="lp-row"><span class="lp-k">Жилой комплекс · прогноз PMIC AI</span><span class="lp-pill">${icon('sparkles', 14)} AI</span></div>
  <div class="lp-kpis"><div><small>Окончание</small><b>+46 дн.</b></div><div><small>Бюджет</small><b>+3,8%</b></div><div><small>Риск срыва</small><b class="lp-risk">38<span>/100</span></b></div></div>
  <svg class="lp-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
    <path d="${curve([4, 10, 19, 30, 42, 55, 67, 78, 87, 94, 98])}" class="lp-plan"/>
    <path d="${curve([3, 8, 15, 24, 34, 44, 53])}" class="lp-fact"/>
    <path d="M180 47 L210 37 L240 27 L270 18 L300 11" class="lp-fc"/>
  </svg>
  <div class="lp-legend"><span><i class="l1"></i>План</span><span><i class="l2"></i>Факт</span><span><i class="l3"></i>Прогноз</span></div>
  <div class="lp-alert">${icon('triangle-alert', 18)}<div><b>Задержка оплаты 30 дн.</b><small>Сценарий «что если»</small></div><span class="lp-delta">+21 дн.</span></div>
</div>`;

export default {
  title: 'Вход',
  render() {
    const st = store.get();
    return `<div class="login">
      <section class="login-l">
        <a class="brand" href="#/login"><span class="brand-t">PMIC</span></a>
        <form class="login-form" id="lf" novalidate>
          <h1>Вход в PMIC</h1>
          <p class="login-sub">Прогнозное управление стоимостью, сроками и рисками строительных проектов</p>
          <a class="btn btn-demo btn-block" href="#/demo">${icon('play', 18)} Открыть демо без регистрации</a>
          <div class="or"><span>или войдите в аккаунт</span></div>
          <div class="field"><label for="lg">Email</label><input class="input" id="lg" name="login" type="email" autocomplete="username" placeholder="name@company.ru" value="${st.remember ? USER.login : ''}"></div>
          <div class="field"><label for="pw">Пароль</label><div class="input-wrap"><input class="input" id="pw" name="pw" type="password" autocomplete="current-password" placeholder="••••••••" value="${st.remember ? 'demo-pmic' : ''}"><button type="button" class="icon-btn" id="eye" aria-label="Показать пароль">${icon('eye', 18)}</button></div></div>
          <div class="row"><label class="check"><input type="checkbox" name="remember" ${st.remember ? 'checked' : ''}> Запомнить меня</label><button type="button" class="link" id="forgot">Забыли пароль?</button></div>
          <div class="err-msg hide" id="lerr" style="margin:-12px 0 14px">Введите логин и пароль</div>
          <button class="btn btn-primary btn-block" id="lbtn">Войти</button>
          <div class="demo-hint">${icon('info', 16)} <span>Демо-доступ: любой email и пароль или <button type="button" class="link" id="demo">заполнить автоматически</button></span></div>
        </form>
        <p class="login-foot">© ООО «Дибиси Софт» · резидент Сколково</p>
      </section>
      <aside class="login-r" aria-hidden="true">
        <div class="login-r-in">
          <h2>Видно, где проект сорвётся, — до того как это случится</h2>
          <ul><li>${icon('trending-up', 18)} Прогноз срока и бюджета по методу освоенного объёма</li><li>${icon('target', 18)} Индекс риска и сценарии «что если»</li><li>${icon('calendar-days', 18)} График, задачи и финансы в одном окне</li></ul>
          <div class="lp-stage">${preview}</div>
        </div>
      </aside>
    </div>`;
  },
  mount(root) {
    const f = $('#lf', root), btn = $('#lbtn', root);
    const sync = () => { const ok = f.login.value.trim() && f.pw.value; btn.classList.toggle('is-off', !ok); };
    f.addEventListener('input', sync); sync();
    $('#eye', root).onclick = (e) => { const t = f.pw.type === 'password'; f.pw.type = t ? 'text' : 'password'; e.currentTarget.innerHTML = icon(t ? 'eye-off' : 'eye', 18); };
    $('#demo', root).onclick = () => { f.login.value = USER.login; f.pw.value = 'demo-pmic'; sync(); };
    $('#forgot', root).onclick = () => toast('Ссылка для восстановления пароля отправлена на почту, указанную при регистрации', 'info');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = f.login.value.trim() && f.pw.value;
      $('#lerr', root).classList.toggle('hide', !!ok);
      if (!ok) return;
      btn.innerHTML = icon('loader-circle', 18, 'spin') + ' Вход…';
      setTimeout(() => { store.set({ auth: true, remember: f.remember.checked }); nav('dashboard'); }, 450);
    });
  },
};
