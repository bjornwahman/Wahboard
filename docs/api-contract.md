# API Contract (draft)

## Monitor endpoints

### `POST /api/monitors`
Skapar en monitor.

#### Request exempel (REST monitor)
```json
{
  "name": "API Health",
  "type": "rest",
  "schedule": "*/2 * * * *",
  "config": {
    "method": "GET",
    "url": "https://example.com/health",
    "headers": {
      "Authorization": "Bearer {{secret:health_token}}"
    },
    "assertions": [
      { "kind": "status", "equals": 200 },
      { "kind": "jsonpath", "path": "$.status", "equals": "ok" }
    ]
  }
}
```

### `POST /api/monitors/{id}/run`
Kör en monitor on-demand.

### `GET /api/monitors/{id}/runs`
Hämtar historiska körningar.

## PowerShell endpoints

### `POST /api/scripts/execute`
Exekverar ett PowerShell-script.

```json
{
  "script": "Get-Service | Select-Object -First 5 | ConvertTo-Json",
  "timeoutSeconds": 30,
  "parameters": {}
}
```

## Dashboard endpoints

### `POST /api/dashboards`
Skapa dashboard.

### `POST /api/dashboards/{id}/widgets`
Lägg till widget.

## SCOM endpoints

### `POST /api/integrations/scom/test-connection`
Verifiera anslutning.

### `POST /api/integrations/scom/sync`
Trigga synk.
