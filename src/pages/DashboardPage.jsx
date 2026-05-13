import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useAuth } from '../hooks/useAuth'
import { useKPIs } from '../hooks/useKPIs'
import { loadSource, loadRows } from '../hooks/useDataSource'
import {
  computeKPI, formatKPI, getChartData,
  applyFilters, FILTER_OPERATORS,
  STROKE_COLOR, STROKE_COLOR_2,
} from '../utils/formulaEngine'
import { exportCSV } from '../utils/exportUtils'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useSheetSync } from '../hooks/useSheetSync'
import { SYNC_SCHEDULES, MIN_SYNC_INTERVAL_S } from '../features/integrations/sheetSyncService'

// ── Time helper ───────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return null
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
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
  let d = new Date(s)
  if (!isNaN(d)) return d
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    d = new Date(`${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`)
    if (!isNaN(d)) return d
  }
  return null
}

// ── Date filter ───────────────────────────────────────────────────────────────

const ROLLING_FILTERS = [
  { label: 'All',      type: 'all',  value: null },
  { label: 'Last 90d', type: 'days', value: 90   },
  { label: 'Last 30d', type: 'days', value: 30   },
  { label: 'Last 7d',  type: 'days', value: 7    },
  { label: 'YTD',      type: 'ytd',  value: null },
]

function filterMatch(a, b) {
  return a.type === b.type && a.value === b.value
}

function filterRowsByDate(rows, dateCol, filter) {
  if (!dateCol || filter.type === 'all') return rows
  const now = new Date()
  return rows.filter((r) => {
    const d = parseDate(r.data?.[dateCol])
    if (!d) return false
    if (filter.type === 'days') {
      const cutoff = new Date(); cutoff.setDate(now.getDate() - filter.value)
      return d >= cutoff
    }
    if (filter.type === 'ytd')  return d >= new Date(now.getFullYear(), 0, 1) && d <= now
    if (filter.type === 'year') return d.getFullYear() === filter.value
    return true
  })
}

// ── Previous period for trend indicators ──────────────────────────────────────

function buildPreviousPeriodRows(allRows, dateCol, filter, colFilters) {
  if (!dateCol || filter.type === 'all') return []
  const now = new Date()
  let prevRows = []

  if (filter.type === 'days') {
    const days        = filter.value
    const periodEnd   = new Date(); periodEnd.setDate(now.getDate() - days)
    const periodStart = new Date(); periodStart.setDate(now.getDate() - days * 2)
    prevRows = allRows.filter((r) => {
      const d = parseDate(r.data?.[dateCol])
      return d && d >= periodStart && d < periodEnd
    })
  } else if (filter.type === 'ytd') {
    const yearStart  = new Date(now.getFullYear() - 1, 0, 1)
    const yearCutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    prevRows = allRows.filter((r) => {
      const d = parseDate(r.data?.[dateCol])
      return d && d >= yearStart && d <= yearCutoff
    })
  } else if (filter.type === 'year') {
    prevRows = allRows.filter((r) => {
      const d = parseDate(r.data?.[dateCol])
      return d && d.getFullYear() === filter.value - 1
    })
  }

  if (colFilters?.length) prevRows = applyFilters(prevRows, colFilters)
  return prevRows
}

// ── Shared chart axis/tooltip helpers ─────────────────────────────────────────

function shortNum(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return Number(v.toFixed(2)).toString()
}

const AXIS_PROPS = {
  tick:     { fontSize: 11, fill: '#9ca3af' },
  tickLine: false,
  axisLine: false,
}

const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
  },
  formatter: shortNum,
}

// ── Grid / preset constants ───────────────────────────────────────────────────
// GRID_COLS=24, ROW_HEIGHT=31px, GAP=8px
//   pixel height formula: h × 31 + (h-1) × 8 = 39h - 8
//   S  w=2  h=3  → 109px tall  × ~120px wide   ≈ 122 × 122
//   M  w=4  h=6  → 226px tall  × ~240px wide   ≈ 233 × 233
//   L  w=6  h=9  → 343px tall  × ~360px wide   ≈ 333 × 333
//   Chart h=8    → 304px tall, ½ (w=12) or full (w=24)

const ROW_HEIGHT = 31
const GRID_GAP   = 8
const GRID_COLS  = 24

const KPI_PRESETS = [
  { label: 'S', w: 2, h: 3 },
  { label: 'M', w: 4, h: 6 },
  { label: 'L', w: 6, h: 9 },
]

const CHART_PRESETS = [
  { label: '½', w: 12 },
  { label: '■', w: 24 },
]

// KPI value font scales with tile height (grid rows)
function kpiValueClass(h) {
  if (h >= 9)  return 'text-5xl'
  if (h >= 6)  return 'text-4xl'
  if (h >= 3)  return 'text-2xl'
  return 'text-xl'
}

// ── Shared grip icon ──────────────────────────────────────────────────────────

function GripDots({ className = 'w-3 h-3 text-gray-300 dark:text-gray-600' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <circle cx="7"  cy="4"  r="1.4"/><circle cx="13" cy="4"  r="1.4"/>
      <circle cx="7"  cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/>
      <circle cx="7"  cy="16" r="1.4"/><circle cx="13" cy="16" r="1.4"/>
    </svg>
  )
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function TrendArrow({ up }) {
  return up ? (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
// Layout contract:
//   - Parent (react-grid-layout item) has explicit pixel height via inline style
//   - This card fills it with h-full flex-col
//   - NO overflow-hidden — it would clip the react-resizable drag handle
//   - flex-1 min-h-0 on the value section prevents flex children from overflowing

function KPICard({ kpi, rows, prevRows, layoutItem, onSizePreset }) {
  const value     = useMemo(() => computeKPI(rows, kpi.formula),     [rows, kpi.formula])
  const prevValue = useMemo(() => computeKPI(prevRows, kpi.formula), [prevRows, kpi.formula])
  const formatted = formatKPI(value, kpi.format)

  const trendPct = useMemo(() => {
    if (!prevRows?.length || prevValue == null || prevValue === 0) return null
    return ((value - prevValue) / Math.abs(prevValue)) * 100
  }, [value, prevValue, prevRows])

  const isUp      = trendPct !== null && trendPct >= 0
  const h         = layoutItem?.h ?? 3
  const showTrend = trendPct !== null && h >= 5

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">

      {/* Top bar: only controls — S/M/L presets + drag grip. No title here. */}
      <div className="flex items-center justify-end gap-1 px-2 pt-1.5 shrink-0">
        <div className="flex items-center gap-px">
          {KPI_PRESETS.map((p) => {
            const active = layoutItem?.h === p.h
            return (
              <button
                key={p.label}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSizePreset?.(kpi.id, p.w, p.h)}
                className={`text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center transition-colors leading-none ${
                  active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-400'
                }`}
                title={p.label === 'S' ? 'Small' : p.label === 'M' ? 'Medium' : 'Large'}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center">
          <GripDots />
        </div>
      </div>

      {/* Center: value + title stacked — both the same color, title always visible */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-2 pb-2 gap-0.5">
        <p className={`${kpiValueClass(h)} font-bold text-gray-900 dark:text-white leading-none tabular-nums`}>
          {formatted}
        </p>
        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate w-full text-center leading-tight">
          {kpi.name}
        </p>
        {showTrend && (
          <p className={`text-xs font-medium flex items-center gap-0.5 mt-0.5 ${
            isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}>
            <TrendArrow up={isUp} />
            <span>{Math.abs(trendPct).toFixed(1)}%</span>
          </p>
        )}
      </div>

    </div>
  )
}

// ── Chart Widget ──────────────────────────────────────────────────────────────
// Sizing strategy: a ResizeObserver on the chart body div measures its exact
// pixel dimensions after every layout change, then passes them as explicit px
// values to ResponsiveContainer. This is more reliable than height/width="100%"
// which can silently fail when the parent is a flex item (height) or when
// Recharts' own internal observer misses a grid-triggered resize (width).

function ChartWidget({ widget, rows, layoutItem, onSizePreset }) {
  const data    = useMemo(() => getChartData(rows, widget.formula), [rows, widget.formula])
  const wt      = widget.formula?.widget_type
  const stroke1 = STROKE_COLOR[widget.color]  ?? '#3b82f6'
  const stroke2 = STROKE_COLOR_2[widget.color] ?? '#f59e0b'

  // Measure the chart body so we can pass explicit px to ResponsiveContainer
  const bodyRef  = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const renderChart = () => {
    if (wt === 'bar_chart') {
      return (
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="x" {...AXIS_PROPS} interval={0} />
          <YAxis {...AXIS_PROPS} width={48} tickFormatter={shortNum} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar
            dataKey="y"
            name={widget.formula?.y_label || widget.formula?.y_column || 'Value'}
            fill={stroke1}
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      )
    }
    if (wt === 'comparison') {
      return (
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="x" {...AXIS_PROPS} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={48} tickFormatter={shortNum} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="y1" name={widget.formula?.y1_label || 'Series 1'} stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="y2" name={widget.formula?.y2_label || 'Series 2'} stroke={stroke2} strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      )
    }
    return (
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="x" {...AXIS_PROPS} interval="preserveStartEnd" />
        <YAxis {...AXIS_PROPS} width={48} tickFormatter={shortNum} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="y" name={widget.formula?.y_label || widget.formula?.y_column || 'Value'} stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </LineChart>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">

      {/* Header: drag zone (title + grip) | width presets */}
      <div className="flex items-center shrink-0 px-4 pt-3 pb-2 gap-2">
        <div className="drag-handle flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{widget.name}</p>
          <GripDots />
        </div>

        <div className="flex items-center gap-px shrink-0">
          {CHART_PRESETS.map((p) => {
            const active = layoutItem?.w === p.w
            return (
              <button
                key={p.label}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSizePreset?.(widget.id, p.w, layoutItem?.h ?? 8)}
                className={`text-[10px] font-semibold px-2 h-5 rounded flex items-center justify-center transition-colors ${
                  active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-400'
                }`}
                title={p.w === 12 ? 'Half width' : 'Full width'}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart body — flex-1 min-h-0 with explicit padding; ResizeObserver above
          measures this element and feeds pixel dimensions to ResponsiveContainer */}
      <div ref={bodyRef} className="flex-1 min-h-0 px-4 pb-4 pt-1">
        {!data.length ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            No data available for this chart.
          </p>
        ) : dims.w > 0 && dims.h > 0 ? (
          <ResponsiveContainer width={dims.w} height={dims.h}>
            {renderChart()}
          </ResponsiveContainer>
        ) : null}
      </div>

    </div>
  )
}

// ── Widget Grid ───────────────────────────────────────────────────────────────
// ResizeObserver measures the true container width so GridLayout renders
// correctly at any viewport without needing a responsive breakpoint config.

function WidgetGrid({ widgets, rows, prevRows, layout, onLayoutChange, layoutLoaded }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleSizePreset = useCallback((widgetId, newW, newH) => {
    const updated = layout.map((item) => {
      if (item.i !== widgetId) return item
      const w = Math.min(newW, item.maxW ?? GRID_COLS)
      const h = Math.min(newH, item.maxH ?? 30)
      // Clamp x so the item never overflows the right edge after a width increase
      const x = Math.min(item.x, GRID_COLS - w)
      return { ...item, x, w, h }
    })
    onLayoutChange(updated)
  }, [layout, onLayoutChange])

  if (!layoutLoaded) return null

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        layout={layout}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        width={width}
        margin={[GRID_GAP, GRID_GAP]}
        containerPadding={[0, 0]}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
        isResizable
        isDraggable
      >
        {widgets.map((w) => {
          const wt      = w.formula?.widget_type
          const isKPI   = !wt || wt === 'kpi'
          const item    = layout.find((l) => l.i === w.id)
          return (
            <div key={w.id} className="h-full">
              {isKPI
                ? <KPICard    kpi={w}    rows={rows} prevRows={prevRows} layoutItem={item} onSizePreset={handleSizePreset} />
                : <ChartWidget widget={w} rows={rows}                     layoutItem={item} onSizePreset={handleSizePreset} />
              }
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 w-28 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shrink-0" />
        ))}
      </div>
      <div className="h-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { sourceId } = useParams()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const userId = user?.id

  const { kpis, loading: kpisLoading } = useKPIs(sourceId)

  // ── Data loading ──────────────────────────────────────────────────────────
  const [source,      setSource]      = useState(null)
  const [allRows,     setAllRows]     = useState([])
  const [loadError,   setLoadError]   = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!sourceId) return
    setDataLoading(true)
    setLoadError(null)
    Promise.all([loadSource(sourceId), loadRows(sourceId)])
      .then(([src, rows]) => { setSource(src); setAllRows(rows) })
      .catch((err) => setLoadError(err.message))
      .finally(() => setDataLoading(false))
  }, [sourceId])

  const isSheet = Boolean(source?.meta?.sheetId)

  // ── Sheet sync ────────────────────────────────────────────────────────────
  const handleSyncComplete = useCallback((updated) => setSource(updated), [])

  const { sync, syncing, lastResult, error: syncError, updateSchedule } =
    useSheetSync(source, userId, accessToken, handleSyncComplete)

  // ── Date filter ───────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState({ type: 'all', value: null })

  const dateCol = useMemo(() => {
    if (!source?.headers) return null
    return source.headers.find(isDateColumn) ?? null
  }, [source])

  const availableYears = useMemo(() => {
    if (!dateCol || !allRows.length) return []
    const years = new Set()
    for (const r of allRows) {
      const d = parseDate(r.data?.[dateCol])
      if (d) years.add(d.getFullYear())
    }
    return [...years].sort((a, b) => b - a)
  }, [allRows, dateCol])

  // ── Column filters ────────────────────────────────────────────────────────
  const [colFilters,   setColFilters]   = useState([])
  const [filterDraft,  setFilterDraft]  = useState({ column: '', operator: 'equals', value: '' })
  const [addingFilter, setAddingFilter] = useState(false)

  const addColFilter = () => {
    if (!filterDraft.column) return
    const op = FILTER_OPERATORS.find((o) => o.value === filterDraft.operator)
    if (op?.needsValue && !filterDraft.value.trim()) return
    setColFilters((prev) => [...prev, { ...filterDraft }])
    setFilterDraft({ column: '', operator: 'equals', value: '' })
    setAddingFilter(false)
  }

  const removeColFilter = (idx) => setColFilters((prev) => prev.filter((_, i) => i !== idx))

  // ── Derived rows ──────────────────────────────────────────────────────────
  const dateFilteredRows = useMemo(
    () => filterRowsByDate(allRows, dateCol, dateFilter),
    [allRows, dateCol, dateFilter]
  )

  const rows = useMemo(
    () => colFilters.length ? applyFilters(dateFilteredRows, colFilters) : dateFilteredRows,
    [dateFilteredRows, colFilters]
  )

  const prevRows = useMemo(
    () => buildPreviousPeriodRows(allRows, dateCol, dateFilter, colFilters),
    [allRows, dateCol, dateFilter, colFilters]
  )

  // ── Layout ────────────────────────────────────────────────────────────────
  const {
    layout, layoutLoaded, onLayoutChange, resetLayout,
    snapshots, saveSnapshot, loadSnapshot, deleteSnapshot,
  } = useDashboardLayout(sourceId, userId, kpis)

  // ── Save view UI ──────────────────────────────────────────────────────────
  const [saveViewOpen,  setSaveViewOpen]  = useState(false)
  const [saveViewName,  setSaveViewName]  = useState('')
  const [savingView,    setSavingView]    = useState(false)
  const [viewsOpen,     setViewsOpen]     = useState(false)
  const viewsRef     = useRef(null)
  const saveInputRef = useRef(null)

  useEffect(() => {
    if (saveViewOpen && saveInputRef.current) saveInputRef.current.focus()
  }, [saveViewOpen])

  useEffect(() => {
    if (!viewsOpen) return
    const handler = (e) => {
      if (viewsRef.current && !viewsRef.current.contains(e.target)) setViewsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [viewsOpen])

  const handleSaveView = async () => {
    if (!saveViewName.trim()) return
    setSavingView(true)
    await saveSnapshot(saveViewName.trim())
    setSavingView(false)
    setSaveViewOpen(false)
    setSaveViewName('')
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const [shareToast, setShareToast] = useState(false)
  const shareTimer = useRef(null)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setShareToast(true)
    clearTimeout(shareTimer.current)
    shareTimer.current = setTimeout(() => setShareToast(false), 2500)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!source) return
    exportCSV(source.headers, rows, `${source.name}.csv`)
  }

  const loading = dataLoading || kpisLoading

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        .react-grid-item.react-grid-placeholder {
          background: #6366f1 !important;
          opacity: 0.1 !important;
          border-radius: 12px;
        }
        /* Resize handle: hidden at rest, visible on hover */
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .react-grid-item:hover .react-resizable-handle {
          opacity: 1;
        }
      `}</style>

      {/* ── Header ── */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20 no-print">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[160px]">
              {source?.name ?? 'Dashboard'}
            </span>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">

            {/* Sheet sync controls */}
            {isSheet && (
              <>
                <span className={`text-xs font-medium rounded-lg border py-1.5 px-2.5 flex items-center gap-1.5 ${
                  syncing
                    ? 'border-blue-200 text-blue-600 dark:border-blue-700 dark:text-blue-400'
                    : source?.meta?.sync_status === 'error'
                    ? 'border-red-200 text-red-600 dark:border-red-700 dark:text-red-400'
                    : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}>
                  {syncing ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Syncing…
                    </>
                  ) : source?.meta?.sync_status === 'error' ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Sync error
                    </>
                  ) : source?.meta?.last_synced_at ? (
                    <>
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {timeAgo(source.meta.last_synced_at)}
                    </>
                  ) : (
                    'Never synced'
                  )}
                </span>

                <select
                  value={source?.meta?.sync_schedule ?? 'manual'}
                  onChange={(e) => updateSchedule(e.target.value)}
                  title={`Rate limit: ${MIN_SYNC_INTERVAL_S / 60}min between syncs`}
                  className="text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 py-1.5 pl-3 pr-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {SYNC_SCHEDULES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <button
                  onClick={sync}
                  disabled={syncing}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <svg className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>

                <span className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
              </>
            )}

            {/* Edit Widgets */}
            <button
              onClick={() => navigate(`/source/${sourceId}/kpis`)}
              className="btn-secondary text-xs py-1.5 px-3 hidden sm:inline-flex"
            >
              Edit Widgets
            </button>

            {/* Save view */}
            {saveViewOpen ? (
              <div className="flex items-center gap-1">
                <input
                  ref={saveInputRef}
                  value={saveViewName}
                  onChange={(e) => setSaveViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  handleSaveView()
                    if (e.key === 'Escape') { setSaveViewOpen(false); setSaveViewName('') }
                  }}
                  placeholder="View name…"
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 w-32 bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handleSaveView}
                  disabled={savingView || !saveViewName.trim()}
                  className="btn-primary text-xs py-1.5 px-2.5"
                >
                  {savingView ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setSaveViewOpen(false); setSaveViewName('') }}
                  className="btn-secondary text-xs py-1.5 px-2"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setSaveViewOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
                Save view
              </button>
            )}

            {/* Views dropdown */}
            {snapshots.length > 0 && (
              <div className="relative" ref={viewsRef}>
                <button
                  onClick={() => setViewsOpen((v) => !v)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  Views
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {viewsOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-30 py-1">
                    {snapshots.map((snap) => (
                      <div key={snap.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 group">
                        <button
                          onClick={() => { loadSnapshot(snap.id); setViewsOpen(false) }}
                          className="flex-1 text-left text-xs text-gray-700 dark:text-gray-200 truncate"
                        >
                          {snap.name}
                          <span className="text-gray-400 ml-1">{timeAgo(snap.savedAt)}</span>
                        </button>
                        <button
                          onClick={() => deleteSnapshot(snap.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reset layout */}
            <button onClick={resetLayout} className="btn-secondary text-xs py-1.5 px-3">
              Reset
            </button>

            <span className="w-px h-5 bg-gray-200 dark:bg-gray-600" />

            {/* Share */}
            <div className="relative">
              <button onClick={handleShare} className="btn-secondary text-xs py-1.5 px-3">
                Share
              </button>
              {shareToast && (
                <div className="absolute right-0 top-full mt-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow z-30">
                  Link copied!
                </div>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={!source || loading}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Export CSV
            </button>

            {/* Report builder */}
            <button
              onClick={() => navigate(`/source/${sourceId}/report`)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Load error */}
        {loadError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {loadError}
          </div>
        )}

        {/* Sync error */}
        {syncError && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 no-print">
            Sync failed: {syncError}
          </div>
        )}

        {/* ── Filter bar ── */}
        {!loading && (dateCol || source?.headers?.length) && (
          <div className="flex items-start gap-2 flex-wrap no-print">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-1">Filter:</span>

            {dateCol && ROLLING_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterMatch(dateFilter, f)
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}

            {dateCol && availableYears.length > 0 && (
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
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
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

            {colFilters.map((f, idx) => {
              const opLabel = FILTER_OPERATORS.find((o) => o.value === f.operator)?.label ?? f.operator
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                >
                  <span className="font-semibold">{f.column}</span>
                  <span className="text-indigo-400">{opLabel}</span>
                  {f.value && <span>{f.value}</span>}
                  <button onClick={() => removeColFilter(idx)} className="ml-0.5 hover:text-red-500">×</button>
                </span>
              )
            })}

            {addingFilter ? (
              <div className="flex items-center gap-1 flex-wrap">
                <select
                  value={filterDraft.column}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, column: e.target.value }))}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="">Column…</option>
                  {source?.headers?.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <select
                  value={filterDraft.operator}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, operator: e.target.value }))}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                >
                  {FILTER_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {FILTER_OPERATORS.find((o) => o.value === filterDraft.operator)?.needsValue && (
                  <input
                    value={filterDraft.value}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, value: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addColFilter()}
                    placeholder="value…"
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 w-24 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
                  />
                )}
                <button onClick={addColFilter} className="btn-primary text-xs py-1 px-2.5">Add</button>
                <button onClick={() => setAddingFilter(false)} className="btn-secondary text-xs py-1 px-2">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingFilter(true)}
                className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 transition-colors"
              >
                + filter
              </button>
            )}

            {(colFilters.length > 0 || dateFilter.type !== 'all') && (
              <button
                onClick={() => { setColFilters([]); setDateFilter({ type: 'all', value: null }) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}

            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
              {rows.length.toLocaleString()} rows
            </span>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <Skeleton />
        ) : kpis.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">No widgets defined yet</p>
            <p className="text-gray-400 text-sm mt-1">Define metrics to start seeing your dashboard.</p>
            <button onClick={() => navigate(`/source/${sourceId}/kpis`)} className="btn-primary mt-5">
              Define your KPIs →
            </button>
          </div>
        ) : (
          <WidgetGrid
            widgets={kpis}
            rows={rows}
            prevRows={prevRows}
            layout={layout}
            onLayoutChange={onLayoutChange}
            layoutLoaded={layoutLoaded}
          />
        )}

      </main>
    </div>
  )
}
