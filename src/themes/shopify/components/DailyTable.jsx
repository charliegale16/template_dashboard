import React from 'react'
import { fmt$, fmtPct } from '../utils/calculations'

export default function DailyTable({ days }) {
  if (!days.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-48 text-gray-400 text-sm">
        No daily data available.
      </div>
    )
  }

  // Show most recent 30 days by default
  const visible = days.slice(-30).reverse()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Daily Breakdown</p>
        <span className="text-xs text-gray-400">Last {visible.length} days</span>
      </div>
      <div className="overflow-auto max-h-72">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Revenue</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Ad Spend</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Profit</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((d) => {
              const margin = d.revenue > 0 ? d.profit / d.revenue : 0
              return (
                <tr key={d.date} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 font-medium whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{fmt$(d.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmt$(d.adSpend)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmt$(d.profit)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmtPct(margin)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
