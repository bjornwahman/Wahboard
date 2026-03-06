# MVP Roadmap

## Fas 0 – Foundations (1-2 veckor)
- Monorepo setup (frontend + backend + workers).
- CI pipeline (lint, test, build).
- Basdatamodell och migrationer.

## Fas 1 – REST monitorering (2-3 veckor)
- CRUD för REST-monitorer.
- Scheduler + REST worker.
- Resultatlagring och enkel statusdashboard.

## Fas 2 – PowerShell monitorering (2-3 veckor)
- Script editor.
- Execution worker med timeout/isolation.
- Visualization av output i widget.

## Fas 3 – SCOM integration (2-4 veckor)
- SCOM connector service.
- Mapping till monitor- och alertmodell.
- UI-vy för SCOM entities/alerts.

## Fas 4 – Dashboard polish (2 veckor)
- Drag-and-drop layout.
- Widgetbibliotek.
- Filtering och tidsintervall.

## Definition of Done (MVP)
- Minst 1 dashboard kan visa data från:
  - en REST-monitor
  - ett PowerShell-script
  - en SCOM-synkad alertkälla
- Allt körbart via docker-compose i devmiljö.
