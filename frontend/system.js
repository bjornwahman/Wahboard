import { getSettings, saveSettings } from './app.js';

const form = document.getElementById('settings-form');
const resetBtn = document.getElementById('reset-settings');
const summaryEl = document.getElementById('settings-summary');

function populate() {
  const settings = getSettings();
  Object.entries(settings).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
  summaryEl.textContent = `Miljö ${settings.environmentLabel}, timeout ${settings.defaultTimeoutMs}ms, auto-refresh ${settings.autoRefreshSeconds}s.`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const nextSettings = {
    defaultTimeoutMs: Number(data.get('defaultTimeoutMs')),
    autoRefreshSeconds: Number(data.get('autoRefreshSeconds')),
    environmentLabel: data.get('environmentLabel'),
    notificationEmail: data.get('notificationEmail')
  };

  saveSettings(nextSettings);
  populate();
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem('wahboard.settings');
  populate();
});

populate();
