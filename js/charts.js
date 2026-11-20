import { esc } from './ui.js';

const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
function arcPath(cx, cy, r, r0, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  const [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0);
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
}

export function halfDonut(segs, { w = 220, thick = 44 } = {}) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const cx = w / 2, cy = w / 2, r = w / 2 - 2, r0 = r - thick;
  let a = Math.PI;
  const paths = segs.map((s) => {
    const a1 = a + (s.value / total) * Math.PI;
    const p = `<path class="seg" d="${arcPath(cx, cy, r, r0, a, a1 - 0.004)}" fill="${s.color}"><title>${esc(s.label)}: ${esc(s.title || s.value)}</title></path>`;
    a = a1; return p;
  }).join('');
  return `<svg class="chart half-donut" viewBox="0 0 ${w} ${w / 2}" preserveAspectRatio="xMidYMax meet">${paths}</svg>`;
}

export function ring(pct, { color = 'var(--yellow)', track = 'var(--track)', size = 180, thick = 26, label } = {}) {
  const r = (size - thick) / 2, c = 2 * Math.PI * r;
  return `<svg class="chart ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${thick}"/>
    <circle class="ring-val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${thick}" stroke-linecap="round"
      stroke-dasharray="${c * pct / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--len:${c}"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="ring-txt">${label ?? pct + '%'}</text></svg>`;
}

export function gauge(value, max, { color = 'var(--yellow)', track = 'var(--track)', w = 200 } = {}) {
  const thick = 34, cx = w / 2, cy = w / 2, r = w / 2 - 2, r0 = r - thick;
  const k = Math.max(0.001, Math.min(1, value / max));
  return `<svg class="chart gauge" viewBox="0 0 ${w} ${w / 2 + 4}">
    <path d="${arcPath(cx, cy, r, r0, Math.PI, 2 * Math.PI)}" fill="${track}"/>
    <path d="${arcPath(cx, cy, r, r0, Math.PI, Math.PI + Math.PI * k)}" fill="${color}"/></svg>`;
}

export function bars(values, labels, { w = 640, h = 220, max = 100, color = 'var(--primary)', ticks = [20, 40, 60, 80, 100], showValues = false, fmt = (v) => v } = {}) {
  const padL = ticks.length ? 34 : 6, padB = 26, padT = showValues ? 22 : 8;
  const cw = (w - padL) / values.length, bw = Math.min(26, cw * 0.48);
  const y = (v) => padT + (h - padT - padB) * (1 - v / max);
  const grid = ticks.map((t) => `<line x1="${padL}" x2="${w}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${padL - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${t}</text>`).join('');
  const b = values.map((v, i) => {
    const x = padL + cw * i + (cw - bw) / 2, yy = y(Math.max(v, 0.0001));
    return `<g class="bar-g"><rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(2, h - padB - yy)}" rx="${bw / 2}" fill="${color}" class="bar"><title>${esc(labels[i])}: ${esc(fmt(v))}</title></rect>
      ${showValues ? `<text x="${x + bw / 2}" y="${yy - 7}" text-anchor="middle" class="bar-v">${esc(fmt(v))}</text>` : ''}
      <text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle" class="axis">${esc(labels[i])}</text></g>`;
  }).join('');
  return `<svg class="chart bars" viewBox="0 0 ${w} ${h}">${ticks.length ? grid : ''}${b}</svg>`;
}

export function pie(segs, { size = 220 } = {}) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  let a = -Math.PI / 2;
  const p = segs.map((s) => {
    const a1 = a + (s.value / total) * Math.PI * 2;
    if (s.value <= 0) return '';
    const large = a1 - a > Math.PI ? 1 : 0;
    const [x0, y0] = polar(cx, cy, r, a), [x1, y1] = polar(cx, cy, r, a1);
    const pct = Math.round((s.value / total) * 100);
    const d = (a1 - a) >= Math.PI * 2 - 0.0001 ? `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0` : `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
    a = a1;
    return `<path class="seg" d="${d}" fill="${s.color}" stroke="var(--surface)" stroke-width="2"><title>${esc(s.label)}: ${pct}%</title></path>`;
  }).join('');
  return `<svg class="chart pie" viewBox="0 0 ${size} ${size}">${p}</svg>`;
}

export function legend(segs) {
  return `<ul class="legend">${segs.map((s) => `<li><i style="background:${s.color}"></i>${esc(s.label)}</li>`).join('')}</ul>`;
}

export function lineChart(series, { w = 720, h = 260, marker, markerLabel = 'Сегодня', yMax = 100, ySuffix = '%' } = {}) {
  const all = series.flatMap((s) => s.pts.filter((p) => p.v != null).map((p) => p.d)).sort();
  if (!all.length) return '';
  const t0 = new Date(all[0]).getTime(), t1 = new Date(all[all.length - 1]).getTime() || t0 + 1;
  const padL = 40, padR = 14, padT = 14, padB = 28;
  const x = (d) => padL + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (w - padL - padR);
  const y = (v) => padT + (1 - v / yMax) * (h - padT - padB);
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}${ySuffix}</text>`).join('');
  const years = []; for (let yr = new Date(t0).getFullYear() + 1; yr <= new Date(t1).getFullYear(); yr++) years.push(`${yr}-01-01`);
  const xt = years.map((d) => `<line x1="${x(d)}" x2="${x(d)}" y1="${padT}" y2="${h - padB}" class="grid"/><text x="${x(d)}" y="${h - 8}" text-anchor="middle" class="axis">${d.slice(0, 4)}</text>`).join('');
  const lines = series.map((s) => {
    const p = s.pts.filter((q) => q.v != null);
    if (p.length < 2) return '';
    return `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round" points="${p.map((q) => `${x(q.d).toFixed(1)},${y(q.v).toFixed(1)}`).join(' ')}"><title>${s.label}</title></polyline>`;
  }).join('');
  const mk = marker && marker >= all[0] && marker <= all[all.length - 1] ? `<line x1="${x(marker)}" x2="${x(marker)}" y1="${padT}" y2="${h - padB}" stroke="var(--red)" stroke-dasharray="3 3"/><text x="${x(marker) + 4}" y="${padT + 10}" class="axis" style="fill:var(--red-ink)">${markerLabel}</text>` : '';
  return `<svg class="chart line" viewBox="0 0 ${w} ${h}">${grid}${xt}${mk}${lines}</svg>`;
}
