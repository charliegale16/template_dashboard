import React, { useEffect } from 'react'
import { WIDGET_REGISTRY } from '../../widgets/registry'
import { CUSTOM_CHART_TYPES } from '../../widgets/CustomWidget'

const ROLE_LABELS = {
  date:            'Order date',
  revenue:         'Revenue',
  quantity:        'Quantity / units',
  orderId:         'Order ID',
  customerId:      'Customer ID',
  product:         'Product name',
  category:        'Category',
  region:          'Region / country',
  status:          'Order status',
  channel:         'Sales channel',
  cost:            'Cost / COGS',
  discount:        'Discount',
  secondaryMetric: 'Secondary metric',
}

const ROLE_DESCRIPTIONS = {
  date:            'X-axis for time-series charts.',
  revenue:         'Revenue or order value column.',
  quantity:        'Units sold per order row.',
  orderId:         'Unique order identifier.',
  customerId:      'Customer ID for unique-customer count.',
  product:         'Product name for top-products chart.',
  category:        'Column used to group bars.',
  region:          'Geographic dimension.',
  status:          'Order status (completed, refunded…)',
  channel:         'Sales channel (web, mobile…)',
  cost:            'Cost of goods — used for margin %.',
  discount:        'Discount or coupon amount.',
  secondaryMetric: 'Optional second line on time-series charts.',
}

export default function WidgetConfigDrawer({
  open,
  widget,
  tabHeaders,
  tabMappings,
  multiTab,
  onUpdate,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!widget) return null
  const entry = WIDGET_REGISTRY[widget.type]
  if (!entry) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30" onClick={onClose} />
      )}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{entry.icon}</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm truncate">{entry.label}</h2>
              <p className="text-xs text-gray-500">
                {entry.isCustom ? 'Widget builder' : 'Data configuration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {entry.isCustom ? (
          <CustomWidgetBody
            widget={widget}
            tabHeaders={tabHeaders}
            onUpdate={onUpdate}
          />
        ) : (
          <StandardWidgetBody
            widget={widget}
            entry={entry}
            tabHeaders={tabHeaders}
            tabMappings={tabMappings}
            multiTab={multiTab}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </>
  )
}

// ── Custom widget config ──────────────────────────────────────────────────────

function CustomWidgetBody({ widget, tabHeaders, onUpdate }) {
  const cfg = widget.config || {}

  function update(key, value) {
    const next = { ...cfg }
    if (value === '' || value === undefined) {
      delete next[key]
    } else {
      next[key] = value
    }
    onUpdate(widget.id, { config: Object.keys(next).length ? next : undefined })
  }

  const selectedType = CUSTOM_CHART_TYPES.find((t) => t.id === cfg.chartType)
  const needsValue  = ['kpi', 'line'].includes(cfg.chartType)
  const needsXY     = ['bar', 'bar_count'].includes(cfg.chartType)
  const needsDate   = cfg.chartType === 'line'
  const isBarCount  = cfg.chartType === 'bar_count'
  const isKpiCount  = cfg.chartType === 'kpi_count'
  const isTable     = cfg.chartType === 'table'

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      {/* Chart type picker */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chart type</p>
        <div className="grid grid-cols-2 gap-2">
          {CUSTOM_CHART_TYPES.map((ct) => (
            <button
              key={ct.id}
              type="button"
              onClick={() => update('chartType', ct.id)}
              className={[
                'flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all',
                cfg.chartType === ct.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              <span className="text-lg">{ct.icon}</span>
              <p className="text-xs font-semibold text-gray-800 leading-tight">{ct.label}</p>
            </button>
          ))}
        </div>
        {selectedType && (
          <p className="text-xs text-gray-400">{selectedType.description}</p>
        )}
      </div>

      {/* Title (shown for all types except table) */}
      {cfg.chartType && !isTable && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Title <span className="font-normal text-gray-300">(optional)</span>
          </label>
          <input
            type="text"
            className="input text-sm"
            placeholder="e.g. Monthly Sales"
            value={cfg.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>
      )}

      {/* Column pickers — vary by chart type */}
      {cfg.chartType && !isTable && !isKpiCount && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Columns</p>

          {needsDate && (
            <ColumnPicker
              label="Date column"
              value={cfg.dateColumn || ''}
              headers={tabHeaders}
              onChange={(v) => update('dateColumn', v)}
            />
          )}

          {(needsValue || needsDate) && (
            <ColumnPicker
              label="Value column"
              value={cfg.valueColumn || ''}
              headers={tabHeaders}
              onChange={(v) => update('valueColumn', v)}
            />
          )}

          {needsXY && (
            <>
              <ColumnPicker
                label="Category column (X axis)"
                value={cfg.xColumn || ''}
                headers={tabHeaders}
                onChange={(v) => update('xColumn', v)}
              />
              {!isBarCount && (
                <ColumnPicker
                  label="Value column (Y axis)"
                  value={cfg.yColumn || ''}
                  headers={tabHeaders}
                  onChange={(v) => update('yColumn', v)}
                />
              )}
            </>
          )}
        </div>
      )}

      {!cfg.chartType && (
        <p className="text-xs text-gray-400 text-center py-4">
          Select a chart type to continue.
        </p>
      )}
    </div>
  )
}

function ColumnPicker({ label, value, headers, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <select
        className={['input bg-white text-sm', value ? 'border-brand-400 ring-1 ring-brand-200' : ''].join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select column —</option>
        {headers.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  )
}

// ── Standard widget config ────────────────────────────────────────────────────

function StandardWidgetBody({ widget, entry, tabHeaders, tabMappings, multiTab, onUpdate }) {
  const roles = entry.configurableRoles ?? []
  const hasOverrides = widget.config && Object.keys(widget.config).length > 0

  function handleChange(role, value) {
    const next = { ...(widget.config || {}) }
    if (value) { next[role] = value } else { delete next[role] }
    onUpdate(widget.id, { config: Object.keys(next).length ? next : undefined })
  }

  function handleClearAll() {
    onUpdate(widget.id, { config: undefined })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {multiTab && roles.length > 0 && (
          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
            Overrides apply across all tabs. If a tab doesn't have the selected column it falls back to its own default.
          </div>
        )}

        {roles.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">This widget has no configurable data settings.</p>
            <p className="text-xs text-gray-300 mt-1">It uses all columns automatically.</p>
          </div>
        ) : (
          roles.map((role) => {
            const tabDefault  = tabMappings?.[role] || ''
            const override    = widget.config?.[role] || ''
            const isOverridden = Boolean(override)

            return (
              <div key={role} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {ROLE_LABELS[role] ?? role}
                  </label>
                  {isOverridden && (
                    <button onClick={() => handleChange(role, '')} className="text-xs text-brand-600 hover:underline">
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">{ROLE_DESCRIPTIONS[role]}</p>
                <select
                  value={override}
                  onChange={(e) => handleChange(role, e.target.value)}
                  className={['input bg-white text-sm', isOverridden ? 'border-brand-400 ring-1 ring-brand-200' : ''].join(' ')}
                >
                  <option value="">
                    {tabDefault ? `— Tab default: ${tabDefault} —` : '— Tab default (not mapped) —'}
                  </option>
                  {tabHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {isOverridden && (
                  <p className="text-xs text-brand-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Overriding tab default{tabDefault ? ` "${tabDefault}"` : ''}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {hasOverrides && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {Object.keys(widget.config).length} override{Object.keys(widget.config).length !== 1 ? 's' : ''} active
          </p>
          <button onClick={handleClearAll} className="text-xs text-red-500 hover:text-red-600 hover:underline">
            Clear all overrides
          </button>
        </div>
      )}
    </>
  )
}
