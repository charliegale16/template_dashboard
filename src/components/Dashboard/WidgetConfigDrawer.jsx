import React, { useEffect } from 'react'
import { WIDGET_REGISTRY } from '../../widgets/registry'

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

  const roles = entry.configurableRoles ?? []
  const hasOverrides = widget.config && Object.keys(widget.config).length > 0

  function handleChange(role, value) {
    const next = { ...(widget.config || {}) }
    if (value) {
      next[role] = value
    } else {
      delete next[role]
    }
    onUpdate(widget.id, { config: Object.keys(next).length ? next : undefined })
  }

  function handleClearAll() {
    onUpdate(widget.id, { config: undefined })
  }

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
              <p className="text-xs text-gray-500">Data configuration</p>
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
              const tabDefault = tabMappings?.[role] || ''
              const override = widget.config?.[role] || ''
              const isOverridden = Boolean(override)

              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {ROLE_LABELS[role] ?? role}
                    </label>
                    {isOverridden && (
                      <button
                        onClick={() => handleChange(role, '')}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">{ROLE_DESCRIPTIONS[role]}</p>

                  <select
                    value={override}
                    onChange={(e) => handleChange(role, e.target.value)}
                    className={[
                      'input bg-white text-sm',
                      isOverridden ? 'border-brand-400 ring-1 ring-brand-200' : '',
                    ].join(' ')}
                  >
                    <option value="">
                      {tabDefault
                        ? `— Tab default: ${tabDefault} —`
                        : '— Tab default (not mapped) —'}
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
                      Overriding tab default
                      {tabDefault ? ` "${tabDefault}"` : ''}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {hasOverrides && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {Object.keys(widget.config).length} override{Object.keys(widget.config).length !== 1 ? 's' : ''} active
            </p>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-600 hover:underline"
            >
              Clear all overrides
            </button>
          </div>
        )}
      </div>
    </>
  )
}
