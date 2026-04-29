import React, { useEffect, useState } from 'react'
import { fetchSheetData } from '../../adapters/SheetsAdapter'

const ROLE_GROUPS = [
  {
    label: 'Core',
    roles: [
      { key: 'date',     label: 'Order date',      description: 'Date/time the order was placed.',         required: false },
      { key: 'revenue',  label: 'Revenue',          description: 'Order value or revenue amount.',          required: false, recommended: true },
      { key: 'quantity', label: 'Quantity / units', description: 'Number of units sold per row.',           required: false },
      { key: 'orderId',  label: 'Order ID',         description: 'Unique order identifier.',                required: false },
    ],
  },
  {
    label: 'Customer',
    roles: [
      { key: 'customerId', label: 'Customer ID', description: 'Enables unique customer count metrics.', required: false },
    ],
  },
  {
    label: 'Product',
    roles: [
      { key: 'product',  label: 'Product name', description: 'Product name for top-products breakdown.',  required: false },
      { key: 'category', label: 'Category',     description: 'Product category for category breakdown.', required: false },
    ],
  },
  {
    label: 'Geography',
    roles: [
      { key: 'region', label: 'Region / country', description: 'Geographic dimension for regional charts.', required: false },
    ],
  },
  {
    label: 'Order details',
    roles: [
      { key: 'status',  label: 'Order status',  description: 'e.g. completed, refunded, pending.',    required: false },
      { key: 'channel', label: 'Sales channel', description: 'e.g. web, mobile, email, marketplace.', required: false },
    ],
  },
  {
    label: 'Financials',
    roles: [
      { key: 'cost',     label: 'Cost / COGS', description: 'Cost of goods — enables gross margin.',    required: false },
      { key: 'discount', label: 'Discount',    description: 'Discount or coupon amount per order.',    required: false },
    ],
  },
  {
    label: 'Advanced',
    roles: [
      { key: 'secondaryMetric', label: 'Secondary metric', description: 'Optional second line on time-series charts.', required: false },
    ],
  },
]

const ALL_ROLES = ROLE_GROUPS.flatMap((g) => g.roles)
const EMPTY_MAPPING = Object.fromEntries(ALL_ROLES.map((r) => [r.key, '']))

export default function Step3Map({ config, onChange, accessToken }) {
  const availableTabs = config.sheetTabs?.length
    ? config.sheetTabs
    : config.sheetName ? [config.sheetName] : []

  const [activeTab, setActiveTab] = useState(config.sheetName || availableTabs[0] || '')
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  const mappedTabCount = Object.values(config.tabMappings || {}).filter(
    (m) => m?.revenue
  ).length

  const mappedCount = ALL_ROLES.filter((r) => currentMappings[r.key]).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Map your columns</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell the dashboard what each column represents. Map at least one column to continue — not all tabs need revenue.
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
              const mapped = Boolean(config.tabMappings?.[tab]?.revenue)
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

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : headers.length === 0 ? (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No column headers found for <strong>{activeTab}</strong>. Go back and verify your sheet connection.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{mappedCount} of {ALL_ROLES.length} columns mapped</span>
            {mappedCount > 0 && (
              <button
                type="button"
                onClick={() => onChange({ tabMappings: { ...config.tabMappings, [activeTab]: EMPTY_MAPPING } })}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear this tab
              </button>
            )}
          </div>

          <div className="space-y-4">
            {ROLE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.label}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.roles.map((role) => {
                    const value = currentMappings[role.key] || ''
                    const isMapped = Boolean(value)
                    return (
                      <div
                        key={role.key}
                        className={[
                          'rounded-xl border p-3 space-y-1.5 transition-colors',
                          isMapped ? 'border-brand-200 bg-brand-50/50' : 'border-gray-100 bg-gray-50',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">{role.label}</span>
                          {role.recommended && !isMapped && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                          {isMapped && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">{role.description}</p>
                        <select
                          className="input bg-white text-xs py-1.5"
                          value={value}
                          onChange={(e) => handleMapping(role.key, e.target.value)}
                        >
                          <option value="">— Not mapped —</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
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
