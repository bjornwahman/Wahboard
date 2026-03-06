import { getSettings, saveSettings, getScomIntegration, saveScomIntegration } from './app.js';

const settingsForm = document.getElementById('settings-form');
const resetSettingsBtn = document.getElementById('reset-settings');
const summaryEl = document.getElementById('settings-summary');

const scomForm = document.getElementById('scom-form');
const scomTestConnectionBtn = document.getElementById('scom-test-connection');
const scomSyncNowBtn = document.getElementById('scom-sync-now');
const scomResetBtn = document.getElementById('scom-reset');
const scomFeedbackEl = document.getElementById('scom-feedback');
const scomSummaryEl = document.getElementById('scom-summary');

function statusClassFrom(status) {
  if (status === 'ok' || status === 'connected' || status === 'success') return 'ok';
  if (status === 'failed' || status === 'error') return 'danger';
  return 'warn';
}

function formatTimestamp(isoDate) {
  if (!isoDate) return '-';
  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleString('sv-SE');
}

function populateSettings() {
  const settings = getSettings();
  Object.entries(settings).forEach(([key, value]) => {
    if (settingsForm.elements[key]) {
      settingsForm.elements[key].value = value;
    }
  });

  const azureConfigured = settings.azureTenantId && settings.azureClientId && settings.azureClientSecret
    ? 'Azure auth konfigurerad'
    : 'Azure auth saknas';

  summaryEl.textContent = `Miljö ${settings.environmentLabel}, timeout ${settings.defaultTimeoutMs}ms, auto-refresh ${settings.autoRefreshSeconds}s, ${azureConfigured}.`;
}

function populateScom() {
  const scom = getScomIntegration();
  Object.entries(scom).forEach(([key, value]) => {
    const field = scomForm.elements[key];
    if (!field) return;
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
      return;
    }
    field.value = value ?? '';
  });

  const connectionBadge = `<span class="status ${statusClassFrom(scom.lastConnectionStatus)}">${scom.lastConnectionStatus}</span>`;
  const syncBadge = `<span class="status ${statusClassFrom(scom.lastSyncStatus)}">${scom.lastSyncStatus}</span>`;

  scomSummaryEl.innerHTML = `
    SCOM: ${connectionBadge} (senast testad: ${formatTimestamp(scom.lastConnectionCheckedAt)}) ·
    Sync: ${syncBadge} (senast: ${formatTimestamp(scom.lastSyncAt)}) ·
    Intervall: ${scom.syncIntervalMinutes} min.
    ${scom.lastSyncSummary ? `<br />Sammanfattning: ${scom.lastSyncSummary}` : ''}
  `;
}

function readScomForm() {
  const data = new FormData(scomForm);
  return {
    ...getScomIntegration(),
    managementServer: String(data.get('managementServer') || '').trim(),
    managementGroup: String(data.get('managementGroup') || '').trim(),
    username: String(data.get('username') || '').trim(),
    password: String(data.get('password') || ''),
    syncIntervalMinutes: Number(data.get('syncIntervalMinutes')) || 5,
    enabled: scomForm.elements.enabled.checked
  };
}

function setScomFeedback(message, status = 'warn') {
  scomFeedbackEl.innerHTML = `<span class="status ${statusClassFrom(status)}">${status}</span> ${message}`;
}

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(settingsForm);
  const nextSettings = {
    defaultTimeoutMs: Number(data.get('defaultTimeoutMs')),
    autoRefreshSeconds: Number(data.get('autoRefreshSeconds')),
    environmentLabel: data.get('environmentLabel'),
    notificationEmail: data.get('notificationEmail'),
    azureTenantId: data.get('azureTenantId'),
    azureClientId: data.get('azureClientId'),
    azureClientSecret: data.get('azureClientSecret'),
    azureKustoClusterUrl: data.get('azureKustoClusterUrl'),
    azureKustoDatabase: data.get('azureKustoDatabase')
  };

  saveSettings(nextSettings);
  populateSettings();
});

resetSettingsBtn.addEventListener('click', () => {
  localStorage.removeItem('wahboard.settings');
  populateSettings();
});

scomForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = readScomForm();
  saveScomIntegration(next);
  populateScom();
  setScomFeedback('SCOM-konfigurationen sparades lokalt i Wahboard.', 'success');
});

scomTestConnectionBtn.addEventListener('click', () => {
  const next = readScomForm();
  const hasRequired = next.managementServer && next.managementGroup && next.username && next.password;

  next.lastConnectionCheckedAt = new Date().toISOString();
  if (!hasRequired) {
    next.lastConnectionStatus = 'failed';
    saveScomIntegration(next);
    populateScom();
    setScomFeedback('Fyll i management server, management group, användarnamn och lösenord innan test.', 'failed');
    return;
  }

  next.lastConnectionStatus = 'connected';
  saveScomIntegration(next);
  populateScom();
  setScomFeedback('Anslutning verifierad (simulerad): endpoint svarar och credentials ser giltiga ut.', 'connected');
});

scomSyncNowBtn.addEventListener('click', () => {
  const next = readScomForm();
  if (!next.enabled) {
    next.lastSyncStatus = 'failed';
    next.lastSyncAt = new Date().toISOString();
    next.lastSyncSummary = 'Sync stoppades eftersom integrationen inte är aktiverad.';
    saveScomIntegration(next);
    populateScom();
    setScomFeedback('Aktivera integrationen först för att kunna synka.', 'failed');
    return;
  }

  next.lastSyncStatus = 'success';
  next.lastSyncAt = new Date().toISOString();
  next.lastSyncSummary = 'Importerade 12 monitorer och 4 aktiva alerts från SCOM (simulerat).';
  saveScomIntegration(next);
  populateScom();
  setScomFeedback('SCOM-synk kördes klart och domänobjekt uppdaterades (simulerad körning).', 'success');
});

scomResetBtn.addEventListener('click', () => {
  localStorage.removeItem('wahboard.integrations.scom');
  populateScom();
  setScomFeedback('SCOM-konfiguration återställd till standardvärden.', 'warn');
});

populateSettings();
populateScom();
