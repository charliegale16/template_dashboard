import React, { useMemo } from 'react'
import {
  computeRevenue,
  computeOrderCount,
  computeAOV,
  computeUnits,
  computeCustomers,
  computeMargin,
  computeChange,
  formatMetric,
} from '../utils/kpiCalculations'

const VARIANTS = {
  revenue: {
    fn:     computeRevenue,
    label:  (m) => m?.revenue || 'Revenue',
    format: (n, m) => {
      const name = (m?.revenue || '').toLowerCase()
      const prefix = /revenue|sales|amount|price|value|gmv/.test(name) ? '$' : ''
      return formatMetric(n, prefix)
    },
  },
  orders: {
    fn:     computeOrderCount,
    label:  () => 'Orders',
    format: (n) => formatMetric(n),
  },
  aov: {
    fn:     computeAOV,
    label:  () => 'Avg Order Value',
    format: (n) => formatMetric(n, '$'),
  },
  units: {
    fn:     computeUnits,
    label:  (m) => m?.quantity || 'Units Sold',
    format: (n) => formatMetric(n),
  },
  customers: {
    fn:     computeCustomers,
    label:  () => 'Unique Customers',
    format: (n) => formatMetric(n),
  },
  margin: {
    fn:     computeMargin,
    label:  () => 'Gross Margin',
    format: (n) => `${n.toFixed(1)}%`,
    // margin is already a % so period-over-period is pp difference, not %
    changeLabel: 'pp vs prior period',
  },
}

export default function KPICard({ data, config, variant = 'revenue' }) {
  const variantCfg = VARIANTS[variant] ?? VARIANTS.revenue

  const { value, change, label, formatted } = useMemo(() => {
    const mappings = config?.mappings
    const label    = variantCfg.label(mappings)

    if (!data?.headers?.length) return { value: null, change: null, label, formatted: '—' }

    const value     = variantCfg.fn(data, mappings)
    const change    = computeChange(data, variantCfg.fn, mappings)
    const formatted = variantCfg.format(value, mappings)

    return { value, change, label, formatted }
  }, [data, config, variantCfg])

  const isPositive    = change !== null && change >= 0
  const changeLabel   = variantCfg.changeLabel ?? 'vs prior period'

  return (
    <div className="card flex flex-col gap-2 min-h-[128px] justify-center">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{formatted}</p>
      {change !== null ? (
        <div className="flex items-center gap-1.5">
          <span
            className={[
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold',
              isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
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
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300">No prior data</span>
      )}
    </div>
  )
}
