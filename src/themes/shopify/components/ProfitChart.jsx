import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { fmt$ } from '../utils/calculations'

export default function ProfitChart({ data }) {
  const hasNegative = useMemo(() => data.some((d) => d.profit < 0), [data])

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-64 text-gray-400 text-sm">
        No time-series data — make sure your Date column is mapped.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold text-gray-700">Profit Over Time</p>
        <span className="text-xs text-gray-400">{data.length} data points</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmt$(v)}
            width={60}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
            formatter={(v) => [fmt$(v), 'Profit']}
          />
          {hasNegative && <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />}
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#10b981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
