import { getChecks, getSettings } from './app.js';

const checks = getChecks();
const settings = getSettings();

const totals = {
  total: checks.length,
  healthy: checks.filter((c) => c.lastResult?.ok).length,
  failing: checks.filter((c) => c.lastResult && !c.lastResult.ok).length,
  untested: checks.filter((c) => !c.lastResult).length
};

const metricsEl = document.getElementById('metrics');
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

const recentEl = document.getElementById('recent-results');
const ordered = [...checks]
  .sort((a, b) => new Date(b.lastResult?.timestamp || 0) - new Date(a.lastResult?.timestamp || 0))
  .slice(0, 8);

if (!ordered.length) {
  recentEl.innerHTML = '<tr><td colspan="4" class="muted">Inga checks tillagda ännu.</td></tr>';
} else {
  ordered.forEach((check) => {
    const statusClass = !check.lastResult ? 'warn' : check.lastResult.ok ? 'ok' : 'danger';
    const statusText = !check.lastResult ? 'Ej körd' : check.lastResult.ok ? 'OK' : 'Fel';
    recentEl.innerHTML += `
      <tr>
        <td>${check.name}</td>
        <td>${check.url}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${check.lastResult?.timestamp ? new Date(check.lastResult.timestamp).toLocaleString('sv-SE') : '-'}</td>
      </tr>
    `;
  });
}
