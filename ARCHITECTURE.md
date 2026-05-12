# GridFlow Analytics — Architecture

## Core Principle

The system is built around a single data pipeline:

> Dataset → Query Engine → Widget Output → Dashboard Composition

All widgets are **declarative query objects**, not hardcoded visualizations.

---

## 1. System Overview

The architecture is divided into 4 layers:

| Layer | Responsibility |
|---|---|
| **Data Layer** | Ingestion, storage, and versioning |
| **Query Layer** | Transforms raw datasets into structured outputs |
| **Widget Layer** | Maps query results into visual components |
| **Dashboard Layer** | Composes widgets with layout and global filters |

---

## 2. Data Layer (Source of Truth)

### Dataset Model

All data originates from:

- CSV uploads
- Excel uploads
- Google Sheets sync

Each dataset has:

- `datasetId`
- `datasetVersionId`
- Schema metadata
- Raw rows stored in PostgreSQL

**Rules:**

- Datasets are **immutable** per version
- Updates always create **new versions**

---

## 3. Query Engine (Core System)

This is the most critical part of the system.

### 3.1 WidgetQuery Model

Every widget is defined by a query object:

```ts
WidgetQuery = {
  datasetId: string,
  filters: FilterCondition[],
  groupBy?: string[],
  metric: {
    type: "count" | "sum" | "avg" | "min" | "max",
    column?: string
  }
}
```

---

### 3.2 Filter System (Two-Tier Model)

Filters are applied in strict order:

#### Layer 1 — Dashboard Filters (Global)

Applied to **all** widgets. Examples:

- Date range
- Region
- User segment

#### Layer 2 — Widget Filters (Local)

Applied only to a specific widget. Examples:

- `status = active`
- `product = "Pro Plan"`

**Final execution rule:**

```
finalData = apply(widgetFilters, apply(dashboardFilters, dataset))
```

---

### 3.3 Filter Condition Model

```ts
FilterCondition = {
  column: string,
  operator: "eq" | "neq" | "gt" | "lt" | "contains",
  value: any
}
```

> All filters are combined using AND logic by default.

---

### 3.4 Execution Pipeline

Every widget follows this deterministic pipeline:

| Step | Action |
|---|---|
| **1 — Load Dataset** | Fetch dataset version (latest or pinned) |
| **2 — Dashboard Filters** | Apply global filters first |
| **3 — Widget Filters** | Apply widget-specific filters second |
| **4 — Grouping** | Group rows by selected columns; supports time-series date grouping |
| **5 — Aggregation** | Apply metric transformation (see below) |
| **6 — Output Formatting** | Return KPI value or structured chart series |

**Metric aggregation types:**

| Metric | Behavior |
|---|---|
| `COUNT` | Row count or column count |
| `SUM` | Sum of column values |
| `AVG` | Average of column values |
| `MIN` / `MAX` | Extrema of column values |

---

## 4. Widget Layer

Widgets are **pure renderers of query output**.

### 4.1 Widget Structure

```ts
Widget = {
  id: string,
  type: "kpi" | "line" | "bar" | "comparison",
  query: WidgetQuery,
  layout: {
    x: number,
    y: number,
    w: number,
    h: number
  },
  config: {
    title: string,
    styling: object
  }
}
```

### 4.2 Widget Responsibilities

| Widgets ONLY | Widgets NEVER |
|---|---|
| Render output | Fetch raw data |
| Display results | Perform filtering logic |
| Handle UI interaction | Run aggregation logic |

---

## 5. Dashboard Layer

Dashboards are **containers of widgets + global state**.

### 5.1 Dashboard Structure

```ts
Dashboard = {
  id: string,
  widgets: Widget[],
  filters: DashboardFilters
}
```

### 5.2 Dashboard Filters

Applied globally across all widgets:

```ts
DashboardFilters = {
  dateRange?: string,
  region?: string,
  segment?: string
}
```

These are merged into every widget query at execution time.

### 5.3 Layout System

Each widget stores its position and size:

- Position: `x`, `y`
- Size: `w`, `h`

Layout updates are persisted immediately or debounced.

---

## 6. Google Sheets Sync Layer

### Architecture Rule

**Never** query Google Sheets directly from the UI.

```
Google Sheets → Sync Worker → Postgres Cache → Query Engine
```

### Sync Strategy

- Scheduled sync at 5–15 minute intervals
- Manual refresh option available
- Incremental updates preferred
- Row-level diffing when possible

### API Protection Rules

To avoid quota exhaustion:

- Cache all sheet data in the database
- Prevent redundant full syncs
- Detect unchanged datasets via hash/checksum

---

## 7. Filtering System Summary

### Execution Order

```
Dataset
  → Dashboard Filters   (global)
  → Widget Filters      (local)
  → Grouping
  → Metric Aggregation
  → Output
```

---

## 8. System Boundaries

### UI Layer — MUST NOT

- Perform aggregation
- Fetch raw external data
- Apply business logic

### Query Layer — MUST

- Handle all data transformations
- Be deterministic and predictable
- Be reusable across all widgets

### Data Layer — MUST

- Be versioned
- Be immutable per version
