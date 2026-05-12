## Calculated Metrics & Spreadsheet-Style Query Engine

- [ ] Build calculated metrics architecture
- [ ] Build generic aggregation engine
- [ ] Build generic filtering engine
- [ ] Build grouping engine
- [ ] Add spreadsheet-style metric capabilities
- [ ] Integrate calculated metrics into widget system

---

## Core Query Model

- [ ] Create WidgetQuery schema
- [ ] Add datasetId support
- [ ] Add datasetVersionId support
- [ ] Add metric configuration model
- [ ] Add filter configuration model
- [ ] Add groupBy configuration support

---

## Aggregation Engine

- [ ] Create reusable aggregation engine
- [ ] Support COUNT aggregation
- [ ] Support SUM aggregation
- [ ] Support AVG aggregation
- [ ] Support MIN aggregation
- [ ] Support MAX aggregation

### Requirements

- Aggregations must execute server-side
- Aggregations must be reusable across all widget types
- Aggregations must support filtered datasets
- Aggregations must support grouped datasets

---

## Filtering Engine

- [ ] Create reusable filter engine
- [ ] Support multiple filter conditions
- [ ] Support AND logic initially
- [ ] Add support for:
  - equals
  - not equals
  - greater than
  - less than
  - contains
  - startsWith

---

## Grouping Engine

- [ ] Create reusable grouping engine
- [ ] Support grouping by:
  - date
  - category
  - region
  - status
  - numeric buckets

---

## Widget Query Execution Pipeline

- [ ] Build deterministic query execution flow

---

## Calculated Metric Architecture

- [ ] Create CalculatedMetric schema
- [ ] Add calculated metric support to WidgetQuery
- [ ] Create reusable metric evaluation engine

---

## Supported Calculated Metrics

- [ ] COUNTIF-style metrics
- [ ] SUMIF-style metrics
- [ ] AVGIF-style metrics

---

## Calculated Metric UI

- [ ] Add metric builder UI section
- [ ] Add aggregation type selector
- [ ] Add conditional filter builder
- [ ] Add target column selector

---

## KPI Widget Integration

- [ ] Connect calculated metrics to KPI widgets
- [ ] Support single-value metric rendering
- [ ] Support filtered aggregation rendering

---

## Derived Fields

- [ ] Add derived field architecture
- [ ] Support computed columns
- [ ] Support arithmetic operations:
  - addition
  - subtraction
  - multiplication
  - division

---

## Formula System

- [ ] Create formula parser architecture
- [ ] Add safe formula execution layer
- [ ] Prevent arbitrary code execution

---

## Pivot-Style Analytics

- [ ] Add pivot-style grouping support
- [ ] Add multi-group aggregation support
- [ ] Support nested categorical breakdowns

---

## Comparison Metrics

- [ ] Add comparison metric architecture
- [ ] Support period-over-period comparisons
- [ ] Support dataset version comparisons
