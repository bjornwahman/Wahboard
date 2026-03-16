import {
  getChecks,
  getSettings,
  getScomAlerts,
  getDashboards,
  saveDashboards,
  getActiveDashboardId,
  saveActiveDashboardId,
  saveChecks
} from './app.js';

const settings = getSettings();
const scomAlerts = getScomAlerts();

const metricsEl = document.getElementById('metrics');
const recentEl = document.getElementById('recent-results');
const statusFilterEl = document.getElementById('status-filter');
const timeFilterEl = document.getElementById('time-filter');
const dashboardFilterEl = document.getElementById('dashboard-filter');
const dashboardFormEl = document.getElementById('dashboard-form');
const dashboardSummaryEl = document.getElementById('dashboard-summary');
const deleteDashboardBtn = document.getElementById('delete-dashboard');
const tilesEl = document.getElementById('monitor-tiles');
const tileStatusEl = document.getElementById('tile-status');
const tileHealthEl = document.getElementById('tile-health');
const tileLatencyEl = document.getElementById('tile-latency');
const scomAlertsEl = document.getElementById('scom-alerts');

let checks = getChecks();
let dashboards = getDashboards();
let activeDashboardId = getActiveDashboardId();

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveChecks() {
  return checks.filter((check) => (check.dashboardId || 'dashboard-default') === activeDashboardId);
}

function metricsFromChecks(filteredChecks) {
  return {
    total: filteredChecks.length,
    healthy: filteredChecks.filter((c) => c.lastResult?.ok).length,
    failing: filteredChecks.filter((c) => c.lastResult && !c.lastResult.ok).length,
    untested: filteredChecks.filter((c) => !c.lastResult).length,
    kusto: filteredChecks.filter((c) => c.type === 'kusto').length,
    powershell: filteredChecks.filter((c) => c.type === 'powershell').length,
    rest: filteredChecks.filter((c) => c.type === 'rest').length
  };
}

function renderDashboardSelect() {
  if (!dashboardFilterEl) return;
  dashboardFilterEl.innerHTML = dashboards
    .map((dashboard) => `<option value="${dashboard.id}">${dashboard.name}</option>`)
    .join('');

  if (!dashboards.some((dashboard) => dashboard.id === activeDashboardId)) {
    activeDashboardId = dashboards[0].id;
  }

  dashboardFilterEl.value = activeDashboardId;
  saveActiveDashboardId(activeDashboardId);

  const activeDashboard = dashboards.find((dashboard) => dashboard.id === activeDashboardId);
  const activeChecks = getActiveChecks();
  if (dashboardSummaryEl && activeDashboard) {
    dashboardSummaryEl.textContent = `${activeDashboard.description || 'Ingen beskrivning.'} Visar ${activeChecks.length} checks i vald dashboard.`;
  }

  if (deleteDashboardBtn) {
    deleteDashboardBtn.disabled = dashboards.length <= 1;
    deleteDashboardBtn.title = dashboards.length <= 1
      ? 'Du behöver minst en dashboard'
      : 'Ta bort vald dashboard';
  }
}

function renderMetrics() {
  if (!metricsEl) return;

  const activeChecks = getActiveChecks();
  const totals = metricsFromChecks(activeChecks);

  const activeDashboard = dashboards.find((dashboard) => dashboard.id === activeDashboardId);
  const metrics = [
    ['Totala checks', totals.total, `Dashboard: ${activeDashboard?.name || '-'}`],
    ['Friska checks', totals.healthy, 'Svarade med förväntad status'],
    ['Felande checks', totals.failing, 'Kräver åtgärd i API eller config'],
    ['Ej körda', totals.untested, 'Saknar historik'],
    ['REST checks', totals.rest, 'HTTP/HTTPS monitorering'],
    ['PowerShell checks', totals.powershell, 'Scriptmonitorering via worker'],
    ['Kusto checks', totals.kusto, 'Azure Data Explorer queries'],
    ['Auto refresh', `${settings.autoRefreshSeconds}s`, `Miljö: ${settings.environmentLabel}`]
  ];

  metricsEl.innerHTML = '';
  metrics.forEach(([title, value, subtitle]) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<p class="muted">${title}</p><div class="metric">${value}</div><p class="muted">${subtitle}</p>`;
    metricsEl.appendChild(card);
  });
}

function renderTiles() {
  if (!tilesEl) return;

  const activeChecks = getActiveChecks();

  if (!activeChecks.length) {
    tilesEl.innerHTML = '<p class="muted">Inga monitor-tiles skapade ännu för denna dashboard.</p>';
    return;
  }

  tilesEl.innerHTML = activeChecks
    .map((check) => {
      const result = check.lastResult;
      const statusClass = !result ? 'warn' : result.ok ? 'ok' : 'danger';
      const statusText = !result ? 'Ej körd' : result.ok ? 'OK' : 'Fel';
      const type = check.type === 'kusto' ? 'Kusto' : check.type === 'powershell' ? 'PowerShell' : 'REST';
      const target = check.type === 'kusto'
        ? `${check.kustoDatabase || settings.azureKustoDatabase || '-'} / ${check.kustoQuery || '-'}`
        : check.type === 'powershell'
          ? 'Execution worker script'
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

  const filtered = getActiveChecks()
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
      const endpointText = check.type === 'kusto'
        ? 'Kusto query'
        : check.type === 'powershell'
          ? 'PowerShell script'
          : check.url;

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

function renderOverviewTiles() {
  if (!tileStatusEl || !tileHealthEl || !tileLatencyEl) return;

  const activeChecks = getActiveChecks();
  const totals = metricsFromChecks(activeChecks);

  tileStatusEl.innerHTML = `
    <ul class="tile-legend">
      <li><span class="dot ok"></span>Friska: ${totals.healthy}</li>
      <li><span class="dot danger"></span>Felande: ${totals.failing}</li>
      <li><span class="dot warn"></span>Ej körda: ${totals.untested}</li>
    </ul>
  `;

  const executedChecks = activeChecks.filter((check) => check.lastResult);
  const healthScore = executedChecks.length
    ? Math.round((executedChecks.filter((check) => check.lastResult.ok).length / executedChecks.length) * 100)
    : 0;

  tileHealthEl.innerHTML = `
    <div class="tile-score ${healthScore >= 80 ? 'ok' : healthScore >= 50 ? 'warn' : 'danger'}">${healthScore}</div>
    <p class="muted">Health score baserad på senaste körning.</p>
  `;

  const latencyChecks = activeChecks
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

function renderScomAlerts() {
  if (!scomAlertsEl) return;

  if (!scomAlerts.length) {
    scomAlertsEl.innerHTML = '<tr><td colspan="4" class="muted">Inga synkade SCOM alerts ännu.</td></tr>';
    return;
  }

  scomAlertsEl.innerHTML = scomAlerts
    .slice(0, 6)
    .map((alert) => `
      <tr>
        <td>${alert.title}</td>
        <td><span class="status ${alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warn' : 'ok'}">${alert.severity}</span></td>
        <td>${alert.source}</td>
        <td>${new Date(alert.updatedAt).toLocaleString('sv-SE')}</td>
      </tr>
    `)
    .join('');
}

function rerenderAll() {
  checks = getChecks();
  renderDashboardSelect();
  renderMetrics();
  renderTiles();
  renderRecent();
  renderOverviewTiles();
  renderScomAlerts();
}

dashboardFilterEl?.addEventListener('change', () => {
  activeDashboardId = dashboardFilterEl.value;
  saveActiveDashboardId(activeDashboardId);
  rerenderAll();
});

statusFilterEl?.addEventListener('change', renderRecent);
timeFilterEl?.addEventListener('change', renderRecent);

dashboardFormEl?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(dashboardFormEl);

  dashboards.push({
    id: createId('dashboard'),
    name: String(data.get('name') || '').trim(),
    description: String(data.get('description') || '').trim(),
    createdAt: new Date().toISOString()
  });

  saveDashboards(dashboards);
  activeDashboardId = dashboards[dashboards.length - 1].id;
  saveActiveDashboardId(activeDashboardId);
  dashboardFormEl.reset();
  rerenderAll();
});

deleteDashboardBtn?.addEventListener('click', () => {
  if (dashboards.length <= 1) return;

  const fallbackDashboardId = dashboards.find((dashboard) => dashboard.id !== activeDashboardId)?.id;
  if (!fallbackDashboardId) return;

  checks = checks.map((check) => {
    if ((check.dashboardId || 'dashboard-default') === activeDashboardId) {
      return { ...check, dashboardId: fallbackDashboardId };
    }
    return check;
  });

  dashboards = dashboards.filter((dashboard) => dashboard.id !== activeDashboardId);
  saveDashboards(dashboards);
  saveChecks(checks);

  activeDashboardId = fallbackDashboardId;
  saveActiveDashboardId(activeDashboardId);
  rerenderAll();
});

rerenderAll();
