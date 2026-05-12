import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useKPIs } from '../hooks/useKPIs'
import { loadSource, loadRows } from '../hooks/useDataSource'
import { computeKPI, formatKPI, getChartData, STROKE_COLOR, STROKE_COLOR_2 } from '../utils/formulaEngine'
import { exportCSV, printDashboard } from '../utils/exportUtils'

// ── Colour system ─────────────────────────────────────────────────────────────

const BORDER_COLOR = {
  blue:    'border-l-blue-500',
  emerald: 'border-l-emerald-500',
  amber:   'border-l-amber-500',
  red:     'border-l-red-500',
  purple:  'border-l-purple-500',
  gray:    'border-l-gray-400',
}

const TEXT_COLOR = {
  blue:    'text-blue-600',
  emerald: 'text-emerald-600',
  amber:   'text-amber-600',
  red:     'text-red-600',
  purple:  'text-purple-600',
  gray:    'text-gray-500',
}

// ── Date detection ────────────────────────────────────────────────────────────

const DATE_SLUGS = ['date', 'day', 'time', 'created', 'period', 'month', 'week', 'year']

function isDateColumn(header) {
  const slug = header.toLowerCase().replace(/[^a-z]/g, '')
  return DATE_SLUGS.some((s) => slug.includes(s))
}

function parseDate(val) {
  if (!val) return null
  const s = String(val).trim()

  // Try ISO first (YYYY-MM-DD and similar)
  let d = new Date(s)
  if (!isNaN(d)) return d

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    d = new Date(`${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`)
    if (!isNaN(d)) return d
  }

  // DD/MM/YYYY (try if first number > 12)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy && parseInt(dmy[1], 10) > 12) {
    d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`)
    if (!isNaN(d)) return d
  }

  return null
}

function toDateKey(d) {
  return d.toISOString().slice(0, 10)
}

// ── Date filter ───────────────────────────────────────────────────────────────

// filter shape: { type: 'all' | 'days' | 'ytd' | 'year', value: null | number }
const ROLLING_FILTERS = [
  { label: 'All',       type: 'all',  value: null },
  { label: 'Last 90d',  type: 'days', value: 90   },
  { label: 'Last 30d',  type: 'days', value: 30   },
  { label: 'Last 7d',   type: 'days', value: 7    },
  { label: 'YTD',       type: 'ytd',  value: null },
]

function filterMatch(filter, other) {
  return filter.type === other.type && filter.value === other.value
}

function filterRowsByDate(rows, dateCol, filter) {
  if (!dateCol || filter.type === 'all') return rows
  const now = new Date()

  return rows.filter((r) => {
    const d = parseDate(r.data?.[dateCol])
    if (!d) return false

    if (filter.type === 'days') {
      const cutoff = new Date()
      cutoff.setDate(now.getDate() - filter.value)
      return d >= cutoff
    }
    if (filter.type === 'ytd') {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return d >= yearStart && d <= now
    }
    if (filter.type === 'year') {
      return d.getFullYear() === filter.value
    }
    return true
  })
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function toNum(val) {
  return parseFloat(String(val ?? '').replace(/[$£€,%\s,]/g, '')) || 0
}

function buildChartData(rows, dateCol, numericCol) {
  const map = new Map()
  for (const r of rows) {
    const d = parseDate(r.data?.[dateCol])
    if (!d) continue
    const key = toDateKey(d)
    map.set(key, (map.get(key) ?? 0) + toNum(r.data?.[numericCol]))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function findFirstNumericCol(headers, rows) {
  if (!rows.length) return null
  for (const h of headers) {
    const sample = rows.slice(0, 20).map((r) => r.data?.[h])
    const numeric = sample.filter((v) => v !== '' && !isNaN(toNum(v)) && toNum(v) !== 0)
    if (numeric.length > sample.length * 0.5) return h
  }
  return null
}

// ── Shared Y-axis formatter ───────────────────────────────────────────────────

function shortNum(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return Number(v.toFixed(2)).toString()
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ kpi, rows }) {
  const value = useMemo(() => computeKPI(rows, kpi.formula), [rows, kpi.formula])
  const formatted = formatKPI(value, kpi.format)
  const borderCls = BORDER_COLOR[kpi.color] ?? 'border-l-blue-500'
  const textCls = TEXT_COLOR[kpi.color] ?? 'text-blue-600'

  return (
    <div className={`bg-white rounded-xl border border-l-4 border-gray-100 ${borderCls} p-5 flex flex-col gap-1`}>
      <p className="text-xs font-medium text-gray-500 truncate">{kpi.name}</p>
      <p className={`text-2xl font-bold ${textCls} leading-tight`}>{formatted}</p>
    </div>
  )
}

// ── Chart widgets ─────────────────────────────────────────────────────────────

function ChartWidget({ widget, rows }) {
  const data = useMemo(() => getChartData(rows, widget.formula), [rows, widget.formula])
  const wt = widget.formula?.widget_type
  const stroke1 = STROKE_COLOR[widget.color] ?? '#3b82f6'
  const stroke2 = STROKE_COLOR_2[widget.color] ?? '#f59e0b'

  const axisProps = {
    tick: { fontSize: 11, fill: '#9ca3af' },
    tickLine: false,
    axisLine: false,
  }

  const tooltipStyle = {
    contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' },
    formatter: shortNum,
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-800 mb-1">{widget.name}</p>
        <p className="text-xs text-gray-400">No data available for this chart.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm font-semibold text-gray-800 mb-4">{widget.name}</p>
      <ResponsiveContainer width="100%" height={260}>
        {wt === 'bar_chart' ? (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="x" {...axisProps} interval={0} />
            <YAxis {...axisProps} width={50} tickFormatter={shortNum} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="y" name={widget.formula?.y_label || widget.formula?.y_column || 'Value'} fill={stroke1} radius={[3, 3, 0, 0]} maxBarSize={48} />
          </BarChart>
        ) : wt === 'comparison' ? (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={50} tickFormatter={shortNum} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="y1" name={widget.formula?.y1_label || 'Series 1'} stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="y2" name={widget.formula?.y2_label || 'Series 2'} stroke={stroke2} strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        ) : (
          // line_chart
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={50} tickFormatter={shortNum} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="y" name={widget.formula?.y_label || widget.formula?.y_column || 'Value'} stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
      <div className="h-64 bg-white rounded-xl border border-gray-100" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { sourceId } = useParams()
  const navigate = useNavigate()
  const { kpis, loading: kpisLoading } = useKPIs(sourceId)

  const [source, setSource] = useState(null)
  const [allRows, setAllRows] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState({ type: 'all', value: null })

  // Load source metadata + rows
  useEffect(() => {
    if (!sourceId) return
    setDataLoading(true)
    setLoadError(null)

    Promise.all([loadSource(sourceId), loadRows(sourceId)])
      .then(([src, rows]) => {
        setSource(src)
        setAllRows(rows)
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setDataLoading(false))
  }, [sourceId])

  // Detect date column
  const dateCol = useMemo(() => {
    if (!source?.headers) return null
    return source.headers.find(isDateColumn) ?? null
  }, [source])

  // Available years derived from the date column (for the year selector)
  const availableYears = useMemo(() => {
    if (!dateCol || !allRows.length) return []
    const years = new Set()
    for (const r of allRows) {
      const d = parseDate(r.data?.[dateCol])
      if (d) years.add(d.getFullYear())
    }
    return [...years].sort((a, b) => b - a) // descending
  }, [allRows, dateCol])

  // Filtered rows
  const rows = useMemo(
    () => filterRowsByDate(allRows, dateCol, dateFilter),
    [allRows, dateCol, dateFilter]
  )

  // Chart data
  const numericCol = useMemo(() => {
    if (!source?.headers) return null
    const nonDateHeaders = source.headers.filter((h) => !isDateColumn(h))
    return findFirstNumericCol(nonDateHeaders, rows)
  }, [source, rows])

  const chartData = useMemo(() => {
    if (!dateCol || !numericCol || !rows.length) return []
    return buildChartData(rows, dateCol, numericCol)
  }, [rows, dateCol, numericCol])

  const loading = dataLoading || kpisLoading

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExportCSV() {
    if (!source) return
    exportCSV(source.headers, rows, `${source.name}.csv`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </button>
            <span className="text-gray-300 shrink-0">/</span>
            <span className="text-sm font-semibold text-gray-800 truncate">
              {source?.name ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/source/${sourceId}/kpis`)}
              className="btn-secondary text-xs py-1.5 px-3 hidden sm:inline-flex"
            >
              Edit KPIs
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!source || loading}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Export CSV
            </button>
            <button
              onClick={printDashboard}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Print / PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loadError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Date filter pills */}
        {dateCol && !loading && (
          <div className="flex items-center gap-2 no-print flex-wrap">
            <span className="text-xs text-gray-400 shrink-0">Filter:</span>

            {/* Rolling + YTD pills */}
            {ROLLING_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterMatch(dateFilter, f)
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Year selector */}
            {availableYears.length > 0 && (
              <div className="relative">
                <select
                  value={dateFilter.type === 'year' ? dateFilter.value : ''}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value, 10)
                    setDateFilter(yr ? { type: 'year', value: yr } : { type: 'all', value: null })
                  }}
                  className={`pl-3 pr-7 py-1 rounded-full text-xs font-medium border transition-colors appearance-none cursor-pointer ${
                    dateFilter.type === 'year'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <option value="">Year…</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <svg
                  className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 ${dateFilter.type === 'year' ? 'text-white' : 'text-gray-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}

            <span className="text-xs text-gray-400 ml-1">
              {rows.length.toLocaleString()} rows
              {dateFilter.type === 'ytd' && ` · Jan 1–today`}
              {dateFilter.type === 'year' && ` · full year ${dateFilter.value}`}
            </span>
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : kpis.length === 0 ? (
          // Empty state
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No KPIs defined yet</p>
            <p className="text-gray-400 text-sm mt-1">Define metrics to start seeing your dashboard.</p>
            <button
              onClick={() => navigate(`/source/${sourceId}/kpis`)}
              className="btn-primary mt-5"
            >
              Define your KPIs →
            </button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpis
                  .filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi')
                  .map((kpi) => <KPICard key={kpi.id} kpi={kpi} rows={rows} />)
                }
              </div>
            )}

            {/* Chart widgets */}
            {kpis
              .filter((k) => k.formula?.widget_type && k.formula.widget_type !== 'kpi')
              .map((widget) => <ChartWidget key={widget.id} widget={widget} rows={rows} />)
            }
          </>
        )}
      </main>
    </div>
  )
}
