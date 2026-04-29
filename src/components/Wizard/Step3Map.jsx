import React, { useEffect, useState } from 'react'
import { fetchSheetData } from '../../adapters/SheetsAdapter'

const ROLES = [
  { key: 'date',            label: 'Date column',       description: 'X-axis for time-series charts.',                       required: false },
  { key: 'primaryMetric',   label: 'Primary metric',    description: 'Main numeric value to track (e.g. revenue, sessions).', required: true  },
  { key: 'secondaryMetric', label: 'Secondary metric',  description: 'Optional second numeric series.',                       required: false },
  { key: 'category',        label: 'Category column',   description: 'Groups data in bar charts and breakdowns.',             required: false },
]

const EMPTY_MAPPING = { date: '', primaryMetric: '', secondaryMetric: '', category: '' }

export default function Step3Map({ config, onChange, accessToken }) {
  const availableTabs = config.sheetTabs?.length
    ? config.sheetTabs
    : config.sheetName ? [config.sheetName] : []

  const [activeTab, setActiveTab] = useState(config.sheetName || availableTabs[0] || '')
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch headers whenever the active tab changes
  useEffect(() => {
    if (!config.sheetId || !accessToken || !activeTab) return
    setLoading(true)
    setError(null)
    fetchSheetData(config.sheetId, activeTab, accessToken)
      .then((d) => setHeaders(d.headers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [config.sheetId, accessToken, activeTab])

  function handleMapping(role, value) {
    const existing = config.tabMappings?.[activeTab] || {}
    onChange({
      tabMappings: {
        ...config.tabMappings,
        [activeTab]: { ...existing, [role]: value },
      },
    })
  }

  const currentMappings = config.tabMappings?.[activeTab] || EMPTY_MAPPING

  // Count how many tabs have a primaryMetric mapped
  const mappedTabCount = Object.values(config.tabMappings || {}).filter(
    (m) => m?.primaryMetric
  ).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Map your columns</h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign column roles for each tab. Each tab keeps its own mappings independently.
        </p>
      </div>

      {/* Tab switcher */}
      {availableTabs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {availableTabs.length > 1 ? 'Map each tab:' : 'Tab:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTabs.map((tab) => {
              const mapped = Boolean(config.tabMappings?.[tab]?.primaryMetric)
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'relative px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400',
                  ].join(' ')}
                >
                  {tab}
                  {mapped && (
                    <span className={[
                      'ml-1.5 inline-block w-1.5 h-1.5 rounded-full',
                      isActive ? 'bg-white opacity-80' : 'bg-emerald-500',
                    ].join(' ')} />
                  )}
                </button>
              )
            })}
          </div>
          {availableTabs.length > 1 && (
            <p className="text-xs text-gray-400">
              {mappedTabCount} of {availableTabs.length} tabs mapped
              {mappedTabCount < availableTabs.length && ' — unmapped tabs will be skipped on the dashboard'}
            </p>
          )}
        </div>
      )}

      {/* Role dropdowns */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-3">
          {ROLES.map((role) => (
            <div key={role.key} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{role.label}</span>
                {role.required && (
                  <span className="text-xs text-brand-600 font-medium bg-brand-50 px-1.5 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{role.description}</p>
              <select
                className="input bg-white"
                value={currentMappings[role.key] || ''}
                onChange={(e) => handleMapping(role.key, e.target.value)}
              >
                <option value="">— Not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}

          {headers.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              No column headers found for <strong>{activeTab}</strong>. Go back and verify your sheet connection.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 py-8 text-gray-500 text-sm">
      <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading columns for this tab…
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}
