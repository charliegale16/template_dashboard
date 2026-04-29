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
 * BarChart — flexible ecommerce bar chart.
 *
 * xRole     — which mapping key to use as the category axis (default: 'category')
 * yRole     — which mapping key to use as the value axis (default: 'revenue')
 * countMode — when true, counts rows per category instead of summing yRole
 * horizontal — renders as horizontal bar chart (better for long category names)
 */
export default function BarChart({
  data,
  config,
  xRole = 'category',
  yRole = 'revenue',
  countMode = false,
  horizontal = false,
  title: titleProp,
}) {
  const chartData = useMemo(
    () => buildChartData(data, config, xRole, yRole, countMode),
    [data, config, xRole, yRole, countMode]
  )

  const xLabel = config.mappings?.[xRole] || xRole
  const yLabel = countMode ? 'Orders' : (config.mappings?.[yRole] || yRole)
  const title  = titleProp ?? (countMode ? `Orders by ${xLabel}` : `${yLabel} by ${xLabel}`)

  if (!chartData.length) return <EmptyState title={title} />

  const height = horizontal ? Math.max(200, chartData.length * 32) : 260

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart
          data={chartData}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 4, right: 16, left: 0, bottom: horizontal ? 4 : 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={!horizontal} horizontal={horizontal} />

          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={shortNum}
                width={48}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={chartData.length > 6 ? -35 : 0}
                textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                height={chartData.length > 6 ? 50 : 30}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={shortNum}
                width={48}
              />
            </>
          )}

          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v) => [shortNum(v), yLabel]}
          />
          <Bar dataKey="value" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildChartData(data, config, xRole, yRole, countMode) {
  if (!data?.headers?.length) return []

  const catCol    = data.headers.indexOf(config.mappings?.[xRole])
  const metricCol = countMode ? -1 : data.headers.indexOf(config.mappings?.[yRole])

  if (catCol === -1) return []
  if (!countMode && metricCol === -1) return []

  const agg = {}
  for (const row of data.rows) {
    const cat = String(row[catCol] ?? 'Unknown').trim() || 'Unknown'
    const val = countMode ? 1 : (parseFloat(row[metricCol]) || 0)
    agg[cat] = (agg[cat] || 0) + val
  }

  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, value]) => ({ category, value }))
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
      <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
        No data — check column mappings.
      </div>
    </div>
  )
}
