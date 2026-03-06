import { getChecks, saveChecks, getSettings } from './app.js';

const form = document.getElementById('check-form');
const tableBody = document.getElementById('checks-table');
const runAllBtn = document.getElementById('run-all');
let checks = getChecks();

function rowTemplate(check, index) {
  const result = check.lastResult;
  const statusClass = !result ? 'warn' : result.ok ? 'ok' : 'danger';
  const statusText = !result ? 'Ej körd' : result.ok ? `OK (${result.status})` : `Fel (${result.status || 'N/A'})`;

  return `
    <tr>
      <td>${check.name}</td>
      <td>${check.url}</td>
      <td><span class="status ${statusClass}">${statusText}</span></td>
      <td>${result?.latencyMs ? `${result.latencyMs} ms` : '-'}</td>
      <td>
        <button data-action="run" data-index="${index}" class="secondary">Kör</button>
        <button data-action="delete" data-index="${index}" class="danger">Ta bort</button>
      </td>
    </tr>
  `;
}

function render() {
  if (!checks.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="muted">Inga checks än.</td></tr>';
    return;
  }
  tableBody.innerHTML = checks.map(rowTemplate).join('');
}

async function runCheck(index) {
  const check = checks[index];
  const settings = getSettings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.defaultTimeoutMs);
  const start = performance.now();

  try {
    const response = await fetch(check.url, {
      method: check.method,
      signal: controller.signal
    });
    const latencyMs = Math.round(performance.now() - start);
    check.lastResult = {
      ok: response.status === Number(check.expectedStatus),
      status: response.status,
      latencyMs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    check.lastResult = {
      ok: false,
      status: null,
      latencyMs: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
      message: error.name === 'AbortError' ? 'Timeout' : 'Network error'
    };
  } finally {
    clearTimeout(timeout);
    saveChecks(checks);
    render();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);

  checks.push({
    name: data.get('name'),
    url: data.get('url'),
    method: data.get('method'),
    expectedStatus: Number(data.get('expectedStatus')),
    intervalSeconds: Number(data.get('intervalSeconds')),
    createdAt: new Date().toISOString(),
    lastResult: null
  });

  saveChecks(checks);
  form.reset();
  render();
});

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;

  if (action === 'delete') {
    checks.splice(index, 1);
    saveChecks(checks);
    render();
  }

  if (action === 'run') {
    runCheck(index);
  }
});

runAllBtn.addEventListener('click', async () => {
  for (let i = 0; i < checks.length; i += 1) {
    await runCheck(i);
  }
});

render();
