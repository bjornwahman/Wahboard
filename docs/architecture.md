# Architecture blueprint

## 1. Översikt

Wahboard byggs som ett modulärt system med tydlig separation mellan UI, API, scheduler och workers.

```text
[Web UI]
   |
[Backend API] -- [PostgreSQL]
   |
[Scheduler] --- dispatch ---> [Execution Workers]
                         |         |- REST Monitor Worker
                         |         |- PowerShell Worker
                         |         \- SCOM Sync Worker
                         |
                    [Message Queue]
```

## 2. Domänmodell

### Entiteter
- `Monitor`
  - `id`, `name`, `type` (`rest`, `powershell`, `scom`), `interval`, `enabled`
- `MonitorRun`
  - `id`, `monitorId`, `startedAt`, `endedAt`, `status`, `resultPayload`
- `Dashboard`
  - `id`, `name`, `layoutJson`
- `Widget`
  - `id`, `dashboardId`, `type`, `queryConfigJson`
- `Alert`
  - `id`, `source`, `severity`, `message`, `entityRef`, `createdAt`, `resolvedAt`

## 3. Komponenter

### 3.1 Backend API
Ansvar:
- CRUD för monitorer, dashboards och widgets.
- Exponera query-endpoints för monitorresultat.
- RBAC och tenant-scope.

### 3.2 Scheduler
Ansvar:
- Läsa aktiva monitorer och trigga jobb enligt cron/interval.
- Retry-policy och timeout.

### 3.3 Execution workers

#### REST worker
- Utför HTTP-anrop.
- Validerar assertions (statuskod, JSONPath, response-time).

#### PowerShell worker
- Kör script i sandboxad miljö.
- Returnerar strukturerad output (`stdout`, `stderr`, `objects`).

#### SCOM adapter worker
- Hämtar data via SCOM SDK.
- Normaliserar till Wahboard events och alerts.

## 4. Säkerhet

- API med JWT/OIDC.
- Secrets i vault (ej i databasen i klartext).
- Script execution med:
  - resursgränser (CPU/memory/time)
  - nätverkspolicy
  - signering/allowlist (senare fas)

## 5. Skalbarhet

- Horisontell skalning av workers.
- Queue-baserad backpressure.
- Partitionering av monitorer per tenant.

## 6. Observability för systemet självt

- Prometheus metrics: job duration, success rate, queue depth.
- Structured logging.
- Tracing mellan API → Scheduler → Worker.
