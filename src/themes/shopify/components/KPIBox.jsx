import React from 'react'

export default function KPIBox({ label, value, sub, accent = 'gray' }) {
  const colors = {
    gray:    'bg-white border-gray-100',
    blue:    'bg-blue-50 border-blue-100',
    amber:   'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    red:     'bg-red-50 border-red-100',
  }
  const textColors = {
    gray:    'text-gray-900',
    blue:    'text-blue-700',
    amber:   'text-amber-700',
    emerald: 'text-emerald-700',
    red:     'text-red-600',
  }
  return (
    <div className={`rounded-xl border shadow-sm px-5 py-4 ${colors[accent] ?? colors.gray}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${textColors[accent] ?? textColors.gray}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
