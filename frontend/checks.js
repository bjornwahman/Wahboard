import { getChecks, saveChecks, getSettings } from './app.js';

const form = document.getElementById('check-form');
const tableBody = document.getElementById('checks-table');
const runAllBtn = document.getElementById('run-all');
const runDueBtn = document.getElementById('run-due');
const typeSelect = document.getElementById('check-type');
const restFields = Array.from(document.querySelectorAll('.rest-field'));
const kustoFields = Array.from(document.querySelectorAll('.kusto-field'));
const powershellFields = Array.from(document.querySelectorAll('.powershell-field'));

let checks = getChecks();

function toggleFieldVisibility() {
  const type = typeSelect.value;

  restFields.forEach((field) => {
    field.style.display = type === 'rest' ? 'flex' : 'none';
  });

  kustoFields.forEach((field) => {
    field.style.display = type === 'kusto' ? 'flex' : 'none';
  });

  powershellFields.forEach((field) => {
    field.style.display = type === 'powershell' ? 'flex' : 'none';
  });
}

function outputSummary(result) {
  if (!result) return '-';
  if (result.output) return result.output.slice(0, 40);
  if (result.message) return result.message;
  return '-';
}

function rowTemplate(check, index) {
  const result = check.lastResult;
  const statusClass = !result ? 'warn' : result.ok ? 'ok' : 'danger';
  const statusText = !result ? 'Ej körd' : result.ok ? 'OK' : `Fel (${result.status || result.message || 'N/A'})`;

  let typeText = 'REST';
  let targetText = check.url;
  if (check.type === 'kusto') {
    typeText = 'Kusto';
    targetText = `${check.kustoDatabase || '-'} / ${check.kustoQuery || '-'}`;
  }
  if (check.type === 'powershell') {
    typeText = 'PowerShell';
    targetText = 'Lokalt script (simulerad worker)';
  }

  return `
    <tr>
      <td>${typeText}</td>
      <td>${check.name}</td>
      <td>${targetText}</td>
      <td><span class="status ${statusClass}">${statusText}</span></td>
      <td>${result?.latencyMs ? `${result.latencyMs} ms` : '-'}</td>
      <td>${outputSummary(result)}</td>
      <td>
        <button data-action="run" data-index="${index}" class="secondary">Kör</button>
        <button data-action="delete" data-index="${index}" class="danger">Ta bort</button>
      </td>
    </tr>
  `;
}

function render() {
  if (!checks.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="muted">Inga checks än.</td></tr>';
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
      timestamp: new Date().toISOString(),
      output: `HTTP ${response.status}`
    };
  } catch (error) {
    check.lastResult = {
      ok: false,
      status: null,
      latencyMs: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
      message: error.name === 'AbortError' ? 'Timeout' : 'Network error',
      output: 'Ingen respons'
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
        : `Query körd i ${database}`,
    output: `Rows: ${simulatedRows}`
  };
}

async function runPowerShellCheck(check) {
  const settings = getSettings();
  const start = performance.now();
  const timeout = Number(check.scriptTimeoutMs) || settings.defaultTimeoutMs;
  const script = String(check.script || '').trim();

  const simulatedDuration = Math.round(100 + Math.random() * 1200);
  const timedOut = simulatedDuration > timeout;
  const output = timedOut
    ? ''
    : `PS> Körning klar\nServiceCount=${Math.floor(Math.random() * 5) + 1}\nState=Running`;

  check.lastResult = {
    ok: !timedOut && (!check.expectedText || output.includes(check.expectedText)),
    status: timedOut ? 'timeout' : 0,
    latencyMs: timedOut ? timeout : simulatedDuration,
    timestamp: new Date().toISOString(),
    message: !script
      ? 'Skript saknas'
      : timedOut
        ? `Execution worker timeout (${timeout} ms)`
        : 'Execution worker slutförde skript i isolerad sandbox (simulerat).',
    output: script ? (timedOut ? 'Execution avbruten p.g.a timeout.' : output) : 'Inget script definierat.'
  };
}

async function runCheck(index) {
  const check = checks[index];

  if (check.type === 'kusto') {
    await runKustoCheck(check);
  } else if (check.type === 'powershell') {
    await runPowerShellCheck(check);
  } else {
    await runRestCheck(check);
  }

  check.lastRunAt = new Date().toISOString();
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
    lastRunAt: null,
    lastResult: null
  };

  if (type === 'kusto') {
    checks.push({
      ...baseCheck,
      kustoDatabase: data.get('kustoDatabase'),
      kustoQuery: data.get('kustoQuery'),
      expectedRows: Number(data.get('expectedRows'))
    });
  } else if (type === 'powershell') {
    checks.push({
      ...baseCheck,
      script: data.get('script'),
      expectedText: data.get('expectedText'),
      scriptTimeoutMs: Number(data.get('scriptTimeoutMs'))
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

runDueBtn?.addEventListener('click', async () => {
  const now = Date.now();
  for (let i = 0; i < checks.length; i += 1) {
    const check = checks[i];
    const lastRun = check.lastRunAt ? new Date(check.lastRunAt).getTime() : 0;
    const dueMs = (Number(check.intervalSeconds) || 0) * 1000;
    if (!lastRun || now - lastRun >= dueMs) {
      await runCheck(i);
    }
  }
});

typeSelect.addEventListener('change', toggleFieldVisibility);

toggleFieldVisibility();
render();
