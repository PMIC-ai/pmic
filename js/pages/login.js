import { icon } from '../icons.js';
import { $, logoMark, nav, toast } from '../ui.js';
import { store } from '../store.js';
import { USER } from '../data.js';

const art = `<svg viewBox="0 0 360 1000" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
  <rect class="float d3" x="170" y="0" width="140" height="80" transform="rotate(-20 240 40)" fill="var(--primary-50)"/>
  <rect class="float" x="230" y="160" width="140" height="132" fill="var(--primary)"/>
  <line x1="140" y1="180" x2="372" y2="396" stroke="var(--text)" stroke-width="3"/>
  <circle class="float d2" cx="310" cy="402" r="8" fill="var(--accent)"/>
  <circle class="float d3" cx="345" cy="570" r="112" fill="var(--accent)"/>
  <rect x="190" y="545" width="64" height="64" transform="rotate(45 222 577)" fill="var(--primary-50)" opacity=".8"/>
  <circle class="float" cx="236" cy="716" r="14" fill="var(--accent)"/>
  <g class="float d2"><rect x="150" y="820" width="150" height="110" transform="rotate(-35 225 875)" fill="var(--primary)"/>
  <rect x="220" y="790" width="150" height="110" transform="rotate(-35 295 845)" fill="var(--primary-50)" stroke="var(--primary)" stroke-width="2.5"/>
  <circle cx="225" cy="870" r="26" fill="var(--primary)" opacity=".8" stroke="var(--text)" stroke-width="2.5"/>
  <path d="M280 830 L 400 790 M 290 860 L 410 820" stroke="var(--text)" stroke-width="2.5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<line x1="${300 + i * 20}" y1="${825 - i * 7}" x2="${310 + i * 20}" y2="${857 - i * 7}" stroke="var(--text)" stroke-width="2.5"/>`).join('')}</g>
</svg>`;

export default {
  title: 'Вход',
  render() {
    const st = store.get();
    return `<div class="login">
      <a class="brand" href="#/login"><span class="logo-box">${logoMark(38)}</span><span class="brand-t">PMIC</span></a>
      <div class="login-art">${art}</div>
      <form class="login-form" id="lf" novalidate>
        <h1>Войти в личный кабинет</h1>
        <div class="field"><label for="lg">Логин</label><input class="input" id="lg" name="login" type="email" autocomplete="username" value="${st.remember ? USER.login : ''}"></div>
        <div class="field"><label for="pw">Пароль</label><div class="input-wrap"><input class="input" id="pw" name="pw" type="password" autocomplete="current-password" value="${st.remember ? 'demo-pmic' : ''}"><button type="button" class="icon-btn" id="eye" aria-label="Показать пароль">${icon('eye', 18)}</button></div></div>
        <div class="row"><label class="check"><input type="checkbox" name="remember" ${st.remember ? 'checked' : ''}> Запомнить данные</label><button type="button" class="link" id="forgot" style="color:var(--text)">Забыли пароль?</button></div>
        <div class="err-msg hide" id="lerr" style="margin:-12px 0 14px">Введите логин и пароль</div>
        <button class="btn btn-block" id="lbtn" style="height:48px">Войти</button>
        <a class="btn btn-outline btn-block" href="#/demo" style="margin-top:12px;height:48px">${icon('play', 18)} Войти в демо без регистрации</a>
        <div class="demo-hint">${icon('info', 16)} Демо-доступ: любой email и пароль, или <button type="button" class="link" id="demo">заполнить автоматически</button></div>
      </form>
    </div>`;
  },
  mount(root) {
    const f = $('#lf', root), btn = $('#lbtn', root);
    const sync = () => { const ok = f.login.value.trim() && f.pw.value; btn.className = `btn btn-block ${ok ? 'btn-dark' : ''}`; btn.style.background = ok ? '' : 'var(--text-3)'; btn.style.color = '#fff'; };
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
