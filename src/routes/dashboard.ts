import type { HandlerContext } from '../types';
import { errorJson } from '../lib/http';

export function dashboard(context: HandlerContext): Response {
  const token = context.env.ADMIN_TOKEN;
  if (!token) return errorJson('admin_not_configured', 503, context.env, context.request);

  const authHeader = context.request.headers.get('authorization') ?? '';
  const queryToken = context.url.searchParams.get('token') ?? '';
  if (authHeader !== `Bearer ${token}` && queryToken !== token) {
    return new Response(renderLogin(), { headers: htmlHeaders(), status: 401 });
  }

  return new Response(renderDashboard(queryToken), { headers: htmlHeaders() });
}

function htmlHeaders(): Headers {
  return new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-frame-options': 'DENY',
  });
}

function renderLogin(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>edge-form-inbox admin</title>
  <style>${styles()}</style>
</head>
<body>
  <main class="login">
    <section class="card">
      <p class="eyebrow">edge-form-inbox</p>
      <h1>Admin token required</h1>
      <p>Open <code>/admin?token=YOUR_ADMIN_TOKEN</code> or send an Authorization bearer token.</p>
    </section>
  </main>
</body>
</html>`;
}

function renderDashboard(queryToken: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>edge-form-inbox dashboard</title>
  <style>${styles()}</style>
</head>
<body>
  <div class="shell">
    <aside>
      <p class="eyebrow">edge-form-inbox</p>
      <h1>Inbox</h1>
      <div id="summary" class="summary">Loading summary…</div>
      <button id="exportButton">Export CSV</button>
      <button id="cleanupButton" class="secondary">Clean rate limits</button>
      <p class="hint">Token is kept in local storage for API calls.</p>
    </aside>
    <main>
      <section class="toolbar card">
        <label>Search <input id="search" type="search" placeholder="name, email, message" /></label>
        <label>Status <select id="status"><option value="">Any</option><option>accepted</option><option>flagged</option><option>rejected</option><option>pending</option><option>sent</option><option>failed</option><option>skipped</option></select></label>
        <label>From <input id="from" type="date" /></label>
        <label>To <input id="to" type="date" /></label>
        <button id="filterButton">Apply</button>
      </section>
      <section class="grid">
        <div class="card list">
          <div class="list-head"><h2>Submissions</h2><button id="nextButton">Next</button></div>
          <div id="state" class="state">Loading…</div>
          <table id="table" hidden>
            <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Subject</th><th>Spam</th><th>Delivery</th></tr></thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <article id="detail" class="card detail">
          <h2>Submission detail</h2>
          <p class="empty">Select a submission to inspect the message, metadata, and delivery events.</p>
        </article>
      </section>
    </main>
  </div>
  <script>window.__BOOT_TOKEN__ = ${JSON.stringify(queryToken)};</script>
  <script>${script()}</script>
</body>
</html>`;
}

function script(): string {
  return `
const bootToken = window.__BOOT_TOKEN__;
if (bootToken) localStorage.setItem('edge-form-inbox-token', bootToken);
const token = localStorage.getItem('edge-form-inbox-token') || bootToken;
let cursor = '';
const rows = document.getElementById('rows');
const table = document.getElementById('table');
const state = document.getElementById('state');
const detail = document.getElementById('detail');
const summary = document.getElementById('summary');
function params(includeCursor = false) {
  const p = new URLSearchParams({ limit: '25' });
  const q = document.getElementById('search').value.trim();
  const status = document.getElementById('status').value;
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  if (q) p.set('q', q);
  if (status) p.set('status', status);
  if (from) p.set('from', new Date(from).toISOString());
  if (to) p.set('to', new Date(to + 'T23:59:59').toISOString());
  if (includeCursor && cursor) p.set('cursor', cursor);
  return p;
}
async function api(path) {
  const response = await fetch(path, { headers: { authorization: 'Bearer ' + token } });
  if (!response.ok) throw new Error('Request failed: ' + response.status);
  return response.json();
}
async function loadSummary() {
  try {
    const data = await api('/api/admin/summary');
    const s = data.summary;
    summary.innerHTML = '<strong>' + esc(s.submissions.total) + '</strong> total<br><span>' + esc(s.submissions.accepted) + ' accepted · ' + esc(s.submissions.flagged) + ' flagged · ' + esc(s.delivery.failed) + ' failed</span>';
  } catch (error) {
    summary.textContent = 'Summary unavailable';
  }
}
async function cleanupRateLimits() {
  const response = await fetch('/api/admin/cleanup', { method: 'POST', headers: { authorization: 'Bearer ' + token } });
  if (!response.ok) { alert('Cleanup failed: ' + response.status); return; }
  const data = await response.json();
  alert('Deleted ' + data.cleanup.deleted + ' old rate-limit rows.');
  loadSummary();
}
async function load(includeCursor = false) {
  state.textContent = 'Loading…'; table.hidden = true;
  try {
    const data = await api('/api/admin/submissions?' + params(includeCursor));
    renderRows(data.submissions || []);
  } catch (error) {
    state.textContent = error.message;
  }
}
function renderRows(items) {
  rows.innerHTML = '';
  if (!items.length) { state.textContent = 'No submissions found.'; table.hidden = true; return; }
  state.textContent = ''; table.hidden = false; cursor = items[items.length - 1].created_at;
  for (const item of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + shortDate(item.created_at) + '</td><td>' + esc(item.name || '—') + '</td><td>' + esc(item.email) + '</td><td>' + esc(item.subject || '—') + '</td><td><span class="badge">' + esc(item.spam_status) + '</span></td><td><span class="badge">' + esc(item.delivery_status) + '</span></td>';
    tr.addEventListener('click', () => loadDetail(item.id));
    rows.appendChild(tr);
  }
}
async function loadDetail(id) {
  detail.innerHTML = '<h2>Loading…</h2>';
  const data = await api('/api/admin/submissions/' + encodeURIComponent(id));
  const s = data.submission;
  detail.innerHTML = '<h2>' + esc(s.subject || 'No subject') + '</h2>' +
    '<dl><dt>From</dt><dd>' + esc(s.name || '—') + ' &lt;' + esc(s.email) + '&gt;</dd><dt>Created</dt><dd>' + esc(s.created_at) + '</dd><dt>Status</dt><dd>' + esc(s.spam_status) + ' / ' + esc(s.delivery_status) + '</dd></dl>' +
    '<h3>Message</h3><pre>' + esc(s.message) + '</pre>' +
    '<h3>Metadata</h3><pre>' + esc(JSON.stringify(s.metadata || {}, null, 2)) + '</pre>' +
    '<h3>Delivery events</h3><pre>' + esc(JSON.stringify(data.delivery_events || [], null, 2)) + '</pre>';
}
async function exportCsv() {
  const response = await fetch('/api/admin/export.csv?' + params(false), { headers: { authorization: 'Bearer ' + token } });
  if (!response.ok) { alert('CSV export failed: ' + response.status); return; }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'edge-form-inbox-submissions.csv';
  link.click();
  URL.revokeObjectURL(url);
}
function shortDate(value) { return new Date(value).toLocaleString(); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
document.getElementById('filterButton').addEventListener('click', () => { cursor = ''; load(false); });
document.getElementById('nextButton').addEventListener('click', () => load(true));
document.getElementById('exportButton').addEventListener('click', exportCsv);
document.getElementById('cleanupButton').addEventListener('click', cleanupRateLimits);
loadSummary();
load(false);
`;
}

function styles(): string {
  return `
:root{color-scheme:light dark;--bg:#0f172a;--panel:#111827;--text:#e5e7eb;--muted:#94a3b8;--line:#243244;--accent:#38bdf8;--card:#182235}*{box-sizing:border-box}body{margin:0;font:14px/1.5 Inter,ui-sans-serif,system-ui,sans-serif;background:radial-gradient(circle at top left,#1e3a8a33,transparent 28rem),var(--bg);color:var(--text)}.shell{display:grid;grid-template-columns:17rem 1fr;min-height:100vh}aside{border-right:1px solid var(--line);padding:2rem;position:sticky;top:0;height:100vh}main{padding:2rem}.eyebrow{color:var(--accent);font-weight:700;letter-spacing:.08em;text-transform:uppercase}.card{background:color-mix(in srgb,var(--card) 92%,white);border:1px solid var(--line);border-radius:18px;padding:1rem;box-shadow:0 20px 60px #0004}.toolbar{display:flex;gap:.75rem;align-items:end;flex-wrap:wrap;margin-bottom:1rem}.grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(20rem,.7fr);gap:1rem}.list{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--line);padding:.7rem;vertical-align:top}tr{cursor:pointer}tr:hover{background:#ffffff0a}input,select,button{border:1px solid var(--line);border-radius:10px;background:#0b1220;color:var(--text);padding:.55rem .7rem}button{background:linear-gradient(135deg,#0284c7,#2563eb);border:0;font-weight:700;cursor:pointer}.secondary{margin-top:.5rem;background:#334155}.summary{border:1px solid var(--line);border-radius:14px;padding:.8rem;margin:1rem 0;color:var(--muted)}.summary strong{display:block;color:var(--text);font-size:2rem}.badge{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:.1rem .45rem;color:var(--muted)}.hint,.empty,.state{color:var(--muted)}pre{white-space:pre-wrap;word-break:break-word;background:#0b1220;border:1px solid var(--line);border-radius:12px;padding:1rem}.login{display:grid;place-items:center;min-height:100vh;padding:1rem}.login .card{max-width:34rem}@media(max-width:900px){.shell,.grid{display:block}aside{height:auto;position:static;border-right:0;border-bottom:1px solid var(--line)}main{padding:1rem}.detail{margin-top:1rem}}`;
}
