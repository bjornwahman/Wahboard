# Wahboard

Ett modernt monitoreringsdashboard-system inspirerat av Squaredup DS.

## Vision
Wahboard ska ge driftteam en enhetlig vy för monitorering, automatisering och integration med Microsoft SCOM.

## Kärnfunktioner (MVP)

1. **REST API-monitorer**
   - Skapa monitorer mot valfria HTTP/HTTPS-endpoints.
   - Stöd för metod, headers, body, auth och assertions.
   - Schemalagd exekvering och historik.

2. **PowerShell-exekvering**
   - Kör PowerShell-skript säkert i isolerad execution worker.
   - Visualisera output (tabell, text, timeseries).
   - Logga exit code, stderr och runtime.

3. **SCOM SDK-koppling**
   - Synk av monitor- och alertdata via en dedikerad adapter.
   - Mappa SCOM entities till Wahboard-domänobjekt.

4. **Dashboard & visualisering**
   - Anpassningsbara dashboards med widgets.
   - Widgettyper: statuskort, trendgraf, tabell, alertlista.

## Föreslagen arkitektur

Se detaljer i:
- [docs/architecture.md](docs/architecture.md)
- [docs/mvp-roadmap.md](docs/mvp-roadmap.md)
- [docs/api-contract.md](docs/api-contract.md)

## Snabbstart (designfas)

Detta repo innehåller i nuläget en genomarbetad blueprint för implementation.
Nästa steg är att välja tech stack och påbörja scaffolding enligt roadmap.
