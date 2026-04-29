import React from 'react'

export const AVAILABLE_WIDGETS = [
  {
    id: 'kpi_total',
    label: 'KPI Card',
    description: 'Single metric total with % change vs. prior period.',
    icon: '📊',
    requires: ['primaryMetric'],
  },
  {
    id: 'revenue_over_time',
    label: 'Line Chart',
    description: 'Primary metric plotted over time.',
    icon: '📈',
    requires: ['date', 'primaryMetric'],
  },
  {
    id: 'top_categories',
    label: 'Bar Chart',
    description: 'Primary metric broken down by category.',
    icon: '📉',
    requires: ['category', 'primaryMetric'],
  },
  {
    id: 'data_table',
    label: 'Data Table',
    description: 'Paginated raw data view with sorting.',
    icon: '🗂️',
    requires: [],
  },
]

export default function Step4Widgets({ config, onChange }) {
  const selected = config.widgets || []

  function toggle(id) {
    const next = selected.includes(id)
      ? selected.filter((w) => w !== id)
      : [...selected, id]
    onChange({ widgets: next })
  }

  function isSatisfied(widget) {
    const allMappings = Object.values(config.tabMappings || {})
    if (!allMappings.length) return false
    // A widget is available if at least one mapped tab satisfies all its required roles
    return widget.requires.every((role) =>
      allMappings.some((m) => Boolean(m?.[role]))
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Select widgets & name your dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose the visualisations to display. Greyed widgets need additional column mappings.
        </p>
      </div>

      <div>
        <label className="label">Dashboard name</label>
        <input
          className="input"
          type="text"
          placeholder="e.g. Sales Overview Q4"
          value={config.dashboardName}
          onChange={(e) => onChange({ dashboardName: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AVAILABLE_WIDGETS.map((widget) => {
          const active = selected.includes(widget.id)
          const satisfied = isSatisfied(widget)
          return (
            <button
              key={widget.id}
              type="button"
              onClick={() => satisfied && toggle(widget.id)}
              disabled={!satisfied}
              className={[
                'relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                satisfied ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                active
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <span className="text-2xl mt-0.5">{widget.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{widget.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{widget.description}</p>
                {!satisfied && (
                  <p className="text-xs text-amber-600 mt-1">
                    Requires: {widget.requires.join(', ')}
                  </p>
                )}
              </div>
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-amber-600">Select at least one widget to continue.</p>
      )}
    </div>
  )
}
