// BIM-модель: процедурная 3D-модель стадиона на three.js со слоями, вращением и комментариями
import { icon } from '../icons.js';
import { $, $$, esc, modal, toast } from '../ui.js';
import { store } from '../store.js';
import { printDialog } from '../modals.js';

const MODELS = ['Сводная модель', 'Земельный участок', 'Парковка', 'Секция 1', 'Секция 2'];
const FLOORS = 7;
const LAYERS = [
  { id: 'general', name: 'Общий план', parent: true },
  ...Array.from({ length: FLOORS }, (_, i) => ({ id: 'f' + (i + 1), name: `План ${i + 1}-го этажа`, sub: true })),
  { id: 'base', name: 'План подвала', parent: true },
  { id: 'found', name: 'Фундамент несущей конструкции', sub: true, of: 'base' },
];
const INFO = {
  'Обзор': [['ID', '2353461'], ['Код по классификатору', '55.23'], ['Модель', 'https://dbcsoft.com']],
  'Материалы': [['Бетон', 'B30 W8 F150'], ['Арматура', 'А500С'], ['Металлоконструкции', 'С345'], ['Кровля', 'мембрана ПВХ 1,5 мм']],
  'Свойства': [['Площадь застройки', '38 400 м²'], ['Вместимость', '35 000 мест'], ['Этажность', '7 + подвал'], ['Класс ответственности', 'КС-3']],
};
const BS = { model: 0, full: false, rotate: false, commenting: false, hidden: new Set(), selected: null, info: 'Обзор' };

export const bimTab = {
  render() {
    const tools = `<div class="bim-tools">
      <button class="icon-btn" data-b="full" title="${BS.full ? 'Свернуть' : 'Развернуть'}" aria-label="Развернуть">${icon(BS.full ? 'minimize-2' : 'maximize-2', 20)}</button>
      <button class="icon-btn ${BS.rotate ? 'on' : ''}" data-b="rotate" title="Вращение" aria-label="Вращение">${icon('rotate-3d', 20)}</button>
      <button class="icon-btn ${BS.commenting ? 'on' : ''}" data-b="comment" title="Добавить комментарий" aria-label="Комментарий">${icon('message-square-plus', 20)}</button></div>`;
    const viewer = `<div class="bim-viewer ${BS.commenting ? 'commenting' : ''}" id="bimView">
      <div id="bimCanvas" style="position:absolute;inset:0"></div><div id="pins" style="position:absolute;inset:0;pointer-events:none"></div>
      <div class="bim-hint ${BS.commenting ? '' : 'hide'}" id="bimHint">Кликните по модели, чтобы оставить комментарий</div>
      ${BS.full ? `<button class="icon-btn bim-close" data-b="full" aria-label="Закрыть">${icon('x', 18)}</button>` : ''}${tools}</div>`;
    const layers = `<div class="bim-layers"><div class="ls"><div class="tool-search">${icon('search', 18)}<input id="lsq" placeholder="Поиск" style="width:100%"></div></div>
      <div id="layerList">${layersHTML('')}</div></div>`;
    return `<div class="card" style="padding:26px 28px">
      <div class="card-h" style="margin-bottom:20px"><h3 class="section-title">Дворец спорта</h3><button class="btn btn-accent btn-icon" data-b="upload" title="Загрузить модель" aria-label="Загрузить модель">${icon('plus', 20)}</button></div>
      ${BS.full ? `<div class="bim-grid full">${layers}${viewer}</div>` : `<div class="bim-grid">
        <div class="bim-list">${MODELS.map((m, i) => `<button class="${i === BS.model ? 'active' : ''}" data-model="${i}">${m}</button>`).join('')}</div>
        <div class="bim-info">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><b style="font-size:17px;font-weight:500">${MODELS[BS.model]}</b><div class="faint" style="font-size:12px;margin-top:4px">Версия №4 от 28 окт. 2023</div></div>
            <button class="tool" data-b="print" style="height:30px">${icon('printer', 16)} Печать отчета</button></div>
          <div class="tree-box"><div>${icon('chevron-down', 14)} Секция 1</div><div style="padding-left:10px">${icon('chevron-down', 14)} Этаж 4</div><div style="padding-left:24px">${icon('chevron-right', 14)} Раздевалка №4</div><div style="padding-left:24px">${icon('chevron-right', 14)} Лестничная клетка №2</div></div>
          <div class="tag-row">${Object.keys(INFO).map((k) => `<button class="tag ${k === BS.info ? 'active' : ''}" data-info="${k}">${k}</button>`).join('')}</div>
          <dl class="kv" style="grid-template-columns:1fr 1fr;font-size:13.5px">${INFO[BS.info].map(([k, v]) => `<dt>${k}</dt><dd>${v.startsWith('http') ? `<a href="${v}" target="_blank" rel="noopener">${v}</a>` : v}</dd>`).join('')}</dl>
          <div class="faint" style="font-size:12.5px;margin-top:18px">Комментариев в модели: <b id="pinCount">${store.get().pins.length}</b></div>
        </div>${viewer}</div>`}
    </div>`;
  },
  mount(root) {
    let viewer = null, alive = true;
    const start = async () => {
      viewer?.dispose(); viewer = null;
      const host = $('#bimCanvas', root); if (!host) return;
      try {
        const mod = await initViewer(host, $('#pins', root));
        if (!alive) return mod.dispose();
        viewer = mod;
      } catch (err) {
        host.innerHTML = `<img src="assets/img/stadium.jpg" alt="Сводная модель стадиона" style="width:100%;height:100%;object-fit:contain">`;
        const h = $('#bimHint', root); if (h) { h.classList.remove('hide'); h.textContent = 'WebGL недоступен — показан статичный рендер модели'; }
      }
    };
    const redraw = () => { const tb = $('#tabBody', root); tb.innerHTML = bimTab.render(); start(); };
    const h = (e) => {
      const b = e.target.closest('[data-b]')?.dataset.b;
      if (b === 'full') { BS.full = !BS.full; BS.commenting = false; return redraw(); }
      if (b === 'rotate') { BS.rotate = !BS.rotate; e.target.closest('[data-b]').classList.toggle('on', BS.rotate); viewer?.setRotate(BS.rotate); return; }
      if (b === 'comment') { BS.commenting = !BS.commenting; e.target.closest('[data-b]').classList.toggle('on', BS.commenting); $('#bimView', root).classList.toggle('commenting', BS.commenting); $('#bimHint', root).classList.toggle('hide', !BS.commenting); return; }
      if (b === 'print') return printDialog({ title: 'Отчёт-матрица коллизий', sheet: collisionSheetLazy() });
      if (b === 'upload') return uploadModel();
      const m = e.target.closest('[data-model]'); if (m) { BS.model = +m.dataset.model; $$('[data-model]', root).forEach((x) => x.classList.toggle('active', x === m)); $('.bim-info b', root).textContent = MODELS[BS.model]; viewer?.setModel(BS.model); return; }
      const inf = e.target.closest('[data-info]');
      if (inf) {
        BS.info = inf.dataset.info;
        $$('[data-info]', root).forEach((x) => x.classList.toggle('active', x === inf));
        $('.bim-info dl', root).innerHTML = INFO[BS.info].map(([k, v]) => `<dt>${k}</dt><dd>${v.startsWith('http') ? `<a href="${v}" target="_blank" rel="noopener">${v}</a>` : v}</dd>`).join('');
        return;
      }
      const eye = e.target.closest('[data-eye]');
      if (eye) { const id = eye.dataset.eye; BS.hidden.has(id) ? BS.hidden.delete(id) : BS.hidden.add(id); viewer?.applyLayers(); $('#layerList', root).innerHTML = layersHTML($('#lsq', root)?.value || ''); return; }
      const ly = e.target.closest('[data-layer]');
      if (ly) { BS.selected = BS.selected === ly.dataset.layer ? null : ly.dataset.layer; viewer?.applyLayers(); $('#layerList', root).innerHTML = layersHTML($('#lsq', root)?.value || ''); }
    };
    root.addEventListener('click', h);
    root.addEventListener('input', (e) => { if (e.target.id === 'lsq') $('#layerList', root).innerHTML = layersHTML(e.target.value); });
    start();
    return () => { alive = false; root.removeEventListener('click', h); viewer?.dispose(); };
  },
};

let collisionSheetLazy = () => '';
import('./project.js').then((m) => { collisionSheetLazy = m.collisionSheet; });

function layersHTML(q) {
  return LAYERS.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())).map((l) => `
    <div class="layer ${l.sub ? 'sub' : ''} ${BS.selected === l.id ? 'active' : ''} ${BS.hidden.has(l.id) ? 'off' : ''}" data-layer="${l.id}">
      ${icon(l.parent && BS.selected === l.id ? 'chevron-down' : 'chevron-right', 14)}<span title="${l.name}">${l.name}</span>
      <button class="icon-btn" data-eye="${l.id}" aria-label="${BS.hidden.has(l.id) ? 'Показать' : 'Скрыть'} слой" onclick="event.stopPropagation()">${icon(BS.hidden.has(l.id) ? 'eye-off' : 'eye', 16)}</button></div>`).join('');
}

function uploadModel() {
  const m = modal({
    title: 'Загрузка BIM-модели', size: 'md',
    body: `<p class="note" style="margin-top:-6px">Поддерживаются форматы IFC, RVT, NWD. Модель будет автоматически проверена на коллизии.</p>
      <div class="dropzone" style="padding:30px">${icon('upload', 28)}<div style="margin-top:8px">Перетащите файл модели или <label class="link" style="cursor:pointer">выберите на компьютере<input type="file" accept=".ifc,.rvt,.nwd" hidden id="bimFile"></label></div></div>
      <div id="bimProg"></div>`,
    onMount(el) {
      const run = (name) => {
        $('#bimProg', el).innerHTML = `<div class="ai-loading" style="padding:18px 0 0"><div>${esc(name)} — загрузка и проверка коллизий…</div><div class="bar"><span id="bp"></span></div></div>`;
        let p = 0; const t = setInterval(() => { p += 12; const s = $('#bp', el); if (!s) return clearInterval(t); s.style.width = Math.min(p, 100) + '%'; if (p >= 100) { clearInterval(t); m.close(); toast(`Модель <b>${esc(name)}</b> загружена. Найдено коллизий: 28 810`, 'ok'); } }, 180);
      };
      $('#bimFile', el).onchange = (e) => e.target.files[0] && run(e.target.files[0].name);
      const dz = $('.dropzone', el);
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); e.dataTransfer.files[0] && run(e.dataTransfer.files[0].name); };
    },
  });
}

// ---------------- three.js ----------------
async function initViewer(host, pinsHost) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/OrbitControls.js');
  const test = document.createElement('canvas');
  if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');

  const dark = document.documentElement.dataset.theme === 'dark';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  camera.position.set(31, 24, 33);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.target.set(0, 1.4, 0); controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 10; controls.maxDistance = 70;
  controls.autoRotate = BS.rotate; controls.autoRotateSpeed = 1.2;

  scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x334466 : 0xb9c3d3, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(14, 26, 10); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdbe6ff, 0.5); fill.position.set(-18, 10, -14); scene.add(fill);

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.02, ...o });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a94a6, transparent: true, opacity: 0.55 });
  const cyan = new THREE.LineBasicMaterial({ color: 0x1fb5d6 });
  const groups = {};
  const G = (id) => (groups[id] = groups[id] || Object.assign(new THREE.Group(), { name: id }));
  const meshes = [];
  const addMesh = (g, geo, m, edges = true) => { const me = new THREE.Mesh(geo, m); me.userData.baseColor = m.color.getHex(); g.add(me); meshes.push(me); if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat); e.position.copy(me.position); e.rotation.copy(me.rotation); g.add(e); } return me; };
  const ellipse = (a, b, n = 96) => { const s = new THREE.Shape(); for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; const p = [a * Math.cos(t), b * Math.sin(t)]; i ? s.lineTo(...p) : s.moveTo(...p); } return s; };
  const ring = (a, b, w) => { const s = ellipse(a + w, b + w); s.holes.push(ellipse(a, b)); return s; };

  // Земля
  const ground = new THREE.Shape();
  for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2; const r = 15.5 + Math.sin(t * 3) * 1.4 + Math.cos(t * 5) * 0.8; const p = [r * Math.cos(t) * 1.05, r * Math.sin(t)]; i ? ground.lineTo(...p) : ground.moveTo(...p); }
  const groundMesh = addMesh(G('site'), new THREE.ShapeGeometry(ground), mat(dark ? 0x2a3550 : 0xeef0f3, { side: THREE.DoubleSide, transparent: true }), false);
  groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.y = -0.02;

  // Поле
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 384;
  const fx = fc.getContext('2d'); fx.fillStyle = '#5f8f3a'; fx.fillRect(0, 0, 256, 384);
  for (let i = 0; i < 12; i++) { fx.fillStyle = i % 2 ? '#6a9a42' : '#5f8f3a'; fx.fillRect(0, i * 32, 256, 32); }
  fx.strokeStyle = 'rgba(255,255,255,.9)'; fx.lineWidth = 3; fx.strokeRect(12, 12, 232, 360); fx.beginPath(); fx.moveTo(12, 192); fx.lineTo(244, 192); fx.stroke(); fx.beginPath(); fx.arc(128, 192, 30, 0, Math.PI * 2); fx.stroke(); fx.strokeRect(70, 12, 116, 50); fx.strokeRect(70, 322, 116, 50);
  const tex = new THREE.CanvasTexture(fc); tex.colorSpace = THREE.SRGBColorSpace;
  const field = addMesh(G('site'), new THREE.PlaneGeometry(7.2, 10.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), false);
  field.rotation.x = -Math.PI / 2; field.position.y = 0.06;

  // Этажи-трибуны
  const H = 0.48;
  for (let i = 0; i < FLOORS; i++) {
    const g = G('f' + (i + 1));
    const a = 4.6 + i * 0.62, b = 6.6 + i * 0.62, w = 1.7 + (i === FLOORS - 1 ? 0.4 : 0);
    const geo = new THREE.ExtrudeGeometry(ring(a, b, w), { depth: H * 0.86, bevelEnabled: false, curveSegments: 64 });
    geo.rotateX(-Math.PI / 2);
    const m = addMesh(g, geo, mat(i % 2 ? 0xd9dde4 : 0xe6e9ee));
    m.position.y = 0.1 + i * H;
    for (let r = 0; r < 3; r++) { // ряды кресел
      const pts = ellipse(a + 0.35 + r * 0.45, b + 0.35 + r * 0.45, 96).getPoints(96).map((p) => new THREE.Vector3(p.x, 0.1 + i * H + H * 0.87, -p.y));
      g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9aa3b2 })));
    }
  }
  // Колонны фасада
  const colG = G('f1');
  const topY = 0.1 + FLOORS * H;
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * Math.PI * 2, a = 4.6 + 6 * 0.62 + 2.1, b = 6.6 + 6 * 0.62 + 2.1;
    const c = addMesh(colG, new THREE.CylinderGeometry(0.07, 0.07, topY, 6), mat(0xc4cad4), false);
    c.position.set(a * Math.cos(t), topY / 2, -b * Math.sin(t));
  }
  // Кровля (голубые фермы)
  const roof = G('f7');
  const A1 = 4.6 + 6 * 0.62 + 2.2, B1 = 6.6 + 6 * 0.62 + 2.2, A0 = A1 - 3.2, B0 = B1 - 3.2, ry = topY + 1.3;
  const curve = (a, b, y) => new THREE.CatmullRomCurve3(ellipse(a, b, 72).getPoints(72).slice(0, -1).map((p) => new THREE.Vector3(p.x, y, -p.y)), true);
  const tubeM = new THREE.MeshStandardMaterial({ color: 0x1fb5d6, roughness: 0.4, metalness: 0.3 });
  [curve(A1, B1, ry), curve(A0, B0, ry - 0.5)].forEach((c) => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.09, 6, true), tubeM); roof.add(m); meshes.push(m); });
  const truss = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2, c = Math.cos(t), s = -Math.sin(t);
    const o = new THREE.Vector3(A1 * c, ry, B1 * s), n = new THREE.Vector3(A0 * c, ry - 0.5, B0 * s), d = new THREE.Vector3((A1 + 0.1) * c, topY, (B1 + 0.1) * s);
    truss.push(o, n, o, d, n, new THREE.Vector3((A0 + 0.8) * c, topY - 0.2, (B0 + 0.8) * s));
  }
  roof.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(truss), cyan));
  const memb = new THREE.ExtrudeGeometry(ring(A0, B0, A1 - A0), { depth: 0.04, bevelEnabled: false, curveSegments: 64 }); memb.rotateX(-Math.PI / 2);
  const membM = addMesh(roof, memb, mat(0xffffff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), false); membM.position.y = ry - 0.25;
  const scr = addMesh(roof, new THREE.BoxGeometry(2.4, 1.2, 0.15), mat(0x2b3a55, { emissive: 0x2a5cc9, emissiveIntensity: 0.6 })); scr.position.set(0, topY + 0.2, -(B0 + 0.4));

  // Подвал и фундамент
  const slab = new THREE.ExtrudeGeometry(ellipse(A1 + 0.2, B1 + 0.2), { depth: 0.35, bevelEnabled: false, curveSegments: 64 }); slab.rotateX(-Math.PI / 2);
  addMesh(G('base'), slab, mat(0xaeb6c3)).position.y = -0.45;
  const pileM = mat(0x8e98a8);
  for (let x = -A1; x <= A1; x += 1.3) for (let z = -B1; z <= B1; z += 1.3) {
    if ((x * x) / (A1 * A1) + (z * z) / (B1 * B1) > 0.95) continue;
    const p = addMesh(G('found'), new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), pileM, false); p.position.set(x, -1.65, z);
  }
  // Парковка
  const park = G('parking');
  const lot = addMesh(park, new THREE.PlaneGeometry(9, 5), mat(0x9ca3ae), false); lot.rotation.x = -Math.PI / 2; lot.position.set(-9.5, 0.01, 9.5); lot.rotation.z = 0.5;
  const carColors = [0x4081e1, 0xec8841, 0xffffff, 0x6bb473, 0x2b2f38, 0xdd5069];
  for (let i = 0; i < 18; i++) { const c = addMesh(park, new THREE.BoxGeometry(0.42, 0.28, 0.8), mat(carColors[i % 6]), false); const r = i % 6, k = Math.floor(i / 6); c.position.set(-12.2 + r * 1.05 + k * 0.6, 0.15, 8.3 + k * 1.6 - r * 0.55); c.rotation.y = 0.5; }
  // Граница участка
  const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ground.getPoints(64).map((p) => new THREE.Vector3(p.x, 0.03, -p.y))), new THREE.LineDashedMaterial({ color: 0xec8841, dashSize: 0.6, gapSize: 0.35 }));
  border.computeLineDistances(); G('plot').add(border);

  Object.values(groups).forEach((g) => scene.add(g));

  function setModel(i) {
    const show = (id, v) => groups[id] && (groups[id].visible = v);
    const all = ['site', 'parking', 'plot', 'base', 'found', ...Array.from({ length: FLOORS }, (_, k) => 'f' + (k + 1))];
    all.forEach((id) => show(id, i === 0 && !['plot'].includes(id) || false));
    if (i === 0) { show('site', true); show('parking', true); }
    if (i === 1) { show('site', true); show('plot', true); }
    if (i === 2) { show('site', true); show('parking', true); show('plot', true); }
    if (i === 3 || i === 4) { show('site', true); all.filter((x) => x.startsWith('f') && x !== 'found').forEach((x) => show(x, true)); }
    // Секции — обрезка модели плоскостью
    renderer.clippingPlanes = i === 3 ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.01)] : i === 4 ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.01)] : [];
    if (i === 0) applyLayers();
  }
  function applyLayers() {
    if (BS.model !== 0) return;
    const baseSel = BS.selected === 'base' || BS.selected === 'found';
    Array.from({ length: FLOORS }, (_, k) => 'f' + (k + 1)).forEach((id) => { groups[id].visible = !BS.hidden.has(id) && !BS.hidden.has('general'); });
    groups.base.visible = !BS.hidden.has('base'); groups.found.visible = !BS.hidden.has('found') && !BS.hidden.has('base');
    meshes.forEach((m) => {
      const id = m.parent?.name; if (!m.material.color || m.userData.baseColor == null) return;
      const sel = BS.selected && (id === BS.selected || (BS.selected === 'general' && id?.startsWith('f')) || (BS.selected === 'base' && (id === 'base' || id === 'found')));
      m.material = m.material.clone();
      m.material.color.setHex(sel ? 0x8fb2ee : m.userData.baseColor);
      const xr = baseSel && (id?.startsWith('f') && id !== 'found' || id === 'site');
      m.material.transparent = xr || m.material.opacity < 1; m.material.opacity = xr ? 0.28 : (m === membM ? 0.35 : 1); m.material.depthWrite = !xr;
    });
  }
  setModel(BS.model);
  applyLayers();

  // Комментарии-метки
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!BS.commenting || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes.filter((m) => m.visible && m.parent.visible), false)[0];
    if (!hit) return toast('Кликните по элементу модели', 'warn');
    commentModal(hit.point);
  });
  function commentModal(pt) {
    modal({
      title: 'Добавить комментарий', size: 'sm',
      body: `<form id="pinF"><input class="input" name="t" placeholder="Заголовок" style="margin-bottom:10px"><textarea class="input" name="c" placeholder="Комментарий"></textarea>
        <div class="form-grid" style="margin-top:16px"><button class="btn btn-accent">Добавить</button><button type="button" class="btn btn-ghost" data-close>Отмена</button></div></form>`,
      onMount(el, m) {
        $('#pinF', el).addEventListener('submit', (e) => {
          e.preventDefault(); const t = e.target.t.value.trim() || 'Замечание', c = e.target.c.value.trim();
          store.set((s) => ({ pins: [...s.pins, { x: pt.x, y: pt.y, z: pt.z, t, c }] }));
          m.close(); drawPins(); const pc = document.getElementById('pinCount'); if (pc) pc.textContent = store.get().pins.length;
          toast(`Комментарий «${esc(t)}» добавлен в модель`, 'ok');
        });
      },
    });
  }
  let pinEls = [];
  function drawPins() {
    pinsHost.innerHTML = store.get().pins.map((p, i) => `<div class="pin-label" data-pin="${i}"><div class="pin-dot"><span>${i + 1}</span></div><div class="pin-tip"><b>${esc(p.t)}</b><div class="muted">${esc(p.c || '')}</div></div></div>`).join('');
    pinEls = [...pinsHost.children];
  }
  drawPins();
  const v3 = new THREE.Vector3();
  function placePins() {
    const w = host.clientWidth, h = host.clientHeight, pins = store.get().pins;
    pinEls.forEach((el, i) => { const p = pins[i]; if (!p) return; v3.set(p.x, p.y, p.z).project(camera); el.style.left = ((v3.x + 1) / 2) * w + 'px'; el.style.top = ((1 - v3.y) / 2) * h + 'px'; el.style.display = v3.z < 1 ? '' : 'none'; });
  }

  let raf = 0, w0 = 0, h0 = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const w = host.clientWidth, h = host.clientHeight;
    if (w !== w0 || h !== h0) { w0 = w; h0 = h; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
    controls.update(); renderer.render(scene, camera); placePins();
  };
  loop();

  return {
    setRotate: (v) => { controls.autoRotate = v; },
    setModel, applyLayers,
    dispose() { cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); scene.traverse((o) => { o.geometry?.dispose(); }); renderer.domElement.remove(); },
  };
}
