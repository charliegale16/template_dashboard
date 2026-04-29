import React, { useMemo } from 'react'
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

/**
 * BarChart — primary metric aggregated (summed) per category value.
 * Top 10 categories shown, remainder collapsed into "Other".
 */
export default function BarChart({ data, config }) {
  const chartData = useMemo(() => buildChartData(data, config), [data, config])

  const metricKey = config.mappings?.primaryMetric || 'value'
  const catKey = config.mappings?.category || 'category'
  const title = `${metricKey} by ${catKey}`

  if (!chartData.length) return <EmptyState title={title} />

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <ResponsiveContainer width="100%" height={260}>
        <ReBarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={shortNum}
            width={48}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v) => [shortNum(v), metricKey]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildChartData(data, config) {
  if (!data?.headers?.length) return []
  const catCol = data.headers.indexOf(config.mappings?.category)
  const metricCol = data.headers.indexOf(config.mappings?.primaryMetric)
  if (catCol === -1 || metricCol === -1) return []

  const agg = {}
  for (const row of data.rows) {
    const cat = String(row[catCol] ?? 'Unknown')
    const val = parseFloat(row[metricCol]) || 0
    agg[cat] = (agg[cat] || 0) + val
  }

  const sorted = Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return sorted.map(([category, value]) => ({ category, value }))
}

function shortNum(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v
}

function EmptyState({ title }) {
  return (
    <div className="card space-y-1">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
        No data — check column mappings.
      </div>
    </div>
  )
}
