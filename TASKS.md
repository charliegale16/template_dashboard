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
