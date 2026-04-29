import React from 'react'
import { WIDGET_REGISTRY, makeWidget } from '../../widgets/registry'

export default function Step4Widgets({ config, onChange }) {
  const selected = config.widgets || []

  function isSelected(type) {
    return selected.some((w) => w.type === type)
  }

  function toggle(type) {
    if (isSelected(type)) {
      onChange({ widgets: selected.filter((w) => w.type !== type) })
    } else {
      onChange({ widgets: [...selected, makeWidget(type)] })
    }
  }

  function isSatisfied(entry) {
    const allMappings = Object.values(config.tabMappings || {})
    if (!allMappings.length) return false
    return entry.requires.every((role) =>
      allMappings.some((m) => Boolean(m?.[role]))
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Select widgets & name your dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose the visualisations to display. You can add, remove, and resize widgets at any time from the dashboard.
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
        {Object.entries(WIDGET_REGISTRY).map(([type, entry]) => {
          const active = isSelected(type)
          const satisfied = isSatisfied(entry)
          return (
            <button
              key={type}
              type="button"
              onClick={() => satisfied && toggle(type)}
              disabled={!satisfied}
              className={[
                'relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                satisfied ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                active
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <span className="text-2xl mt-0.5">{entry.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{entry.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                {!satisfied && (
                  <p className="text-xs text-amber-600 mt-1">
                    Requires: {entry.requires.join(', ')}
                  </p>
                )}
              </div>
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
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
