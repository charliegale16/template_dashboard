import React, { useMemo } from 'react'
import {
  computeTotal,
  computeOrderCount,
  computeAOV,
  computeChange,
  formatMetric,
} from '../utils/kpiCalculations'

const VARIANTS = {
  total: {
    fn: computeTotal,
    label: (mappings) => mappings?.primaryMetric || 'Total',
    format: (n, mappings) => {
      const name = (mappings?.primaryMetric || '').toLowerCase()
      const prefix = /revenue|sales|amount|price|cost|value/.test(name) ? '$' : ''
      return formatMetric(n, prefix)
    },
  },
  orders: {
    fn: computeOrderCount,
    label: () => 'Orders',
    format: (n) => formatMetric(n),
  },
  aov: {
    fn: computeAOV,
    label: () => 'Avg Order Value',
    format: (n) => formatMetric(n, '$'),
  },
}

export default function KPICard({ data, config, variant = 'total' }) {
  const variantCfg = VARIANTS[variant] ?? VARIANTS.total

  const { value, change, label, formatted } = useMemo(() => {
    const mappings = config?.mappings
    const label = variantCfg.label(mappings)

    if (!data?.headers?.length) return { value: null, change: null, label, formatted: '—' }

    const value = variantCfg.fn(data, mappings)
    const change = computeChange(data, variantCfg.fn, mappings)
    const formatted = variantCfg.format(value, mappings)

    return { value, change, label, formatted }
  }, [data, config, variantCfg])

  const isPositive = change !== null && change >= 0

  return (
    <div className="card flex flex-col gap-2 min-h-[128px] justify-center">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{formatted}</p>
      {change !== null ? (
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold',
              isPositive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-600',
            ].join(' ')}
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="currentColor"
              style={{ transform: isPositive ? 'none' : 'rotate(180deg)' }}
            >
              <path d="M6 2l4 5H2l4-5z" />
            </svg>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs prior period</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300">No prior data</span>
      )}
    </div>
  )
}
