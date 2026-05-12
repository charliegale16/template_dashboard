import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Dashboard Studio
          </h1>
          <p className="text-gray-500 mt-3 text-lg">Choose your experience.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Shopify */}
          <button
            onClick={() => navigate('/shopify')}
            className="group relative bg-white rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 shadow-sm hover:shadow-lg transition-all text-left p-7"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">Shopify Profit Dashboard</h2>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Purpose-built for Shopify stores. Connect your sheet and see your real profit in under 60 seconds. Zero configuration.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {['Profit KPI', 'Ad Spend', 'Profit Margin', 'Top Products', 'Daily Breakdown'].map((tag) => (
                <span key={tag} className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-emerald-600">
              Get started →
            </div>
          </button>

          {/* Generic */}
          <button
            onClick={() => navigate('/setup')}
            className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-400 shadow-sm hover:shadow-lg transition-all text-left p-7"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Custom Dashboard Builder</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Full flexibility. Map any columns, choose your widgets, build a multi-tab dashboard for any dataset.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {['Custom Widgets', 'Multi-tab', 'Bar & Line Charts', 'KPI Cards', 'Data Table'].map((tag) => (
                <span key={tag} className="text-xs text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-brand-600">
              Start setup →
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
