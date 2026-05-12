import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useKPIs } from '../hooks/useKPIs'
import { useReports } from '../hooks/useReports'
import { loadSource, loadRows } from '../hooks/useDataSource'
import { computeKPI, formatKPI, STROKE_COLOR } from '../utils/formulaEngine'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLLING_FILTERS = [
  { label: 'All time',  type: 'all',  value: null },
  { label: 'Last 90d',  type: 'days', value: 90   },
  { label: 'Last 30d',  type: 'days', value: 30   },
  { label: 'Last 7d',   type: 'days', value: 7    },
  { label: 'YTD',       type: 'ytd',  value: null },
]
const DAYS_OF_WEEK   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const HOURS          = Array.from({ length: 24 }, (_, i) => i)
const DATE_SLUGS     = ['date','day','time','created','period','month','week','year']

const COLOR_BORDER = {
  blue:    'border-l-blue-500',   emerald: 'border-l-emerald-500',
  amber:   'border-l-amber-500',  red:     'border-l-red-500',
  purple:  'border-l-purple-500', gray:    'border-l-gray-400',
}
const COLOR_TEXT = {
  blue:    'text-blue-500', emerald: 'text-emerald-500', amber:  'text-amber-500',
  red:     'text-red-500',  purple:  'text-purple-500',  gray:   'text-gray-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDateColumn(h) {
  const s = h.toLowerCase().replace(/[^a-z]/g, '')
  return DATE_SLUGS.some((d) => s.includes(d))
}
function parseDate(val) {
  if (!val) return null
  const d = new Date(String(val).trim())
  return isNaN(d) ? null : d
}
function filterRows(rows, headers, dateFilter) {
  if (dateFilter.type === 'all') return rows
  const dateCol = headers?.find(isDateColumn)
  if (!dateCol) return rows
  const now = new Date()
  return rows.filter((r) => {
    const d = parseDate(r.data?.[dateCol])
    if (!d) return false
    if (dateFilter.type === 'days') {
      const cut = new Date(); cut.setDate(now.getDate() - dateFilter.value)
      return d >= cut
    }
    if (dateFilter.type === 'ytd') return d >= new Date(now.getFullYear(), 0, 1) && d <= now
    if (dateFilter.type === 'year') return d.getFullYear() === dateFilter.value
    return true
  })
}
function filterLabel(f) {
  if (f.type === 'all')  return 'All time'
  if (f.type === 'days') return `Last ${f.value} days`
  if (f.type === 'ytd')  return 'Year to date'
  if (f.type === 'year') return `Full year ${f.value}`
  return 'Custom range'
}
function ordinal(n) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
function scheduleLabel(s) {
  if (s.frequency === 'daily')   return `Daily at ${s.hour_utc}:00 UTC`
  if (s.frequency === 'weekly')  return `Every ${DAYS_OF_WEEK[s.day_of_week ?? 1]} at ${s.hour_utc}:00 UTC`
  if (s.frequency === 'monthly') return `Monthly on the ${ordinal(s.day_of_month ?? 1)} at ${s.hour_utc}:00 UTC`
  return s.frequency
}

// ── PDF generator ─────────────────────────────────────────────────────────────

function downloadPDF(reportTitle, sourceName, dateFilterLabel, kpiResults, rowCount) {
  const colorHex = {
    blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
    red: '#ef4444',  purple: '#8b5cf6', gray: '#9ca3af',
  }

  const kpiGrid = () => {
    const rows = []
    for (let i = 0; i < kpiResults.length; i += 4) {
      const chunk = kpiResults.slice(i, i + 4)
      while (chunk.length % 4 !== 0) chunk.push(null)
      rows.push(`<div class="kpi-row">${chunk.map((k) => k
        ? `<div class="kpi-card" style="border-left-color:${colorHex[k.color] ?? '#3b82f6'}">
             <div class="kpi-name">${k.name}</div>
             <div class="kpi-value" style="color:${colorHex[k.color] ?? '#3b82f6'}">${k.value}</div>
           </div>`
        : '<div class="kpi-card kpi-empty"></div>'
      ).join('')}</div>`)
    }
    return rows.join('')
  }

  const tableRows = kpiResults.map((k) =>
    `<tr><td>${k.name}</td><td class="val">${k.value}</td></tr>`
  ).join('')

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${reportTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #fff; color: #0f172a; padding: 40px; font-size: 13px; }
  .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            border-radius: 16px; padding: 36px 40px; margin-bottom: 32px; }
  .header .eyebrow { font-size: 10px; font-weight: 700; color: #93c5fd;
                     text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  .header h1 { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 4px; }
  .header .sub { font-size: 13px; color: #bfdbfe; }
  .section-label { font-size: 10px; font-weight: 700; color: #94a3b8;
                   text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
  .kpi-card { border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6;
              border-radius: 12px; padding: 16px 18px; background: #f8fafc; }
  .kpi-card.kpi-empty { border: none; background: none; }
  .kpi-name { font-size: 10px; font-weight: 600; color: #64748b;
              text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi-value { font-size: 24px; font-weight: 800; color: #3b82f6; line-height: 1; }
  .section { margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  thead tr { background: #f8fafc; }
  th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700;
       color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 10px 16px; font-size: 13px; border-top: 1px solid #f1f5f9; }
  td.val { text-align: right; font-weight: 700; }
  .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  @media print {
    body { padding: 24px; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="eyebrow">Analytics Report</div>
    <h1>${reportTitle}</h1>
    <div class="sub">${sourceName} &nbsp;·&nbsp; ${dateFilterLabel}</div>
  </div>

  <div class="section">
    <div class="section-label">Key Metrics</div>
    ${kpiGrid()}
  </div>

  <div class="section">
    <div class="section-label">Metrics Summary</div>
    <table>
      <thead><tr><th>Metric</th><th style="text-align:right">Value</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>${rowCount.toLocaleString()} rows · ${dateFilterLabel}</span>
    <span>Generated ${now} · Analytics Dashboard</span>
  </div>

<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }<\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ sourceId, userId, onClose, onSaved }) {
  const { saveSchedule } = useReports(sourceId)
  const [form, setForm] = useState({
    name: 'Weekly Report',
    recipient: '',
    frequency: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    hour_utc: 9,
    date_filter: { type: 'all', value: null },
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.recipient.trim()) { setError('Recipient email is required.'); return }
    if (!form.name.trim())      { setError('Report name is required.'); return }
    setSaving(true); setError(null)
    try {
      await saveSchedule({ ...form, source_id: sourceId, user_id: userId })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50 text-base">Schedule email report</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automatically send KPI summaries by email.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Report name */}
          <div>
            <label className="label">Report name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weekly KPI Summary" />
          </div>

          {/* Recipient */}
          <div>
            <label className="label">Recipient email</label>
            <input className="input" type="email" value={form.recipient} onChange={(e) => set('recipient', e.target.value)} placeholder="you@company.com" />
          </div>

          {/* Frequency */}
          <div>
            <label className="label">Frequency</label>
            <div className="flex gap-2">
              {['daily','weekly','monthly'].map((f) => (
                <button
                  key={f} type="button"
                  onClick={() => set('frequency', f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    form.frequency === f
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >{f}</button>
              ))}
            </div>
          </div>

          {/* Day of week (weekly) */}
          {form.frequency === 'weekly' && (
            <div>
              <label className="label">Day of week</label>
              <select className="input" value={form.day_of_week} onChange={(e) => set('day_of_week', +e.target.value)}>
                {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Day of month (monthly) */}
          {form.frequency === 'monthly' && (
            <div>
              <label className="label">Day of month</label>
              <select className="input" value={form.day_of_month} onChange={(e) => set('day_of_month', +e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{ordinal(d)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Hour */}
          <div>
            <label className="label">Send time (UTC)</label>
            <select className="input" value={form.hour_utc} onChange={(e) => set('hour_utc', +e.target.value)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00 UTC</option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <div>
            <label className="label">Data period</label>
            <select
              className="input"
              value={`${form.date_filter.type}|${form.date_filter.value ?? ''}`}
              onChange={(e) => {
                const [type, val] = e.target.value.split('|')
                set('date_filter', { type, value: val ? +val : null })
              }}
            >
              {ROLLING_FILTERS.map((f) => (
                <option key={f.label} value={`${f.type}|${f.value ?? ''}`}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Resend notice */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Setup required:</span> email delivery uses the{' '}
            <span className="font-medium">send-report</span> Supabase Edge Function with a{' '}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">Resend</a> API key.
            See <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/functions/send-report/</code> for deployment instructions.
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Schedule row ──────────────────────────────────────────────────────────────

function ScheduleRow({ schedule, onToggle, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const nextRun = schedule.next_run_at
    ? new Date(schedule.next_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
  const lastSent = schedule.last_sent_at
    ? new Date(schedule.last_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never'

  async function handleDelete() {
    if (!confirm('Delete this schedule?')) return
    setDeleting(true)
    try { await onDelete(schedule.id) } finally { setDeleting(false) }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
      {/* Toggle */}
      <button
        onClick={() => onToggle(schedule.id, !schedule.active)}
        className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${schedule.active ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        title={schedule.active ? 'Pause' : 'Resume'}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${schedule.active ? 'left-4' : 'left-0.5'}`} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{schedule.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {schedule.recipient} · {scheduleLabel(schedule)} · {filterLabel(schedule.date_filter)}
        </p>
      </div>

      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-gray-500 dark:text-gray-400">Next: {nextRun}</p>
        <p className="text-xs text-gray-400">Last: {lastSent}</p>
      </div>

      <button onClick={handleDelete} disabled={deleting} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Report Preview ────────────────────────────────────────────────────────────

function ReportPreview({ title, sourceName, dateFilterLabel, kpiResults, rowCount, note }) {
  const colorHex = { blue:'#3b82f6', emerald:'#10b981', amber:'#f59e0b', red:'#ef4444', purple:'#8b5cf6', gray:'#9ca3af' }
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Report header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', padding: '28px 32px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Analytics Report</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 2 }}>{title || 'Untitled Report'}</div>
        <div style={{ fontSize: 12, color: '#bfdbfe' }}>{sourceName} · {dateFilterLabel}</div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* KPI grid */}
        {kpiResults.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Key Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpiResults.length, 4)}, 1fr)`, gap: 10 }}>
              {kpiResults.map((k, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${colorHex[k.color] ?? '#3b82f6'}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{k.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: colorHex[k.color] ?? '#3b82f6', lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail table */}
        {kpiResults.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Summary Table</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Metric</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {kpiResults.map((k, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#334155' }}>{k.name}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{k.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kpiResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
            No KPI cards selected — enable at least one metric above.
          </div>
        )}

        {/* Note */}
        {note && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
            {note}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
          <span>{rowCount.toLocaleString()} rows · {dateFilterLabel}</span>
          <span>Generated {now}</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { sourceId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { kpis, loading: kpisLoading } = useKPIs(sourceId)
  const { schedules, loading: schLoading, saveSchedule, deleteSchedule, toggleSchedule } = useReports(sourceId)

  const [source, setSource]       = useState(null)
  const [allRows, setAllRows]     = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  // Report config
  const [reportTitle, setReportTitle]   = useState('')
  const [note, setNote]                 = useState('')
  const [dateFilter, setDateFilter]     = useState({ type: 'all', value: null })
  const [selectedKPIs, setSelectedKPIs] = useState(new Set())
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSchedules, setShowSchedules]         = useState(false)

  // Load data
  useEffect(() => {
    if (!sourceId) return
    setDataLoading(true)
    Promise.all([loadSource(sourceId), loadRows(sourceId)])
      .then(([src, rows]) => { setSource(src); setAllRows(rows) })
      .finally(() => setDataLoading(false))
  }, [sourceId])

  // Auto-select all KPI cards when loaded
  useEffect(() => {
    const kpiCards = kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi')
    setSelectedKPIs(new Set(kpiCards.map((k) => k.id)))
  }, [kpis])

  // Filtered rows
  const rows = useMemo(
    () => filterRows(allRows, source?.headers, dateFilter),
    [allRows, source, dateFilter]
  )

  // Available years
  const availableYears = useMemo(() => {
    const dateCol = source?.headers?.find(isDateColumn)
    if (!dateCol) return []
    const years = new Set()
    for (const r of allRows) {
      const d = parseDate(r.data?.[dateCol])
      if (d) years.add(d.getFullYear())
    }
    return [...years].sort((a, b) => b - a)
  }, [allRows, source])

  // KPI cards only
  const kpiCards = useMemo(
    () => kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi'),
    [kpis]
  )

  // Computed KPI results for selected widgets
  const kpiResults = useMemo(() =>
    kpiCards
      .filter((k) => selectedKPIs.has(k.id))
      .map((k) => ({
        name:  k.name,
        value: formatKPI(computeKPI(rows, k.formula), k.format),
        color: k.color ?? 'blue',
      })),
    [kpiCards, selectedKPIs, rows]
  )

  const reportTitleResolved = reportTitle.trim() || (source?.name ? `${source.name} Report` : 'Analytics Report')
  const dateFilterLabel     = filterLabel(dateFilter)
  const loading             = dataLoading || kpisLoading

  function toggleKPI(id) {
    setSelectedKPIs((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDownloadPDF() {
    downloadPDF(reportTitleResolved, source?.name ?? '', dateFilterLabel, kpiResults, rows.length)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(`/source/${sourceId}`)} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">Report Builder</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSchedules((v) => !v)}
              className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 ${showSchedules ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedules {schedules.length > 0 && <span className="bg-brand-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{schedules.length}</span>}
            </button>
            <button onClick={() => setShowScheduleModal(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Schedule email
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={loading || kpiResults.length === 0}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Schedules panel */}
      {showSchedules && (
        <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Schedules</p>
            {schLoading ? (
              <div className="text-xs text-gray-400">Loading…</div>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-gray-400">No email schedules yet. Click <span className="font-medium text-gray-600 dark:text-gray-300">Schedule email</span> to set one up.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {schedules.map((s) => (
                  <ScheduleRow key={s.id} schedule={s} onToggle={toggleSchedule} onDelete={deleteSchedule} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

          {/* ── Left: Config panel ── */}
          <div className="space-y-5">

            {/* Report details */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Report details</h2>
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={source?.name ? `${source.name} Report` : 'Analytics Report'}
                />
              </div>
              <div>
                <label className="label">Footer note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confidential — internal use only" />
              </div>
            </div>

            {/* Date range */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date range</h2>
              <div className="flex flex-wrap gap-2">
                {ROLLING_FILTERS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setDateFilter({ type: f.type, value: f.value })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      dateFilter.type === f.type && dateFilter.value === f.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >{f.label}</button>
                ))}
              </div>
              {availableYears.length > 0 && (
                <div>
                  <label className="label text-xs">Specific year</label>
                  <select
                    className="input text-sm"
                    value={dateFilter.type === 'year' ? dateFilter.value : ''}
                    onChange={(e) => {
                      const yr = parseInt(e.target.value, 10)
                      setDateFilter(yr ? { type: 'year', value: yr } : { type: 'all', value: null })
                    }}
                  >
                    <option value="">— Select year —</option>
                    {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
              <p className="text-xs text-gray-400">{rows.length.toLocaleString()} rows match this range</p>
            </div>

            {/* KPI selection */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Metrics to include</h2>
                <button
                  onClick={() => {
                    if (selectedKPIs.size === kpiCards.length) setSelectedKPIs(new Set())
                    else setSelectedKPIs(new Set(kpiCards.map((k) => k.id)))
                  }}
                  className="text-xs text-brand-600 hover:underline"
                >
                  {selectedKPIs.size === kpiCards.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
                </div>
              ) : kpiCards.length === 0 ? (
                <p className="text-xs text-gray-400">No KPI cards defined yet. <button onClick={() => navigate(`/source/${sourceId}/kpis`)} className="text-brand-600 hover:underline">Add some →</button></p>
              ) : (
                <div className="space-y-2">
                  {kpiCards.map((k) => (
                    <label key={k.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedKPIs.has(k.id)}
                        onChange={() => toggleKPI(k.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                      />
                      <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-l-4 border-gray-100 dark:border-gray-700 ${COLOR_BORDER[k.color] ?? 'border-l-blue-500'} bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors`}>
                        <span className={`text-sm font-medium ${selectedKPIs.has(k.id) ? (COLOR_TEXT[k.color] ?? 'text-blue-500') : 'text-gray-400'} truncate`}>{k.name}</span>
                        {selectedKPIs.has(k.id) && rows.length > 0 && (
                          <span className="ml-auto text-xs font-bold text-gray-700 dark:text-gray-200 shrink-0">
                            {formatKPI(computeKPI(rows, k.formula), k.format)}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Live preview ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Live Preview</p>
              <p className="text-xs text-gray-400">{kpiResults.length} metric{kpiResults.length !== 1 ? 's' : ''} · {rows.length.toLocaleString()} rows</p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-96 animate-pulse" />
            ) : (
              <ReportPreview
                title={reportTitleResolved}
                sourceName={source?.name ?? ''}
                dateFilterLabel={dateFilterLabel}
                kpiResults={kpiResults}
                rowCount={rows.length}
                note={note}
              />
            )}

            <p className="text-xs text-gray-400 text-center">
              The PDF will open in a new tab — use <span className="font-medium">Save as PDF</span> in the print dialog.
            </p>
          </div>
        </div>
      </main>

      {/* Schedule modal */}
      {showScheduleModal && (
        <ScheduleModal
          sourceId={sourceId}
          userId={user?.id}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => { setShowSchedules(true) }}
        />
      )}
    </div>
  )
}
