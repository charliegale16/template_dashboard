# GridFlow Analytics — Project Specification

## Overview

**GridFlow Analytics** is a spreadsheet-native analytics and reporting platform that allows users to turn raw business data from CSV, Excel, and Google Sheets into interactive dashboards, KPI widgets, and automated reports.

The platform is designed to replace manual spreadsheet reporting with a lightweight, fast, and intuitive BI experience.

---

## Problem Statement

Businesses rely heavily on spreadsheets for operations, but lack:

- Real-time insights
- Visualization tools
- Automated reporting
- Structured data dashboards

Existing BI tools are either:

- Too complex (Tableau, Power BI)
- Too rigid
- Too expensive
- Not spreadsheet-native

---

## Solution

GridFlow bridges this gap by:

- Ingesting spreadsheet data
- Structuring it into datasets
- Enabling drag-and-drop dashboards
- Providing configurable KPI and chart widgets
- Supporting live Google Sheets sync (cached)

---

## Target Users

| User Type | Description |
|---|---|
| SMB Founders & Operators | Need quick business insights without BI complexity |
| Sales & Marketing Teams | Track campaign and pipeline KPIs |
| Operations Managers | Monitor operational metrics in real time |
| Agencies | Report on client data in a structured format |
| Spreadsheet Analysts | Power users transitioning from manual reporting |

---

## Core Features

### 1. Authentication & Workspaces

- Google OAuth login
- Workspace-based organization
- Multi-user support *(future)*

### 2. Data Ingestion

Users can import data via:

- CSV upload
- Excel upload
- Google Sheets API connection

All data is normalized into structured datasets.

### 3. Dataset System

- Every import creates a new **dataset version**
- Dataset versions are **immutable**
- Widgets can reference:
  - Latest version, OR
  - A pinned version
- Schema inference automatically detects:
  - Column types
  - Headers
  - Basic relationships

### 4. Dashboard System

- Dashboards are collections of widgets
- Fully persistent layout system
- Supports:
  - Drag-and-drop positioning
  - Widget resizing
- Layout is stored in the database

### 5. Widget Builder System

Core visualization engine.

**Supported widget types:**

| Widget | Description |
|---|---|
| KPI Cards | Single-metric highlights |
| Line Charts | Trend over time |
| Bar Charts | Category comparisons |
| Comparison Charts | Period-over-period or dataset comparison |

**Widget features:**

- Customizable metrics
- Aggregations (`sum`, `avg`, `count`, etc.)
- Filters (date, category, numeric ranges)
- Comparison modes (period-over-period, dataset comparison)
- Styling controls

> All widgets are fully configuration-driven.

### 6. Report Builder

- Combines dashboards or widgets into reports
- Export to PDF
- Supports reusable report templates
- Scheduled reporting *(future)*

### 7. Google Sheets Live Sync

- Optional live connection mode
- Uses **PostgreSQL cache layer** — not direct API reads
- Controlled sync intervals to respect API limits
- Incremental updates preferred
- Manual refresh supported

---

## Data Architecture

Data flows through the following layers in order:

```
1. Ingestion          →  CSV / Excel / Google Sheets
2. Normalization      →  Schema inference, type detection
3. Dataset Storage    →  PostgreSQL + versioning
4. Query Layer        →  Server-side aggregation
5. Widget Rendering   →  Config-driven visualization
6. Dashboard Layer    →  Layout composition
7. Report Generation  →  PDF export, templates
```

---

## System Constraints

| Constraint | Detail |
|---|---|
| Google API usage | Must avoid excessive calls; all data cached |
| Dashboard data | Must always use cached datasets |
| Dataset versioning | Must never be bypassed |
| Widget architecture | Must remain fully modular and reusable |
| UI layer | No direct external API calls permitted |

---

## Design Principles

- **Minimal enterprise SaaS UI** — clean, focused, distraction-free
- **Fast interaction and rendering** — <100ms perceived response
- **No-code / low-code experience** — accessible without technical knowledge
- **Modular component architecture** — reusable across the platform
- **Scalable multi-tenant foundation** — built to grow

---

## Long-Term Vision

GridFlow evolves into a lightweight BI platform positioned as:

- The **"Notion of analytics dashboards"** — flexible, composable, fast
- A **spreadsheet-to-insight automation engine**
- An **AI-assisted reporting system** *(future expansion)*

**Planned future capabilities:**

- AI-generated dashboards
- Natural language querying
- Automated insights and anomaly detection
