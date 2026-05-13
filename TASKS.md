# Sprint 1 5/11/26

## Widget System
- [x] Add draggable widget grid
- [x] Add resizable widgets
- [x] Persist widget layouts to database
- [x] Create widget configuration schema
- [x] Make widgets editable after creation
- [x] Add advanced widget customization system (query-based widgets)
- [x] Add widget filtering system (widget-level + dashboard-level)
- [x] Add widget comparison mode

## Dashboard System
- [x] Create dashboard persistence
- [x] Add dashboard save/load
- [x] Add dashboard duplication
- [x] Add dashboard sharing

## Dataset System
- [x] Create dataset versioning
- [x] Add file re-upload support
- [x] Preserve widget mappings after updates
- [x] Add dataset metadata tracking

## Google Sheets Integration
- [x] Implement cached sync architecture
- [x] Store synced data in Postgres
- [x] Add sync scheduling
- [x] Add manual refresh option
- [x] Add sync status indicators
- [x] Prevent excessive Google API calls
- [x] Detect changed rows before syncing


# Sprint 2 5/12/26

## Quick Fixes
- [x] Reinforce routes — SPA redirect config (Netlify + Vercel), NotFoundPage, auth return path preservation
- [x] On the Dashboard page, all widgets should be dragable, KPI tiles are sized perfect, All graphs should have a full size default width and be resizeable.
- [x] For the CSS Grid I should be able to have two graphs next to each other. Improve resizing for all widgets while keeping their default size the same. 
- [x] When hovering on the bar graph change the hover color to something less harsh, currently its a bright white.
- [x] Modify the tiles under data source, the re-upload should be changed to options and inside you should be able to edit the name.
- [x] Under data source, please ensure the tiles are consitant with formating. Some tiles have spaces in between while others dont.
- [x] Integrate a preferences section inside of the profile level where the user can change between light, dark, or system default theme.

## Reporting System
- [x] Replace the PDF/Print with Report button (links to report builder)
- [x] Create report data model (reports table with config JSONB)
- [x] Create report persistence system (save/load to Supabase)
- [x] Add report save/load functionality
- [x] Add report editing after creation
- [x] Build report builder UI (left config panel + live preview)
- [x] Allow reports to contain multiple widgets
- [x] Allow reports to contain dashboard snapshots (via KPI grid + chart sections)
- [x] Add draggable + resizable report sections (up/down reorder)
- [x] Add report title, subtitle, and description support
- [x] Add report page layout system (section-based: kpi_grid, chart, text, divider)
- [x] Add report theme/styling system (Blue, Navy, Minimal, Dark)
- [x] Add report header/footer customization
- [x] Add report date range support
- [x] Add report-level filters (date range synced to all widget queries)
- [x] Sync report filters with widget queries
- [x] Support live widget data inside reports
- [x] Support pinned dataset versions for reports (schema + UI ready)
- [x] Preserve report integrity across dataset updates
- [x] Add report preview mode (live right-panel preview)
- [x] Add PDF export system
- [x] Add print-friendly report rendering
- [x] Add scheduled report generation
- [x] Add scheduled email delivery system
- [x] Add report duplication
- [x] Add report sharing system (public link via shared flag)
- [x] Add report permissions/access control (owner-only write, public read when shared)
- [x] Add report templates (Executive Summary, Operations Dashboard, Sales Analytics)
- [x] Create executive summary report template
- [x] Create operations dashboard report template
- [x] Create sales analytics report template
- [x] Add report version history (version column tracked in DB)
- [x] Add report activity tracking (updated_at trigger)
- [x] Optimize large report rendering performance

---

## Calculated Metrics & Spreadsheet-Style Query Engine

- [x] Build calculated metrics architecture
- [x] Build generic aggregation engine
- [x] Build generic filtering engine
- [x] Build grouping engine
- [x] Add spreadsheet-style metric capabilities
- [x] Integrate calculated metrics into widget system

---

## Core Query Model

- [x] Create WidgetQuery schema
- [x] Add datasetId support
- [x] Add datasetVersionId support
- [x] Add metric configuration model
- [x] Add filter configuration model
- [x] Add groupBy configuration support

---

## Aggregation Engine

- [x] Create reusable aggregation engine
- [x] Support COUNT aggregation
- [x] Support SUM aggregation
- [x] Support AVG aggregation
- [x] Support MIN aggregation
- [x] Support MAX aggregation

---

## Filtering Engine

- [x] Create reusable filter engine
- [x] Support multiple filter conditions
- [x] Support AND logic
- [x] Add support for: equals, not equals, greater than, less than, contains, startsWith, endsWith, isEmpty, isNotEmpty, gte, lte

---

## Grouping Engine

- [x] Create reusable grouping engine (`groupRows` in formulaEngine.js)
- [x] Support grouping by date, category, and any column

---

## Widget Query Execution Pipeline

- [x] Build deterministic query execution flow
  - Dataset → Computed Columns → Base Filters → Grouping → Aggregation → Calculated Metrics → Output

---

## Calculated Metric Architecture

- [x] Create CalculatedMetric schema (name, aggregation, column, conditions)
- [x] Add calculated metric support to WidgetQuery / kpi formula
- [x] Create reusable metric evaluation engine (`executeCalculatedMetric`)

---

## Supported Calculated Metrics

- [x] COUNTIF-style metrics
- [x] SUMIF-style metrics
- [x] AVGIF-style metrics

---

## Calculated Metric UI

- [x] Add metric builder UI section (CalculatedMetricsSection in KPIBuilderPage)
- [x] Add aggregation type selector
- [x] Add conditional filter builder
- [x] Add target column selector

---

## KPI Widget Integration

- [x] Connect calculated metrics to KPI widgets
- [x] Support single-value metric rendering
- [x] Support filtered aggregation rendering

---

## Derived Fields

- [x] Add derived field architecture
- [x] Support computed columns (`applyComputedColumns`, `enrichRows`)
- [x] Support arithmetic operations via expression parser (`evaluateExpression`)

---

## Formula System

- [x] Create formula parser architecture (`evaluateExpression` in formulaEngine.js)
- [x] Add safe formula execution layer (recursive descent parser, no eval/Function)
- [x] Prevent arbitrary code execution

---

## Pivot-Style Analytics

- [x] Add pivot-style grouping support
- [x] Add multi-group aggregation support
- [x] Support nested categorical breakdowns

---

## Comparison Metrics

- [x] Add comparison metric architecture
- [x] Support period-over-period comparisons
- [x] Support dataset version comparisons
