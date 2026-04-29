import React, { useMemo } from 'react'
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function LineChart({ data, config, title: titleProp }) {
  const chartData = useMemo(() => buildChartData(data, config), [data, config])

  const primaryKey   = config.mappings?.revenue || 'revenue'
  const secondaryKey = config.mappings?.secondaryMetric
  const title = titleProp ?? (primaryKey + (secondaryKey ? ` vs ${secondaryKey}` : '') + ' over time')

  if (!chartData.length) return <EmptyState title={title} />

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <ResponsiveContainer width="100%" height={260}>
        <ReLineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
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
            formatter={(v, name) => [shortNum(v), name]}
          />
          {secondaryKey && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Line
            type="monotone"
            dataKey={primaryKey}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {secondaryKey && (
            <Line
              type="monotone"
              dataKey={secondaryKey}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildChartData(data, config) {
  if (!data?.headers?.length) return []
  const dateCol      = data.headers.indexOf(config.mappings?.date)
  const primaryCol   = data.headers.indexOf(config.mappings?.revenue)
  const secondaryCol = config.mappings?.secondaryMetric
    ? data.headers.indexOf(config.mappings.secondaryMetric)
    : -1

  if (primaryCol === -1) return []

  return data.rows.map((row) => {
    const point = {
      date: dateCol !== -1 ? String(row[dateCol] ?? '') : '',
      [config.mappings.revenue]: parseFloat(row[primaryCol]) || 0,
    }
    if (secondaryCol !== -1) {
      point[config.mappings.secondaryMetric] = parseFloat(row[secondaryCol]) || 0
    }
    return point
  })
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
