import React, { useEffect, useState } from 'react'
import { fetchSheet } from '../../adapters/SheetsAdapter'

const ROLES = [
  {
    key: 'date',
    label: 'Date column',
    description: 'Used as the X-axis for time-series charts.',
    required: false,
  },
  {
    key: 'primaryMetric',
    label: 'Primary metric',
    description: 'Main numeric value to track (e.g. revenue, sessions).',
    required: true,
  },
  {
    key: 'secondaryMetric',
    label: 'Secondary metric',
    description: 'Optional second numeric series shown alongside the primary.',
    required: false,
  },
  {
    key: 'category',
    label: 'Category column',
    description: 'Groups data in bar charts and breakdowns.',
    required: false,
  },
]

export default function Step3Map({ config, onChange }) {
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!config.sheetId || !config.apiKey) return
    setLoading(true)
    fetchSheet({ sheetId: config.sheetId, apiKey: config.apiKey, sheetName: config.sheetName })
      .then((d) => setHeaders(d.headers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [config.sheetId, config.apiKey, config.sheetName])

  function handleMapping(role, value) {
    onChange({ mappings: { ...config.mappings, [role]: value } })
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Map your columns</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell the dashboard which column serves which role. These drive all widgets automatically.
        </p>
      </div>

      <div className="space-y-4">
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
              value={config.mappings?.[role.key] || ''}
              onChange={(e) => handleMapping(role.key, e.target.value)}
            >
              <option value="">— Not mapped —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {headers.length === 0 && !loading && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No column headers found. Go back and verify your sheet connection.
        </p>
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
      Loading columns…
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
