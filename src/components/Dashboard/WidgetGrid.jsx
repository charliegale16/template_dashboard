import React from 'react'
import KPICard from '../../widgets/KPICard'
import LineChart from '../../widgets/LineChart'
import BarChart from '../../widgets/BarChart'
import DataTable from '../../widgets/DataTable'

const WIDGET_REGISTRY = {
  kpi_total:         { component: KPICard,    span: 'col-span-1' },
  revenue_over_time: { component: LineChart,  span: 'col-span-2' },
  top_categories:    { component: BarChart,   span: 'col-span-2' },
  data_table:        { component: DataTable,  span: 'col-span-full' },
}

/**
 * Renders one widget section per tab that has a primaryMetric mapped.
 * Each section receives a per-tab effectiveConfig so widgets keep reading
 * config.mappings without any changes to their own code.
 */
export default function WidgetGrid({ widgets, filteredTabDataMap, config }) {
  if (!widgets?.length) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        No widgets configured. Open Settings to choose what to display.
      </div>
    )
  }

  // Only render tabs that have been mapped (must have primaryMetric at minimum)
  const tabs = (config.sheetTabs || (config.sheetName ? [config.sheetName] : []))
    .filter((tab) => config.tabMappings?.[tab]?.primaryMetric)

  if (!tabs.length) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        No column mappings found. Open Settings to map your columns.
      </div>
    )
  }

  const multiTab = tabs.length > 1

  return (
    <div className="space-y-10">
      {tabs.map((tab) => {
        const data = filteredTabDataMap[tab] || { headers: [], rows: [] }
        // Slot this tab's mappings into config so all widgets read config.mappings as usual
        const effectiveConfig = { ...config, mappings: config.tabMappings[tab] }

        return (
          <div key={tab}>
            {multiTab && (
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold text-gray-700">{tab}</h2>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{data.rows.length} rows</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-min">
              {widgets.map((id) => {
                const entry = WIDGET_REGISTRY[id]
                if (!entry) return null
                const { component: Widget, span } = entry
                return (
                  <div key={id} className={span}>
                    <Widget data={data} config={effectiveConfig} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
