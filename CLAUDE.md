# Claude Code Instructions — GridFlow Analytics

## Core Mission

You are working on **GridFlow Analytics**, a spreadsheet-native analytics platform that transforms CSV, Excel, and Google Sheets data into interactive dashboards, KPI widgets, and executive reports.

The system is data-driven, modular, and configuration-based.

---

## Primary Engineering Philosophy

- Treat the system as: **Dataset → Widget → Dashboard → Report**
- Everything must be configuration-driven, not hardcoded
- Avoid duplicating logic across widgets or dashboards
- Prefer reusable abstractions over one-off implementations
- Never introduce mock data unless explicitly requested
- Never leave incomplete logic or placeholder implementations

---

## Architecture Rules

### Feature-Based Structure

All code must be organized into feature domains:

```
/features/auth
/features/datasets
/features/widgets
/features/dashboards
/features/reports
/features/integrations
```

Each feature contains:

- `components`
- `services`
- `hooks`
- `types`
- `utils`

---

## Data System Rules

### Dataset Model

- All uploaded files (CSV, Excel) become datasets
- Re-uploads create **NEW dataset versions** (never overwrite)
- Widgets must optionally bind to:
  - Latest dataset version, OR
  - Pinned dataset version

### Data Flow

All data must follow:

```
Ingestion → Normalization → Storage (Postgres) → Query Layer → Visualization
```

> Never query external sources directly from UI components.

---

## Widget System Rules

Widgets are the **core abstraction**.

### Requirements

- Fully config-driven
- Independent of UI pages
- Reusable across dashboards

### Widget Config Includes

- Metric definitions
- Aggregation rules (`sum`, `avg`, `count`, etc.)
- Filters (date, category, numeric)
- Visualization type (line, bar, KPI, comparison)
- Styling options
- Comparison modes

### Widget Constraints

- No hardcoded chart logic inside pages
- All visualization logic must be reusable components

---

## Dashboard System Rules

- Dashboards are collections of widgets
- Layout must be persisted in database
- Supports: drag, resize, reposition

### Layout Model

| Property | Description |
|---|---|
| `x`, `y` | Coordinates |
| `width`, `height` | Dimensions |
| `widgetId` | Widget reference |

Layout changes must be saved (debounced allowed).

---

## Google Sheets Integration Rules

- **NEVER** call Google Sheets API directly on dashboard render
- All Google Sheets data must be cached in PostgreSQL
- Sync must be controlled via background jobs

### Sync Rules

- Incremental updates preferred
- Avoid full re-fetch unless necessary
- Respect API limits strictly
- Support manual refresh
- Support scheduled sync intervals

---

## Performance Rules

- Minimize client-side data processing
- Prefer server-side aggregation
- Batch DB updates where possible
- Avoid redundant API calls
- Optimize dashboard load time

---

## UI/UX Principles

- Enterprise-grade minimal UI
- Clean grid-based layouts
- Fast interactions (<100ms perceived updates)
- Widgets must feel modular and draggable
- Maintain consistent spacing and typography system

---

## Development Workflow Rules

### Before Implementing Features

1. Understand the dataset → widget → dashboard flow
2. Identify reusable abstractions
3. Avoid duplication across features
4. Ensure schema consistency

### After Completing Work

- Update `TASKS.md` accordingly

---

## Prohibited Patterns

| Pattern | Reason |
|---|---|
| Hardcoding dataset values in widgets | Violates config-driven architecture |
| Direct API calls in UI components | Bypasses the query layer |
| Mixing dashboard layout logic with widget logic | Breaks separation of concerns |
| Overengineering early abstractions | Adds unnecessary complexity |
| Bypassing dataset versioning system | Breaks data integrity |

---

## Product Reminder

> **GridFlow Analytics** is a spreadsheet-native analytics engine for SMBs to build dashboards and reports without BI complexity.
