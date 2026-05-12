import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useShopifyData } from '../../hooks/useShopifyData'
import { computeMetrics, getTopProducts, getDailyBreakdown, getProfitOverTime, fmt$, fmtPct } from './utils/calculations'
import { formatAge } from '../../utils/sheetCache'
import ProfitCard from './components/ProfitCard'
import KPIBox from './components/KPIBox'
import ProfitChart from './components/ProfitChart'
import ProductTable from './components/ProductTable'
import DailyTable from './components/DailyTable'
import CostInputPanel from './components/CostInputPanel'

const DATE_FILTERS = [
  { id: 'all',  label: 'All time' },
  { id: '90',   label: 'Last 90d' },
  { id: '30',   label: 'Last 30d' },
  { id: '7',    label: 'Last 7d' },
]

export default function ShopifyDashboard({ config, saveConfig, auth, onResetConfig }) {
  const [reauthNeeded, setReauthNeeded]   = useState(false)
  const [showCosts, setShowCosts]         = useState(false)
  const [dateFilter, setDateFilter]       = useState('all')
  const [, setTick] = useState(0)

  const prevTokenRef = useRef(auth.accessToken)

  const { rows: rawRows, loading, error, cachedAt, refetch } = useShopifyData(
    config,
    auth.accessToken,
    () => setReauthNeeded(true),
  )

  // Clear reauth modal when a new token arrives
  useEffect(() => {
    const prev = prevTokenRef.current
    prevTokenRef.current = auth.accessToken
    if (reauthNeeded && auth.accessToken && auth.accessToken !== prev) {
      setReauthNeeded(false)
      refetch(true)
    }
  }, [auth.accessToken, reauthNeeded, refetch])

  // Refresh "X min ago" label
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Apply date filter
  const filteredRows = useMemo(() => {
    if (!rawRows || dateFilter === 'all') return rawRows ?? []
    const days = parseInt(dateFilter, 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return rawRows.filter((r) => {
      const d = String(r.date)
      return d >= cutoffStr
    })
  }, [rawRows, dateFilter])

  const { rows: enriched, totals } = useMemo(
    () => computeMetrics(filteredRows, config.costInputs),
    [filteredRows, config.costInputs],
  )

  const topProducts  = useMemo(() => getTopProducts(enriched),        [enriched])
  const dailyDays    = useMemo(() => getDailyBreakdown(enriched),     [enriched])
  const chartData    = useMemo(() => getProfitOverTime(enriched),     [enriched])

  const hasCosts = Object.values(config.costInputs || {}).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Profit Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Date filter pills */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    dateFilter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch(true)}
              disabled={loading}
              title={cachedAt ? `Updated ${formatAge(cachedAt)}` : 'Refresh'}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Cost inputs */}
            <button
              onClick={() => setShowCosts(true)}
              title="Edit cost inputs"
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                hasCosts ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'text-gray-500 hover:bg-gray-100',
              ].join(' ')}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {hasCosts ? 'Costs set' : 'Add costs'}
            </button>

            {/* Reset */}
            <button
              onClick={onResetConfig}
              title="Change data source"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => refetch(true)} className="text-red-600 hover:underline text-xs ml-4">Retry</button>
          </div>
        )}

        {loading && !enriched.length ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Hero profit + KPI row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-4">
                <ProfitCard profit={totals.profit} margin={totals.margin} />
              </div>
              <KPIBox
                label="Revenue"
                value={fmt$(totals.revenue)}
                sub={`${enriched.length} orders`}
                accent="blue"
              />
              <KPIBox
                label="Ad Spend"
                value={fmt$(totals.adSpend)}
                sub={totals.revenue > 0 ? `${fmtPct(totals.adSpend / totals.revenue)} of revenue` : undefined}
                accent="amber"
              />
              <KPIBox
                label="Total Costs"
                value={fmt$(totals.costs)}
                accent="gray"
              />
              <KPIBox
                label="Profit Margin"
                value={fmtPct(totals.margin)}
                sub={totals.profit >= 0 ? 'Profitable' : 'Loss-making'}
                accent={totals.margin >= 0.15 ? 'emerald' : totals.margin >= 0 ? 'gray' : 'red'}
              />
            </div>

            {/* Chart */}
            <ProfitChart data={chartData} />

            {/* Bottom: products + daily */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProductTable products={topProducts} />
              <DailyTable days={dailyDays} />
            </div>

            {/* Footer */}
            {cachedAt && (
              <p className="text-center text-xs text-gray-400">
                Data updated {formatAge(cachedAt)} · {enriched.length} rows analysed
              </p>
            )}
          </>
        )}
      </main>

      {/* Cost panel */}
      <CostInputPanel
        open={showCosts}
        costInputs={config.costInputs || { cogs: 0, fees: 0, misc: 0 }}
        onChange={(ci) => saveConfig({ costInputs: ci })}
        onClose={() => setShowCosts(false)}
      />

      {/* Reauth modal */}
      {reauthNeeded && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Session expired</h2>
                <p className="text-xs text-gray-500 mt-0.5">Sign in again to refresh your data.</p>
              </div>
            </div>
            <button onClick={auth.login} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-emerald-50 rounded-2xl border border-emerald-100" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )
}
