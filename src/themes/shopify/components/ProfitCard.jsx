import React from 'react'
import { fmt$, fmtPct } from '../utils/calculations'

export default function ProfitCard({ profit, margin }) {
  const positive = profit >= 0
  return (
    <div className={[
      'rounded-2xl border px-8 py-10 text-center shadow-sm transition-colors',
      positive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100',
    ].join(' ')}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Net Profit
      </p>
      <p className={[
        'text-7xl font-extrabold tracking-tight leading-none',
        positive ? 'text-emerald-600' : 'text-red-500',
      ].join(' ')}>
        {fmt$(profit)}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className={[
          'inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full',
          positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
        ].join(' ')}>
          {positive ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7-7-7" />
            </svg>
          )}
          {fmtPct(Math.abs(margin))} margin
        </span>
      </div>
    </div>
  )
}
