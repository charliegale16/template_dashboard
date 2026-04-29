import React from 'react'
import KPICard from './KPICard'
import BarChart from './BarChart'
import LineChart from './LineChart'
import DataTable from './DataTable'

/**
 * CustomWidget renders any chart type based entirely on widget.config.
 * Column selections are stored as direct header names (not role keys) and
 * bridged into the role-based config that underlying chart components expect.
 *
 * widget.config shape:
 *   chartType:  'kpi' | 'kpi_count' | 'bar' | 'bar_count' | 'line' | 'table'
 *   title:      optional display title
 *   valueColumn: column header for KPI / line chart value
 *   xColumn:    column header for bar chart x-axis
 *   yColumn:    column header for bar chart y-axis
 *   dateColumn: column header for line chart date axis
 */
export default function CustomWidget({ data, config }) {
  const m = config?.mappings ?? {}
  const { chartType, title, valueColumn, xColumn, yColumn, dateColumn } = m

  if (!chartType) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[128px] gap-2 border-2 border-dashed border-gray-200">
        <span className="text-2xl">⚙️</span>
        <p className="text-sm font-semibold text-gray-700">Custom Widget</p>
        <p className="text-xs text-gray-400 text-center px-4">
          Enter edit mode and click the gear icon to configure this widget.
        </p>
      </div>
    )
  }

  // Build a synthetic config that bridges custom column selections into
  // the role keys the underlying chart components expect
  function withMappings(overrides) {
    return { ...config, mappings: { ...m, ...overrides } }
  }

  switch (chartType) {
    case 'kpi':
      return (
        <KPICard
          data={data}
          config={withMappings({ revenue: valueColumn })}
          variant="revenue"
        />
      )

    case 'kpi_count':
      return <KPICard data={data} config={config} variant="orders" />

    case 'bar':
      return (
        <BarChart
          data={data}
          config={withMappings({ category: xColumn, revenue: yColumn })}
          xRole="category"
          yRole="revenue"
          title={title}
        />
      )

    case 'bar_count':
      return (
        <BarChart
          data={data}
          config={withMappings({ category: xColumn })}
          xRole="category"
          countMode
          title={title}
        />
      )

    case 'line':
      return (
        <LineChart
          data={data}
          config={withMappings({ date: dateColumn, revenue: valueColumn })}
          title={title}
        />
      )

    case 'table':
      return <DataTable data={data} config={config} />

    default:
      return null
  }
}

export const CUSTOM_CHART_TYPES = [
  { id: 'kpi',       label: 'KPI — Total',    icon: '📊', description: 'Sum a numeric column with trend' },
  { id: 'kpi_count', label: 'KPI — Count',    icon: '🔢', description: 'Row count with trend' },
  { id: 'bar',       label: 'Bar Chart',      icon: '📉', description: 'Compare values by category' },
  { id: 'bar_count', label: 'Bar — Count',    icon: '📋', description: 'Count rows by category' },
  { id: 'line',      label: 'Line Chart',     icon: '📈', description: 'Values over time' },
  { id: 'table',     label: 'Data Table',     icon: '🗂️', description: 'Paginated raw data' },
]
