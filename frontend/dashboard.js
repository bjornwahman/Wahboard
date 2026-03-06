import { getChecks, getSettings } from './app.js';

const checks = getChecks();
const settings = getSettings();

const metricsEl = document.getElementById('metrics');
const recentEl = document.getElementById('recent-results');
const statusFilterEl = document.getElementById('status-filter');
const timeFilterEl = document.getElementById('time-filter');
const tilesEl = document.getElementById('monitor-tiles');

const totals = {
  total: checks.length,
  healthy: checks.filter((c) => c.lastResult?.ok).length,
  failing: checks.filter((c) => c.lastResult && !c.lastResult.ok).length,
  untested: checks.filter((c) => !c.lastResult).length,
  kusto: checks.filter((c) => c.type === 'kusto').length,
  rest: checks.filter((c) => c.type !== 'kusto').length
};

const metrics = [
  ['Totala checks', totals.total, `Miljö: ${settings.environmentLabel}`],
  ['Friska checks', totals.healthy, 'Svarade med förväntad status'],
  ['Felande checks', totals.failing, 'Kräver åtgärd i API eller config'],
  ['Ej körda', totals.untested, 'Saknar historik'],
  ['REST checks', totals.rest, 'HTTP/HTTPS monitorering'],
  ['Kusto checks', totals.kusto, 'Azure Data Explorer queries'],
  ['Auto refresh', `${settings.autoRefreshSeconds}s`, 'Konfigurerad i system'],
  ['Timeout', `${settings.defaultTimeoutMs} ms`, 'Global timeout']
];

metrics.forEach(([title, value, subtitle]) => {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `<p class="muted">${title}</p><div class="metric">${value}</div><p class="muted">${subtitle}</p>`;
  metricsEl.appendChild(card);
});

function renderTiles() {
  if (!tilesEl) return;

  if (!checks.length) {
    tilesEl.innerHTML = '<p class="muted">Inga monitor-tiles skapade ännu.</p>';
    return;
  }

  tilesEl.innerHTML = checks
    .map((check) => {
      const result = check.lastResult;
      const statusClass = !result ? 'warn' : result.ok ? 'ok' : 'danger';
      const statusText = !result ? 'Ej körd' : result.ok ? 'OK' : 'Fel';
      const type = check.type === 'kusto' ? 'Kusto' : 'REST';
      const target = check.type === 'kusto'
        ? `${check.kustoDatabase || settings.azureKustoDatabase || '-'} / ${check.kustoQuery || '-'}`
        : check.url;

      return `
        <article class="tile-card">
          <div class="tile-header">
            <span class="tile-type">${type}</span>
            <span class="status ${statusClass}">${statusText}</span>
          </div>
          <h4>${check.name}</h4>
          <p class="muted">${target}</p>
        </article>
      `;
    })
    .join('');
}

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
      const endpointText = check.type === 'kusto' ? 'Kusto query' : check.url;

      return `
      <tr>
        <td>${check.name}</td>
        <td>${endpointText}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${check.lastResult?.timestamp ? new Date(check.lastResult.timestamp).toLocaleString('sv-SE') : '-'}</td>
      </tr>
    `;
    })
    .join('');
}

statusFilterEl?.addEventListener('change', renderRecent);
timeFilterEl?.addEventListener('change', renderRecent);

renderTiles();
renderRecent();
