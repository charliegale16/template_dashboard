import React from 'react'
import KPICard from '../../widgets/KPICard'
import LineChart from '../../widgets/LineChart'
import BarChart from '../../widgets/BarChart'
import DataTable from '../../widgets/DataTable'

const WIDGET_SPAN = {
  kpi_total: 'col-span-1',
  revenue_over_time: 'col-span-2',
  top_categories: 'col-span-2',
  data_table: 'col-span-full',
}

/**
 * Maps widget IDs to their component + grid span.
 * Add new widget types here without touching DashboardRenderer.
 */
const WIDGET_REGISTRY = {
  kpi_total: { component: KPICard, span: 'col-span-1' },
  revenue_over_time: { component: LineChart, span: 'col-span-2' },
  top_categories: { component: BarChart, span: 'col-span-2' },
  data_table: { component: DataTable, span: 'col-span-full' },
}

export default function WidgetGrid({ widgets, data, config }) {
  if (!widgets?.length) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        No widgets configured. Open Settings to choose what to display.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-min">
      {widgets.map((id) => {
        const entry = WIDGET_REGISTRY[id]
        if (!entry) return null
        const { component: Widget, span } = entry
        return (
          <div key={id} className={span}>
            <Widget data={data} config={config} />
          </div>
        )
      })}
    </div>
  )
}
