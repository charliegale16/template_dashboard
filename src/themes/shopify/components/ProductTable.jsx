import React from 'react'
import { fmt$, fmtPct } from '../utils/calculations'

export default function ProductTable({ products }) {
  if (!products.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-48 text-gray-400 text-sm">
        No product data — map the Product Name column to see this.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-700">Top Products by Profit</p>
      </div>
      <div className="overflow-auto max-h-72">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Product</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Revenue</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Profit</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p, i) => (
              <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{fmt$(p.revenue)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmt$(p.profit)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmtPct(p.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
