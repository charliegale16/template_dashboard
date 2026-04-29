import React, { useMemo } from 'react'

/**
 * KPICard — shows a total for the primary metric plus % change vs. the prior
 * half of the date range (simple period-over-period split).
 */
export default function KPICard({ data, config }) {
  const { total, change, label } = useMemo(() => {
    if (!data?.headers?.length) return { total: null, change: null, label: '—' }

    const metricCol = data.headers.indexOf(config.mappings?.primaryMetric)
    if (metricCol === -1) return { total: null, change: null, label: config.mappings?.primaryMetric || '—' }

    const values = data.rows
      .map((r) => parseFloat(r[metricCol]))
      .filter((v) => !isNaN(v))

    if (!values.length) return { total: 0, change: null, label: config.mappings.primaryMetric }

    const total = values.reduce((a, b) => a + b, 0)

    // Split into two halves for period-over-period %
    const half = Math.floor(values.length / 2)
    const prior = values.slice(0, half).reduce((a, b) => a + b, 0)
    const current = values.slice(half).reduce((a, b) => a + b, 0)
    const change = prior !== 0 ? ((current - prior) / prior) * 100 : null

    return { total, change, label: config.mappings.primaryMetric }
  }, [data, config])

  const formatted = total !== null ? formatNumber(total) : '—'

  return (
    <div className="card flex flex-col gap-1 min-h-[120px] justify-center">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatted}</p>
      {change !== null && (
        <span
          className={[
            'inline-flex items-center gap-1 text-sm font-medium',
            change >= 0 ? 'text-emerald-600' : 'text-red-500',
          ].join(' ')}
        >
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs prior period
        </span>
      )}
    </div>
  )
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)
}
