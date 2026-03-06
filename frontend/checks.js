import { getChecks, saveChecks, getSettings } from './app.js';

const form = document.getElementById('check-form');
const tableBody = document.getElementById('checks-table');
const runAllBtn = document.getElementById('run-all');
const typeSelect = document.getElementById('check-type');
const restFields = Array.from(document.querySelectorAll('.rest-field'));
const kustoFields = Array.from(document.querySelectorAll('.kusto-field'));

let checks = getChecks();

function toggleFieldVisibility() {
  const isKusto = typeSelect.value === 'kusto';

  restFields.forEach((field) => {
    field.style.display = isKusto ? 'none' : 'flex';
  });

  kustoFields.forEach((field) => {
    field.style.display = isKusto ? 'flex' : 'none';
  });
}

function rowTemplate(check, index) {
  const result = check.lastResult;
  const statusClass = !result ? 'warn' : result.ok ? 'ok' : 'danger';
  const statusText = !result ? 'Ej körd' : result.ok ? 'OK' : `Fel (${result.status || result.message || 'N/A'})`;
  const typeText = check.type === 'kusto' ? 'Kusto' : 'REST';
  const targetText = check.type === 'kusto'
    ? `${check.kustoDatabase || '-'} / ${check.kustoQuery || '-'}`
    : check.url;

  return `
    <tr>
      <td>${typeText}</td>
      <td>${check.name}</td>
      <td>${targetText}</td>
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
    tableBody.innerHTML = '<tr><td colspan="6" class="muted">Inga checks än.</td></tr>';
    return;
  }
  tableBody.innerHTML = checks.map(rowTemplate).join('');
}

async function runRestCheck(check) {
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
  }
}

async function runKustoCheck(check) {
  const start = performance.now();
  const settings = getSettings();
  const hasAzureAuth = Boolean(settings.azureTenantId && settings.azureClientId && settings.azureClientSecret);
  const hasKustoTarget = Boolean(settings.azureKustoClusterUrl && (check.kustoDatabase || settings.azureKustoDatabase));

  const simulatedRows = Math.floor(Math.random() * 5);
  const database = check.kustoDatabase || settings.azureKustoDatabase;

  check.lastResult = {
    ok: hasAzureAuth && hasKustoTarget && simulatedRows >= Number(check.expectedRows || 1),
    status: hasAzureAuth && hasKustoTarget ? `rows:${simulatedRows}` : null,
    latencyMs: Math.round(performance.now() - start),
    timestamp: new Date().toISOString(),
    message: !hasAzureAuth
      ? 'Azure autentisering saknas i System'
      : !hasKustoTarget
        ? 'Kusto cluster/databas saknas'
        : `Query körd i ${database}`
  };
}

async function runCheck(index) {
  const check = checks[index];

  if (check.type === 'kusto') {
    await runKustoCheck(check);
  } else {
    await runRestCheck(check);
  }

  saveChecks(checks);
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const type = data.get('type');

  const baseCheck = {
    type,
    name: data.get('name'),
    intervalSeconds: Number(data.get('intervalSeconds')),
    createdAt: new Date().toISOString(),
    lastResult: null
  };

  if (type === 'kusto') {
    checks.push({
      ...baseCheck,
      kustoDatabase: data.get('kustoDatabase'),
      kustoQuery: data.get('kustoQuery'),
      expectedRows: Number(data.get('expectedRows'))
    });
  } else {
    checks.push({
      ...baseCheck,
      url: data.get('url'),
      method: data.get('method'),
      expectedStatus: Number(data.get('expectedStatus'))
    });
  }

  saveChecks(checks);
  form.reset();
  typeSelect.value = type;
  toggleFieldVisibility();
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

typeSelect.addEventListener('change', toggleFieldVisibility);

toggleFieldVisibility();
render();
