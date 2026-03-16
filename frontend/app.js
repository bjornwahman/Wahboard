const STORAGE_KEYS = {
  checks: 'wahboard.checks',
  settings: 'wahboard.settings',
  dashboards: 'wahboard.dashboards',
  activeDashboardId: 'wahboard.activeDashboardId',
  scomIntegration: 'wahboard.integrations.scom',
  scomAlerts: 'wahboard.integrations.scom.alerts'
};

const defaultSettings = {
  defaultTimeoutMs: 4000,
  notificationEmail: '',
  autoRefreshSeconds: 30,
  environmentLabel: 'production',
  azureTenantId: '',
  azureClientId: '',
  azureClientSecret: '',
  azureKustoClusterUrl: '',
  azureKustoDatabase: ''
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

const defaultDashboards = [
  {
    id: 'dashboard-default',
    name: 'Standarddashboard',
    description: 'Gemensam överblick för checks.',
    createdAt: new Date().toISOString()
  }
];

export function getSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
}

export function saveSettings(nextSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(nextSettings));
}

export function getDashboards() {
  const raw = localStorage.getItem(STORAGE_KEYS.dashboards);
  const dashboards = raw ? JSON.parse(raw) : defaultDashboards;
  if (!dashboards.length) {
    saveDashboards(defaultDashboards);
    return [...defaultDashboards];
  }
  return dashboards;
}

export function saveDashboards(dashboards) {
  localStorage.setItem(STORAGE_KEYS.dashboards, JSON.stringify(dashboards));
}

export function getActiveDashboardId() {
  return localStorage.getItem(STORAGE_KEYS.activeDashboardId) || getDashboards()[0].id;
}

export function saveActiveDashboardId(dashboardId) {
  localStorage.setItem(STORAGE_KEYS.activeDashboardId, dashboardId);
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

export function getScomAlerts() {
  const raw = localStorage.getItem(STORAGE_KEYS.scomAlerts);
  return raw ? JSON.parse(raw) : [];
}

export function saveScomAlerts(alerts) {
  localStorage.setItem(STORAGE_KEYS.scomAlerts, JSON.stringify(alerts));
}

export function clearScomAlerts() {
  localStorage.removeItem(STORAGE_KEYS.scomAlerts);
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
