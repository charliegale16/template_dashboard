import React, { useState, useEffect } from 'react'

export default function CostInputPanel({ open, costInputs, onChange, onClose }) {
  const [local, setLocal] = useState(costInputs)

  useEffect(() => { setLocal(costInputs) }, [costInputs])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleSave() {
    onChange(local)
    onClose()
  }

  const total = (local.cogs || 0) + (local.fees || 0) + (local.misc || 0)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30" onClick={onClose} />}
      <div className={[
        'fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Cost Inputs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Added to profit calculation</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
          <p className="text-xs text-gray-400 leading-relaxed bg-gray-50 rounded-lg p-3">
            Enter flat dollar amounts for costs not in your sheet. These are spread evenly across all rows.
          </p>

          {[
            { key: 'cogs', label: 'COGS / Product Cost', placeholder: 'e.g. 5000' },
            { key: 'fees', label: 'Platform Fees', placeholder: 'e.g. 200' },
            { key: 'misc', label: 'Misc Expenses', placeholder: 'e.g. 100' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input pl-7 text-sm"
                  placeholder={placeholder}
                  value={local[key] || ''}
                  onChange={(e) => setLocal((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          ))}

          {total > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
              Total extra costs: <span className="font-semibold">${total.toLocaleString()}</span> — distributed across all rows.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <button onClick={handleSave} className="btn-primary w-full py-2.5 text-sm">
            Apply Costs
          </button>
          <button
            onClick={() => { setLocal({ cogs: 0, fees: 0, misc: 0 }); onChange({ cogs: 0, fees: 0, misc: 0 }); onClose() }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            Reset to zero
          </button>
        </div>
      </div>
    </>
  )
}
