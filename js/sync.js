// Совместный режим: общее рабочее пространство в Supabase (REST, без библиотек).
// Таблица: pmic_workspaces(id text primary key, data jsonb, updated_at timestamptz) — SQL в README.
import { CONFIG } from './config.js';
import { store, PERSONAL } from './store.js';

const url = (CONFIG.supabaseUrl || '').replace(/\/$/, '');
const key = CONFIG.supabaseKey || '';
const ws = (new URLSearchParams(location.search).get('ws') || CONFIG.workspace || 'demo').replace(/[^\w-]/g, '').slice(0, 40) || 'demo';
export const sync = { enabled: !!(url && key), ws, status: 'off', error: null };

const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
let lastRemote = null, pushing = false, timer = null, applying = false;

async function pull() {
  const r = await fetch(`${url}/rest/v1/pmic_workspaces?id=eq.${encodeURIComponent(ws)}&select=data,updated_at`, { headers: headers() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const rows = await r.json();
  return rows[0] || null;
}
async function push() {
  if (pushing) return;
  pushing = true;
  try {
    const now = new Date().toISOString();
    const r = await fetch(`${url}/rest/v1/pmic_workspaces`, {
      method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: ws, data: store.shared(), updated_at: now }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    lastRemote = now; sync.status = 'ok'; sync.error = null;
  } catch (e) { sync.status = 'error'; sync.error = e.message; }
  pushing = false;
}

export async function initSync(onRemoteChange) {
  if (!sync.enabled) return;
  sync.status = 'connecting';
  try {
    const row = await pull();
    if (row?.data && Object.keys(row.data).length) { applying = true; store.set(row.data, { remote: true }); applying = false; lastRemote = row.updated_at; }
    else await push();
    sync.status = 'ok';
  } catch (e) { sync.status = 'error'; sync.error = e.message; return; }
  // локальные изменения → в общее пространство
  store.on((s, patch, meta) => {
    if (applying || meta.remote) return;
    if (!Object.keys(patch).some((k) => !PERSONAL.includes(k))) return;
    clearTimeout(timer); timer = setTimeout(push, 600);
  });
  // изменения коллег → к себе (опрос раз в 8 секунд)
  setInterval(async () => {
    if (document.hidden || pushing) return;
    try {
      const row = await pull();
      if (row && row.updated_at !== lastRemote && (!lastRemote || row.updated_at > lastRemote)) {
        lastRemote = row.updated_at; applying = true; store.set(row.data, { remote: true }); applying = false;
        onRemoteChange && onRemoteChange();
      }
      sync.status = 'ok';
    } catch (e) { sync.status = 'error'; sync.error = e.message; }
  }, 8000);
}
