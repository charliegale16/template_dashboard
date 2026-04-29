import React, { useEffect } from 'react'
import { WIDGET_REGISTRY } from '../../widgets/registry'

export default function AddWidgetPanel({ open, config, onAdd, onClose }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function isSatisfied(entry) {
    const allMappings = Object.values(config.tabMappings || {})
    if (!allMappings.length) return entry.requires.length === 0
    return entry.requires.every((role) => allMappings.some((m) => Boolean(m?.[role])))
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Add widget</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click any widget to add it to your dashboard.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {Object.entries(WIDGET_REGISTRY).map(([type, entry]) => {
            const satisfied = isSatisfied(entry)
            return (
              <button
                key={type}
                type="button"
                disabled={!satisfied}
                onClick={() => { onAdd(type); onClose() }}
                className={[
                  'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  satisfied
                    ? 'border-gray-200 hover:border-brand-400 hover:bg-brand-50 cursor-pointer'
                    : 'border-gray-100 opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                <span className="text-2xl mt-0.5 shrink-0">{entry.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{entry.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                  {!satisfied && (
                    <p className="text-xs text-amber-600 mt-1">
                      Requires: {entry.requires.join(', ')}
                    </p>
                  )}
                  <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    Default: {entry.defaultSize}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            You can resize and reorder after adding.
          </p>
        </div>
      </div>
    </>
  )
}
