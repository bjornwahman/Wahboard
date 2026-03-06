import { getChecks, getSettings } from './app.js';

const checks = getChecks();
const settings = getSettings();

const metricsEl = document.getElementById('metrics');
const recentEl = document.getElementById('recent-results');
const statusFilterEl = document.getElementById('status-filter');
const timeFilterEl = document.getElementById('time-filter');
const tileStatusEl = document.getElementById('tile-status-breakdown');
const tileHealthEl = document.getElementById('tile-health-score');
const tileLatencyEl = document.getElementById('tile-latency-bars');

const totals = {
  total: checks.length,
  healthy: checks.filter((c) => c.lastResult?.ok).length,
  failing: checks.filter((c) => c.lastResult && !c.lastResult.ok).length,
  untested: checks.filter((c) => !c.lastResult).length
};

const metrics = [
  ['Totala checks', totals.total, `Miljö: ${settings.environmentLabel}`],
  ['Friska checks', totals.healthy, 'Svarade med förväntad status'],
  ['Felande checks', totals.failing, 'Kräver åtgärd i API eller config'],
  ['Ej körda', totals.untested, 'Saknar historik'],
  ['Auto refresh', `${settings.autoRefreshSeconds}s`, 'Konfigurerad i system'],
  ['Timeout', `${settings.defaultTimeoutMs} ms`, 'Global timeout']
];

metrics.forEach(([title, value, subtitle]) => {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `<p class="muted">${title}</p><div class="metric">${value}</div><p class="muted">${subtitle}</p>`;
  metricsEl.appendChild(card);
});

function getTimeWindowMs(selection) {
  if (selection === '1h') return 60 * 60 * 1000;
  if (selection === '24h') return 24 * 60 * 60 * 1000;
  if (selection === '7d') return 7 * 24 * 60 * 60 * 1000;
  return null;
}

function matchesStatusFilter(check, statusFilter) {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'ok') return check.lastResult?.ok === true;
  if (statusFilter === 'failing') return Boolean(check.lastResult && !check.lastResult.ok);
  if (statusFilter === 'untested') return !check.lastResult;
  return true;
}

function matchesTimeFilter(check, timeFilter) {
  const windowMs = getTimeWindowMs(timeFilter);
  if (!windowMs) return true;
  if (!check.lastResult?.timestamp) return false;

  const timestamp = new Date(check.lastResult.timestamp).getTime();
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp <= windowMs;
}

function renderRecent() {
  const statusFilter = statusFilterEl?.value || 'all';
  const timeFilter = timeFilterEl?.value || 'all';

  const filtered = checks
    .filter((check) => matchesStatusFilter(check, statusFilter) && matchesTimeFilter(check, timeFilter))
    .sort((a, b) => new Date(b.lastResult?.timestamp || 0) - new Date(a.lastResult?.timestamp || 0))
    .slice(0, 8);

  if (!filtered.length) {
    recentEl.innerHTML = '<tr><td colspan="4" class="muted">Inga check-resultat för valt filter.</td></tr>';
    return;
  }

  recentEl.innerHTML = filtered
    .map((check) => {
      const statusClass = !check.lastResult ? 'warn' : check.lastResult.ok ? 'ok' : 'danger';
      const statusText = !check.lastResult ? 'Ej körd' : check.lastResult.ok ? 'OK' : 'Fel';

      return `
      <tr>
        <td>${check.name}</td>
        <td>${check.url}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${check.lastResult?.timestamp ? new Date(check.lastResult.timestamp).toLocaleString('sv-SE') : '-'}</td>
      </tr>
    `;
    })
    .join('');
}

function renderSquaredupInspiredTiles() {
  if (!tileStatusEl || !tileHealthEl || !tileLatencyEl) return;

  const ok = totals.healthy;
  const failing = totals.failing;
  const untested = totals.untested;
  const total = totals.total || 1;

  const okPct = Math.round((ok / total) * 100);
  const failPct = Math.round((failing / total) * 100);
  const untestedPct = Math.max(0, 100 - okPct - failPct);

  tileStatusEl.innerHTML = `
    <div class="tile-donut" style="--ok:${okPct}; --fail:${failPct}; --untested:${untestedPct};">
      <div class="tile-donut-center">
        <strong>${okPct}%</strong>
        <span>OK</span>
      </div>
    </div>
    <ul class="tile-legend">
      <li><span class="dot ok"></span>Friska: ${ok}</li>
      <li><span class="dot danger"></span>Felande: ${failing}</li>
      <li><span class="dot warn"></span>Ej körda: ${untested}</li>
    </ul>
  `;

  const executedChecks = checks.filter((check) => check.lastResult);
  const healthScore = executedChecks.length
    ? Math.round((executedChecks.filter((check) => check.lastResult.ok).length / executedChecks.length) * 100)
    : 0;

  tileHealthEl.innerHTML = `
    <div class="tile-score ${healthScore >= 80 ? 'ok' : healthScore >= 50 ? 'warn' : 'danger'}">${healthScore}</div>
    <p class="muted">Health score baserad på senaste körning för checks som har historik.</p>
  `;

  const latencyChecks = checks
    .filter((check) => check.lastResult?.latencyMs)
    .sort((a, b) => b.lastResult.latencyMs - a.lastResult.latencyMs)
    .slice(0, 5);

  if (!latencyChecks.length) {
    tileLatencyEl.innerHTML = '<p class="muted">Ingen latency-data tillgänglig ännu.</p>';
    return;
  }

  const maxLatency = Math.max(...latencyChecks.map((check) => check.lastResult.latencyMs));

  tileLatencyEl.innerHTML = latencyChecks
    .map((check) => {
      const latency = check.lastResult.latencyMs;
      const widthPct = Math.max(12, Math.round((latency / maxLatency) * 100));
      return `
        <div class="latency-row">
          <div class="latency-label">${check.name}</div>
          <div class="latency-bar-wrap">
            <div class="latency-bar" style="width:${widthPct}%"></div>
            <span>${latency} ms</span>
          </div>
        </div>
      `;
    })
    .join('');
}

statusFilterEl?.addEventListener('change', renderRecent);
timeFilterEl?.addEventListener('change', renderRecent);

renderRecent();
renderSquaredupInspiredTiles();
