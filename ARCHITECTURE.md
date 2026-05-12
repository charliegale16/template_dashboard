# GridFlow Analytics — Query & Calculated Metrics Architecture

## 1. System Overview

The analytics system is built around a declarative query engine that powers all widgets. Every visualization is derived from a structured query:

```
Dataset → Filters → Grouping → Metrics → Output
```

No widget performs direct data manipulation outside this pipeline.

## 2. Core Design Principle

The system replaces spreadsheet-like logic (e.g. `COUNTIF`, `SUMIF`) with a structured, composable query engine. Instead of formulas, all logic is represented as:

- filters
- aggregations
- groupings
- calculated metrics

## 3. Query Engine Architecture

### 3.1 WidgetQuery Model

All widgets are defined using a single query object:

```ts
WidgetQuery = {
  datasetId: string,
  datasetVersionId?: string,

  filters: FilterCondition[],

  groupBy?: string[],

  metric: MetricDefinition,

  calculatedMetrics?: CalculatedMetric[]
}
```

### 3.2 Execution Pipeline

All widgets follow a deterministic execution flow:

1. Load dataset (latest or pinned version)
2. Apply dashboard-level filters
3. Apply widget-level filters
4. Apply grouping logic
5. Apply metric aggregation
6. Apply calculated metrics (if any)
7. Return visualization-ready output

## 4. Filtering System Architecture

### 4.1 Filter Model

```ts
FilterCondition = {
  column: string,
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "startsWith" | "endsWith",
  value: any
}
```

### 4.2 Two-Layer Filtering System

**Layer 1: Dashboard Filters (Global)**

Applied to all widgets in a dashboard. Examples:

- date range
- region
- segment

**Layer 2: Widget Filters (Local)**

Applied only to individual widgets. Examples:

- `status = "active"`
- `product = "Pro"`

### 4.3 Filter Execution Order

Filters are always applied in this order:

```
Dataset
→ Dashboard Filters
→ Widget Filters
→ Grouping
→ Metrics
```

## 5. Aggregation Engine

### 5.1 Supported Aggregations

- `COUNT`
- `SUM`
- `AVG`
- `MIN`
- `MAX`

### 5.2 Aggregation Model

```ts
MetricDefinition = {
  type: "count" | "sum" | "avg" | "min" | "max",
  column?: string
}
```

### 5.3 Execution Rules

- Aggregations are executed server-side only
- Aggregations must operate on filtered datasets
- Aggregations must support grouped data

## 6. Grouping Engine

### 6.1 Grouping Model

```ts
groupBy: string[]
```

### 6.2 Grouping Behavior

Grouping supports:

- categorical grouping (region, status, product)
- time-series grouping (date, month, week)
- numeric bucketing (future extension)

### 6.3 Output Format

Grouped data must return:

- keys (group labels)
- aggregated values

Used directly for:

- line charts
- bar charts
- comparison charts

## 7. Calculated Metrics System

### 7.1 Concept

Calculated metrics replicate spreadsheet-style logic such as `COUNTIF`, `SUMIF`, `AVGIF`, but implemented as structured query transformations.

### 7.2 Calculated Metric Model

```ts
CalculatedMetric = {
  name: string,
  aggregation: "count" | "sum" | "avg",
  column?: string,
  conditions: FilterCondition[]
}
```

### 7.3 Execution Logic

Calculated metrics are executed **after** base aggregation:

1. Apply base filters
2. Apply grouping
3. Compute base metric
4. Apply calculated metric conditions
5. Return final result

### 7.4 Example Translation

**User Intent:** "Active users per day"

**Internal Representation:**

```ts
{
  metric: { type: "count", column: "user_id" },
  filters: [
    { column: "status", operator: "eq", value: "active" }
  ],
  groupBy: ["date"]
}
```

## 8. Widget Abstraction Layer

Widgets are **pure renderers**.

**Responsibilities:**

- render query output
- display visualization
- handle UI interaction

**Not responsible for:**

- filtering logic
- aggregation logic
- data fetching
- computation

## 9. System Boundaries

| Layer | Responsibility |
|---|---|
| **UI Layer** | Renders data only — no business logic |
| **Query Layer** | Handles all transformations — deterministic execution engine |
| **Data Layer** | Stores raw + versioned datasets — never mutated in-place |

## 10. Future Extensions

This architecture is designed to support:

- AI-generated queries
- natural language analytics
- pivot-table functionality
- formula-based derived fields
- multi-dataset joins
- advanced calculated fields (spreadsheet-level complexity)

## 11. Key Constraint Rules

- No raw formulas executed in UI
- No direct data manipulation in widgets
- All transformations must pass through Query Engine
- Dataset versions must remain immutable
- Query execution must be deterministic and server-side
