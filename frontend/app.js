const STORAGE_KEYS = {
  checks: 'wahboard.checks',
  settings: 'wahboard.settings',
  scomIntegration: 'wahboard.integrations.scom'
};

const defaultSettings = {
  defaultTimeoutMs: 4000,
  notificationEmail: '',
  autoRefreshSeconds: 30,
  environmentLabel: 'production'
};

const defaultScomIntegration = {
  managementServer: '',
  managementGroup: '',
  username: '',
  password: '',
  syncIntervalMinutes: 5,
  enabled: false,
  lastConnectionStatus: 'not-tested',
  lastConnectionCheckedAt: null,
  lastSyncStatus: 'not-started',
  lastSyncAt: null,
  lastSyncSummary: ''
};

export function getSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
}

export function saveSettings(nextSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(nextSettings));
}

export function getChecks() {
  const raw = localStorage.getItem(STORAGE_KEYS.checks);
  return raw ? JSON.parse(raw) : [];
}

export function saveChecks(checks) {
  localStorage.setItem(STORAGE_KEYS.checks, JSON.stringify(checks));
}

export function getScomIntegration() {
  const raw = localStorage.getItem(STORAGE_KEYS.scomIntegration);
  return raw ? { ...defaultScomIntegration, ...JSON.parse(raw) } : { ...defaultScomIntegration };
}

export function saveScomIntegration(nextIntegration) {
  localStorage.setItem(STORAGE_KEYS.scomIntegration, JSON.stringify(nextIntegration));
}

export function setActiveNav() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav a').forEach((link) => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });
}

setActiveNav();
