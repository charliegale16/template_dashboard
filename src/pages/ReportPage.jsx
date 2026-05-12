import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth }   from '../hooks/useAuth'
import { useKPIs }   from '../hooks/useKPIs'
import { useReports } from '../hooks/useReports'
import {
  useReportList, useReportById,
  saveReport, deleteReport, duplicateReport, setReportShared,
} from '../hooks/useReport'
import { supabase } from '../lib/supabase'
import { loadSource, loadRows } from '../hooks/useDataSource'
import {
  computeKPI, formatKPI, getChartData,
  applyFilters, FILTER_OPERATORS,
  STROKE_COLOR, STROKE_COLOR_2,
} from '../utils/formulaEngine'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLLING_FILTERS = [
  { label: 'All time', type: 'all',  value: null },
  { label: 'Last 90d', type: 'days', value: 90   },
  { label: 'Last 30d', type: 'days', value: 30   },
  { label: 'Last 7d',  type: 'days', value: 7    },
  { label: 'YTD',      type: 'ytd',  value: null },
]
const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const HOURS        = Array.from({ length: 24 }, (_, i) => i)
const DATE_SLUGS   = ['date','day','time','created','period','month','week','year']

// ── Themes ────────────────────────────────────────────────────────────────────

const THEMES = {
  blue: {
    label:        'Blue',
    headerBg:     'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    headerText:   '#ffffff',
    headerSub:    '#bfdbfe',
    pageBg:       '#f8fafc',
    cardBg:       '#ffffff',
    cardBorder:   '#e2e8f0',
    bodyText:     '#0f172a',
    mutedText:    '#64748b',
    divider:      '#e2e8f0',
  },
  navy: {
    label:        'Navy',
    headerBg:     'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    headerText:   '#f1f5f9',
    headerSub:    '#94a3b8',
    pageBg:       '#f1f5f9',
    cardBg:       '#ffffff',
    cardBorder:   '#e2e8f0',
    bodyText:     '#0f172a',
    mutedText:    '#64748b',
    divider:      '#cbd5e1',
  },
  minimal: {
    label:        'Minimal',
    headerBg:     '#ffffff',
    headerText:   '#0f172a',
    headerSub:    '#64748b',
    pageBg:       '#ffffff',
    cardBg:       '#f8fafc',
    cardBorder:   '#e2e8f0',
    bodyText:     '#0f172a',
    mutedText:    '#64748b',
    divider:      '#e2e8f0',
  },
  dark: {
    label:        'Dark',
    headerBg:     '#111827',
    headerText:   '#f9fafb',
    headerSub:    '#9ca3af',
    pageBg:       '#1f2937',
    cardBg:       '#374151',
    cardBorder:   '#4b5563',
    bodyText:     '#f9fafb',
    mutedText:    '#9ca3af',
    divider:      '#4b5563',
  },
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
  executive: {
    label:       'Executive Summary',
    description: 'High-level KPI overview for leadership.',
    config: {
      title:       'Executive Summary',
      subtitle:    'Key Performance Indicators',
      description: 'This report provides a high-level overview of key business metrics.',
      theme:       'navy',
      header:      { showDate: true, showSource: true },
      footer:      { note: 'Confidential — For internal use only.', showRowCount: false, showTimestamp: true },
      dateFilter:  { type: 'days', value: 30 },
    },
  },
  operations: {
    label:       'Operations Dashboard',
    description: 'Weekly operations health check.',
    config: {
      title:       'Operations Report',
      subtitle:    'Weekly Overview',
      description: 'Operational metrics for the current period.',
      theme:       'blue',
      header:      { showDate: true, showSource: true },
      footer:      { note: '', showRowCount: true, showTimestamp: true },
      dateFilter:  { type: 'days', value: 7 },
    },
  },
  sales: {
    label:       'Sales Analytics',
    description: 'Year-to-date sales performance.',
    config: {
      title:       'Sales Performance',
      subtitle:    'Year to Date',
      description: 'Year-to-date sales performance and trends.',
      theme:       'blue',
      header:      { showDate: true, showSource: true },
      footer:      { note: '', showRowCount: true, showTimestamp: true },
      dateFilter:  { type: 'ytd', value: null },
    },
  },
}

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  title:       '',
  subtitle:    '',
  description: '',
  theme:       'blue',
  header:      { showDate: true, showSource: true },
  footer:      { note: '', showRowCount: true, showTimestamp: true },
  dateFilter:  { type: 'all', value: null },
  sections:    [],
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const KPI_COLOR_HEX = {
  blue:    '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
  red:     '#ef4444', purple:  '#8b5cf6', gray:  '#9ca3af',
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
function filterRowsByDate(rows, headers, dateFilter) {
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
function shortNum(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return Number(v.toFixed(2)).toString()
}
function timeAgo(iso) {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
function newSectionId() { return crypto.randomUUID() }

// ── Build default sections from kpis ─────────────────────────────────────────

function buildDefaultSections(kpis) {
  const sections = []
  const kpiCards    = kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi')
  const chartWidgets = kpis.filter((k) => k.formula?.widget_type && k.formula.widget_type !== 'kpi')

  if (kpiCards.length > 0) {
    sections.push({ id: newSectionId(), type: 'kpi_grid', widgetIds: kpiCards.map((k) => k.id) })
  }
  chartWidgets.forEach((w) => {
    sections.push({ id: newSectionId(), type: 'chart', widgetId: w.id })
  })
  return sections
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ sourceId, userId, onClose, onSaved }) {
  const { saveSchedule } = useReports(sourceId)
  const [form, setForm] = useState({
    name: 'Weekly Report', recipient: '', frequency: 'weekly',
    day_of_week: 1, day_of_month: 1, hour_utc: 9,
    date_filter: { type: 'all', value: null },
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.recipient.trim()) { setError('Recipient email is required.'); return }
    if (!form.name.trim())      { setError('Report name is required.'); return }
    setSaving(true); setError(null)
    try {
      await saveSchedule({ ...form, source_id: sourceId, user_id: userId })
      onSaved(); onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
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
          <div><label className="label">Report name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weekly KPI Summary" /></div>
          <div><label className="label">Recipient email</label>
            <input className="input" type="email" value={form.recipient} onChange={(e) => set('recipient', e.target.value)} placeholder="you@company.com" /></div>
          <div>
            <label className="label">Frequency</label>
            <div className="flex gap-2">
              {['daily','weekly','monthly'].map((f) => (
                <button key={f} type="button" onClick={() => set('frequency', f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${form.frequency === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {form.frequency === 'weekly' && (
            <div><label className="label">Day of week</label>
              <select className="input" value={form.day_of_week} onChange={(e) => set('day_of_week', +e.target.value)}>
                {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select></div>
          )}
          {form.frequency === 'monthly' && (
            <div><label className="label">Day of month</label>
              <select className="input" value={form.day_of_month} onChange={(e) => set('day_of_month', +e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{ordinal(d)}</option>)}
              </select></div>
          )}
          <div><label className="label">Send time (UTC)</label>
            <select className="input" value={form.hour_utc} onChange={(e) => set('hour_utc', +e.target.value)}>
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00 UTC</option>)}
            </select></div>
          <div>
            <label className="label">Data period</label>
            <select className="input"
              value={`${form.date_filter.type}|${form.date_filter.value ?? ''}`}
              onChange={(e) => { const [type, val] = e.target.value.split('|'); set('date_filter', { type, value: val ? +val : null }) }}>
              {ROLLING_FILTERS.map((f) => <option key={f.label} value={`${f.type}|${f.value ?? ''}`}>{f.label}</option>)}
            </select>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Setup required:</span> email delivery uses the{' '}
            <span className="font-medium">send-report</span> Edge Function with a{' '}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">Resend</a> API key.
          </div>
          {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>}
        </div>
        <div className="p-6 pt-0 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save schedule'}</button>
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
      <button onClick={() => onToggle(schedule.id, !schedule.active)}
        className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${schedule.active ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${schedule.active ? 'left-4' : 'left-0.5'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{schedule.name}</p>
        <p className="text-xs text-gray-400 truncate">{schedule.recipient} · {scheduleLabel(schedule)} · {filterLabel(schedule.date_filter)}</p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-gray-500 dark:text-gray-400">Next: {nextRun}</p>
        <p className="text-xs text-gray-400">Last: {lastSent}</p>
      </div>
      <button onClick={async () => { if (!confirm('Delete this schedule?')) return; setDeleting(true); try { await onDelete(schedule.id) } finally { setDeleting(false) } }}
        disabled={deleting} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Section Preview (inside live preview) ─────────────────────────────────────

function SectionPreview({ section, rows, kpis, theme }) {
  const t = THEMES[theme] ?? THEMES.blue

  const kpiById = useMemo(() => Object.fromEntries(kpis.map((k) => [k.id, k])), [kpis])

  if (section.type === 'divider') {
    return <div style={{ borderTop: `1px solid ${t.divider}`, margin: '4px 0' }} />
  }

  if (section.type === 'text') {
    return (
      <div style={{ padding: '10px 14px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, marginBottom: 8 }}>
        {section.title && <div style={{ fontSize: 11, fontWeight: 700, color: t.mutedText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.title}</div>}
        <div style={{ fontSize: 13, color: t.bodyText, lineHeight: 1.6 }}>{section.content || <span style={{ color: t.mutedText, fontStyle: 'italic' }}>No content</span>}</div>
      </div>
    )
  }

  if (section.type === 'kpi_grid') {
    const selected = (section.widgetIds ?? []).map((id) => kpiById[id]).filter(Boolean)
    if (!selected.length) return null
    const cols = Math.min(selected.length, 4)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 12 }}>
        {selected.map((kpi) => {
          const val = formatKPI(computeKPI(rows, kpi.formula), kpi.format)
          const hex = KPI_COLOR_HEX[kpi.color] ?? '#3b82f6'
          return (
            <div key={kpi.id} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${hex}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: t.mutedText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{kpi.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: hex, lineHeight: 1 }}>{val}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (section.type === 'chart') {
    const widget = kpiById[section.widgetId]
    if (!widget) return null
    const data    = getChartData(rows, widget.formula)
    const wt      = widget.formula?.widget_type
    const stroke1 = STROKE_COLOR[widget.color]  ?? '#3b82f6'
    const stroke2 = STROKE_COLOR_2[widget.color] ?? '#f59e0b'
    const axisProps = { tick: { fontSize: 10, fill: '#9ca3af' }, tickLine: false, axisLine: false }

    return (
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.bodyText, marginBottom: 10 }}>{widget.name}</div>
        {data.length === 0 ? (
          <div style={{ fontSize: 12, color: t.mutedText, textAlign: 'center', padding: '20px 0' }}>No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            {wt === 'bar_chart' ? (
              <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="x" {...axisProps} interval={0} />
                <YAxis {...axisProps} width={40} tickFormatter={shortNum} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={shortNum} />
                <Bar dataKey="y" name={widget.formula?.y_label || 'Value'} fill={stroke1} radius={[3,3,0,0]} maxBarSize={40} />
              </BarChart>
            ) : wt === 'comparison' ? (
              <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" />
                <YAxis {...axisProps} width={40} tickFormatter={shortNum} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={shortNum} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="y1" name={widget.formula?.y1_label || 'Series 1'} stroke={stroke1} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="y2" name={widget.formula?.y2_label || 'Series 2'} stroke={stroke2} strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="x" {...axisProps} interval="preserveStartEnd" />
                <YAxis {...axisProps} width={40} tickFormatter={shortNum} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={shortNum} />
                <Line type="monotone" dataKey="y" name={widget.formula?.y_label || 'Value'} stroke={stroke1} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return null
}

// ── Full Report Preview ───────────────────────────────────────────────────────

function ReportPreview({ config, rows, kpis, source }) {
  const t   = THEMES[config.theme] ?? THEMES.blue
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const titleResolved = config.title.trim() || (source?.name ? `${source.name} Report` : 'Analytics Report')

  return (
    <div style={{ background: t.pageBg, borderRadius: 16, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ background: t.headerBg, padding: '28px 32px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.headerSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Analytics Report</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.headerText, marginBottom: 2 }}>{titleResolved}</div>
        {config.subtitle && <div style={{ fontSize: 14, fontWeight: 600, color: t.headerSub, marginBottom: 4 }}>{config.subtitle}</div>}
        <div style={{ fontSize: 12, color: t.headerSub }}>
          {config.header.showSource && source?.name}{config.header.showSource && config.header.showDate && ' · '}
          {config.header.showDate && filterLabel(config.dateFilter)}
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Description */}
        {config.description && (
          <div style={{ marginBottom: 20, fontSize: 13, color: t.bodyText, lineHeight: 1.6 }}>{config.description}</div>
        )}

        {/* Sections */}
        {config.sections.map((section) => (
          <SectionPreview key={section.id} section={section} rows={rows} kpis={kpis} theme={config.theme} />
        ))}

        {config.sections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: t.mutedText, fontSize: 13 }}>
            No sections added — use the panel on the left to build your report.
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${t.divider}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.mutedText }}>
          <span>
            {config.footer.showRowCount && `${rows.length.toLocaleString()} rows · `}
            {filterLabel(config.dateFilter)}
            {config.footer.note && ` · ${config.footer.note}`}
          </span>
          {config.footer.showTimestamp && <span>Generated {now}</span>}
        </div>
      </div>
    </div>
  )
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

function generatePDF({ config, rows, kpis, source }) {
  const t = THEMES[config.theme] ?? THEMES.blue
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const titleResolved = config.title.trim() || (source?.name ? `${source.name} Report` : 'Analytics Report')

  const kpiById = Object.fromEntries(kpis.map((k) => [k.id, k]))

  const renderSection = (section) => {
    if (section.type === 'divider') {
      return `<hr style="border:none;border-top:1px solid ${t.divider};margin:12px 0;">`
    }
    if (section.type === 'text') {
      return `<div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        ${section.title ? `<div style="font-size:10px;font-weight:700;color:${t.mutedText};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${section.title}</div>` : ''}
        <div style="font-size:13px;color:${t.bodyText};line-height:1.6;">${section.content ?? ''}</div>
      </div>`
    }
    if (section.type === 'kpi_grid') {
      const selected = (section.widgetIds ?? []).map((id) => kpiById[id]).filter(Boolean)
      if (!selected.length) return ''
      const cols = Math.min(selected.length, 4)
      const cards = selected.map((kpi) => {
        const val = formatKPI(computeKPI(rows, kpi.formula), kpi.format)
        const hex = KPI_COLOR_HEX[kpi.color] ?? '#3b82f6'
        return `<div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-left:4px solid ${hex};border-radius:8px;padding:12px 14px;">
          <div style="font-size:9px;font-weight:600;color:${t.mutedText};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;">${kpi.name}</div>
          <div style="font-size:20px;font-weight:800;color:${hex};line-height:1;">${val}</div>
        </div>`
      }).join('')
      return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;margin-bottom:14px;">${cards}</div>`
    }
    if (section.type === 'chart') {
      const widget = kpiById[section.widgetId]
      if (!widget) return ''
      return `<div style="background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:600;color:${t.bodyText};margin-bottom:6px;">${widget.name}</div>
        <div style="height:40px;background:${t.cardBorder};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${t.mutedText};">[Chart — open in browser for interactive view]</div>
      </div>`
    }
    return ''
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${titleResolved}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${t.pageBg}; color: ${t.bodyText}; padding: 40px; font-size: 13px; }
  @media print { body { padding: 24px; } @page { margin: 15mm; } }
</style></head>
<body>
  <div style="background:${t.headerBg};border-radius:12px;padding:28px 32px;margin-bottom:28px;">
    <div style="font-size:10px;font-weight:700;color:${t.headerSub};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Analytics Report</div>
    <div style="font-size:24px;font-weight:800;color:${t.headerText};margin-bottom:2px;">${titleResolved}</div>
    ${config.subtitle ? `<div style="font-size:13px;font-weight:600;color:${t.headerSub};margin-bottom:4px;">${config.subtitle}</div>` : ''}
    <div style="font-size:12px;color:${t.headerSub};">${[config.header.showSource && source?.name, config.header.showDate && filterLabel(config.dateFilter)].filter(Boolean).join(' · ')}</div>
  </div>
  ${config.description ? `<div style="margin-bottom:20px;font-size:13px;color:${t.bodyText};line-height:1.6;">${config.description}</div>` : ''}
  ${config.sections.map(renderSection).join('')}
  <div style="margin-top:24px;padding-top:14px;border-top:1px solid ${t.divider};display:flex;justify-content:space-between;font-size:10px;color:${t.mutedText};">
    <span>${[config.footer.showRowCount && `${rows.length.toLocaleString()} rows`, filterLabel(config.dateFilter), config.footer.note].filter(Boolean).join(' · ')}</span>
    ${config.footer.showTimestamp ? `<span>Generated ${now}</span>` : ''}
  </div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }<\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Section editor row ────────────────────────────────────────────────────────

function SectionEditorRow({ section, index, total, kpis, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(false)

  const kpiCards    = kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi')
  const chartWidgets = kpis.filter((k) => k.formula?.widget_type && k.formula.widget_type !== 'kpi')

  const TYPE_LABELS = { kpi_grid: 'KPI Grid', chart: 'Chart', text: 'Text', divider: 'Divider' }
  const TYPE_COLORS = { kpi_grid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', chart: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', text: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', divider: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 disabled:opacity-30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 disabled:opacity-30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[section.type]}`}>{TYPE_LABELS[section.type]}</span>

        <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
          {section.type === 'kpi_grid' && `${section.widgetIds?.length ?? 0} metrics`}
          {section.type === 'chart' && (kpis.find((k) => k.id === section.widgetId)?.name ?? 'No widget')}
          {section.type === 'text' && (section.title || section.content?.slice(0, 30) || 'Empty')}
          {section.type === 'divider' && '─────'}
        </span>

        <button onClick={() => setExpanded((v) => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button onClick={onRemove} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-50 dark:border-gray-700 space-y-3">
          {section.type === 'kpi_grid' && (
            <div>
              <label className="label">KPI metrics to include</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {kpiCards.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={section.widgetIds?.includes(k.id) ?? false}
                      onChange={() => {
                        const ids = section.widgetIds ?? []
                        onUpdate({ widgetIds: ids.includes(k.id) ? ids.filter((id) => id !== k.id) : [...ids, k.id] })
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{k.name}</span>
                  </label>
                ))}
                {kpiCards.length === 0 && <p className="text-xs text-gray-400">No KPI cards defined.</p>}
              </div>
            </div>
          )}

          {section.type === 'chart' && (
            <div>
              <label className="label">Chart widget</label>
              <select className="input text-sm" value={section.widgetId ?? ''}
                onChange={(e) => onUpdate({ widgetId: e.target.value || undefined })}>
                <option value="">— Select chart —</option>
                {chartWidgets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {chartWidgets.length === 0 && <p className="text-xs text-gray-400 mt-1">No chart widgets defined.</p>}
            </div>
          )}

          {section.type === 'text' && (
            <>
              <div>
                <label className="label">Section heading <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="input text-sm" value={section.title ?? ''} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="e.g. Key Highlights" />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input text-sm resize-none" rows={3} value={section.content ?? ''} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Add a description, commentary, or notes…" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportPage({ viewOnly = false }) {
  const { sourceId, reportId: routeReportId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data
  const { kpis, loading: kpisLoading } = useKPIs(sourceId)
  const { schedules, loading: schLoading, saveSchedule, deleteSchedule, toggleSchedule } = useReports(sourceId ?? '')
  const { reports, loading: reportsLoading, reload: reloadReports } = useReportList(sourceId)

  const [source,      setSource]      = useState(null)
  const [allRows,     setAllRows]     = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  // Active report state
  const [reportId,   setReportId]   = useState(routeReportId ?? null)
  const [reportName, setReportName] = useState('Untitled Report')
  const [config,     setConfig]     = useState({ ...DEFAULT_CONFIG })
  const [shared,     setShared]     = useState(false)

  // UI state
  const [saving,             setSaving]             = useState(false)
  const [saveSuccess,        setSaveSuccess]         = useState(false)
  const [libraryOpen,        setLibraryOpen]         = useState(false)
  const [templatesOpen,      setTemplatesOpen]       = useState(false)
  const [showScheduleModal,  setShowScheduleModal]   = useState(false)
  const [showSchedules,      setShowSchedules]       = useState(false)
  const [shareToast,         setShareToast]          = useState(false)
  const [duplicating,        setDuplicating]         = useState(false)
  const shareTimer = useRef(null)

  // ── Load source + rows ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sourceId) return
    setDataLoading(true)
    Promise.all([loadSource(sourceId), loadRows(sourceId)])
      .then(([src, rows]) => { setSource(src); setAllRows(rows) })
      .finally(() => setDataLoading(false))
  }, [sourceId])

  // ── Load report if URL has reportId ────────────────────────────────────────
  useEffect(() => {
    if (!routeReportId) return
    const found = reports.find((r) => r.id === routeReportId)
    if (found) loadReportData(found.id)
  }, [routeReportId, reports]) // eslint-disable-line

  // ── Auto-build default sections once kpis load ─────────────────────────────
  useEffect(() => {
    if (!kpis.length || config.sections.length > 0) return
    setConfig((c) => ({ ...c, sections: buildDefaultSections(kpis) }))
  }, [kpis]) // eslint-disable-line

  // ── Derived rows ────────────────────────────────────────────────────────────
  const rows = useMemo(
    () => filterRowsByDate(allRows, source?.headers, config.dateFilter),
    [allRows, source, config.dateFilter]
  )

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

  const loading = dataLoading || kpisLoading

  // ── Config helpers ──────────────────────────────────────────────────────────
  const patchConfig  = useCallback((patch) => setConfig((c) => ({ ...c, ...patch })), [])
  const patchHeader  = useCallback((patch) => setConfig((c) => ({ ...c, header:  { ...c.header,  ...patch } })), [])
  const patchFooter  = useCallback((patch) => setConfig((c) => ({ ...c, footer:  { ...c.footer,  ...patch } })), [])

  // ── Section helpers ─────────────────────────────────────────────────────────
  const addSection = useCallback((type) => {
    let section = { id: newSectionId(), type }
    if (type === 'kpi_grid') {
      const kpiCards = kpis.filter((k) => !k.formula?.widget_type || k.formula.widget_type === 'kpi')
      section.widgetIds = kpiCards.map((k) => k.id)
    }
    if (type === 'chart') {
      const charts = kpis.filter((k) => k.formula?.widget_type && k.formula.widget_type !== 'kpi')
      section.widgetId = charts[0]?.id
    }
    setConfig((c) => ({ ...c, sections: [...c.sections, section] }))
  }, [kpis])

  const removeSection = useCallback((id) =>
    setConfig((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) })), [])

  const updateSection = useCallback((id, patch) =>
    setConfig((c) => ({ ...c, sections: c.sections.map((s) => s.id === id ? { ...s, ...patch } : s) })), [])

  const moveSection = useCallback((id, dir) => {
    setConfig((c) => {
      const idx = c.sections.findIndex((s) => s.id === id)
      const next = [...c.sections]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return c
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return { ...c, sections: next }
    })
  }, [])

  // ── Load saved report ───────────────────────────────────────────────────────
  async function loadReportData(id) {
    const { data, error } = await supabase.from('reports').select('*').eq('id', id).single()
    if (error || !data) return
    setReportId(data.id)
    setReportName(data.name)
    setShared(data.shared ?? false)
    setConfig({ ...DEFAULT_CONFIG, ...(data.config ?? {}) })
    setLibraryOpen(false)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user?.id) return
    setSaving(true)
    try {
      const saved = await saveReport({ id: reportId, sourceId, userId: user.id, name: reportName, config, shared })
      setReportId(saved.id)
      setSaveSuccess(true)
      reloadReports()
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  // ── New report ──────────────────────────────────────────────────────────────
  function handleNewReport() {
    setReportId(null)
    setReportName('Untitled Report')
    setShared(false)
    setConfig({ ...DEFAULT_CONFIG, sections: buildDefaultSections(kpis) })
    setLibraryOpen(false)
  }

  // ── Duplicate ───────────────────────────────────────────────────────────────
  async function handleDuplicate() {
    if (!reportId || !user?.id) return
    setDuplicating(true)
    try {
      const dup = await duplicateReport(reportId, user.id)
      reloadReports()
      setReportId(dup.id)
      setReportName(dup.name)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) { console.error(err) }
    finally { setDuplicating(false) }
  }

  // ── Share ───────────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!reportId) { await handleSave(); return }
    // Enable public sharing if not already
    if (!shared) {
      try {
        await setReportShared(reportId, true)
        setShared(true)
      } catch {}
    }
    const url = `${window.location.origin}/report/${reportId}`
    navigator.clipboard.writeText(url).catch(() => {})
    setShareToast(true)
    clearTimeout(shareTimer.current)
    shareTimer.current = setTimeout(() => setShareToast(false), 2500)
  }

  // ── Delete report ───────────────────────────────────────────────────────────
  async function handleDeleteReport(id) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    await deleteReport(id)
    if (id === reportId) handleNewReport()
    reloadReports()
  }

  // ── Apply template ──────────────────────────────────────────────────────────
  function applyTemplate(key) {
    const tmpl = TEMPLATES[key]
    if (!tmpl) return
    setConfig((c) => ({
      ...DEFAULT_CONFIG,
      ...tmpl.config,
      sections: c.sections.length > 0 ? c.sections : buildDefaultSections(kpis),
    }))
    setReportName(tmpl.config.title || 'Untitled Report')
    setTemplatesOpen(false)
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  function handleDownloadPDF() {
    generatePDF({ config, rows, kpis, source })
  }

  const titleResolved = config.title.trim() || (source?.name ? `${source.name} Report` : 'Analytics Report')

  // ── View-only mode (shared link) ────────────────────────────────────────────
  if (viewOnly) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        {loading ? (
          <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        ) : (
          <div className="w-full max-w-4xl">
            <ReportPreview config={config} rows={rows} kpis={kpis} source={source} />
          </div>
        )}
      </div>
    )
  }

  // ── Full builder ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Header ── */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* Back */}
          <button onClick={() => navigate(`/source/${sourceId}`)}
            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <span className="text-gray-300 dark:text-gray-600 shrink-0">/</span>

          {/* Report name input */}
          <input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded px-1 min-w-0 flex-1 max-w-xs"
            placeholder="Report name…"
          />

          {/* Unsaved indicator */}
          {!reportId && <span className="text-[10px] text-amber-500 font-medium shrink-0">Unsaved</span>}
          {saveSuccess && <span className="text-[10px] text-emerald-600 font-medium shrink-0">Saved ✓</span>}

          <div className="flex items-center gap-1.5 ml-auto shrink-0 flex-wrap justify-end">

            {/* Templates */}
            <div className="relative">
              <button onClick={() => setTemplatesOpen((v) => !v)} className="btn-secondary text-xs py-1.5 px-3">
                Templates
              </button>
              {templatesOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-30 py-1">
                  {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                    <button key={key} onClick={() => applyTemplate(key)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{tmpl.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tmpl.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Library */}
            <button onClick={() => setLibraryOpen((v) => !v)}
              className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 ${libraryOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Reports
              {reports.length > 0 && <span className="bg-brand-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{reports.length}</span>}
            </button>

            {/* Schedules */}
            <button onClick={() => setShowSchedules((v) => !v)}
              className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 ${showSchedules ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedules
              {schedules.length > 0 && <span className="bg-brand-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{schedules.length}</span>}
            </button>

            <button onClick={() => setShowScheduleModal(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Schedule email
            </button>

            <span className="w-px h-5 bg-gray-200 dark:bg-gray-600" />

            {/* Duplicate */}
            {reportId && (
              <button onClick={handleDuplicate} disabled={duplicating} className="btn-secondary text-xs py-1.5 px-3">
                {duplicating ? '…' : 'Duplicate'}
              </button>
            )}

            {/* Share */}
            <div className="relative">
              <button onClick={handleShare} className="btn-secondary text-xs py-1.5 px-3">Share</button>
              {shareToast && (
                <div className="absolute right-0 top-full mt-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow z-30">
                  Public link copied!
                </div>
              )}
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5 px-3">
              {saving ? 'Saving…' : reportId ? 'Save' : 'Save report'}
            </button>

            {/* PDF */}
            <button onClick={handleDownloadPDF} disabled={loading}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* ── Report Library panel ── */}
      {libraryOpen && (
        <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saved Reports</p>
              <button onClick={handleNewReport} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New report
              </button>
            </div>
            {reportsLoading ? (
              <div className="text-xs text-gray-400">Loading…</div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-gray-400">No saved reports yet. Configure a report and click <span className="font-medium text-gray-600 dark:text-gray-300">Save report</span>.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {reports.map((r) => (
                  <div key={r.id} className={`bg-gray-50 dark:bg-gray-700 rounded-xl border p-3 cursor-pointer transition-colors ${r.id === reportId ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <button className="flex-1 text-left" onClick={() => loadReportData(r.id)}>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(r.updated_at)} · v{r.version}</p>
                        {r.shared && <span className="text-[9px] text-emerald-600 font-semibold">SHARED</span>}
                      </button>
                      <button onClick={() => handleDeleteReport(r.id)}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-400 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Schedules panel ── */}
      {showSchedules && (
        <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Schedules</p>
            {schLoading ? <div className="text-xs text-gray-400">Loading…</div>
              : schedules.length === 0 ? <p className="text-sm text-gray-400">No schedules yet.</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schedules.map((s) => <ScheduleRow key={s.id} schedule={s} onToggle={toggleSchedule} onDelete={deleteSchedule} />)}
                </div>}
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

          {/* ── Left: Config panel ── */}
          <div className="space-y-4">

            {/* Report details */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Report details</h2>
              <div>
                <label className="label">Title</label>
                <input className="input" value={config.title} onChange={(e) => patchConfig({ title: e.target.value })}
                  placeholder={source?.name ? `${source.name} Report` : 'Analytics Report'} />
              </div>
              <div>
                <label className="label">Subtitle <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="input" value={config.subtitle} onChange={(e) => patchConfig({ subtitle: e.target.value })} placeholder="e.g. Q1 2026" />
              </div>
              <div>
                <label className="label">Introduction <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea className="input resize-none" rows={2} value={config.description} onChange={(e) => patchConfig({ description: e.target.value })} placeholder="Brief overview shown at the top of the report…" />
              </div>
            </div>

            {/* Theme */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Theme</h2>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button key={key} onClick={() => patchConfig({ theme: key })}
                    className={`rounded-lg overflow-hidden border-2 transition-colors ${config.theme === key ? 'border-brand-600' : 'border-transparent'}`}>
                    <div style={{ background: t.headerBg, height: 28 }} />
                    <div style={{ background: t.pageBg, height: 14 }} />
                    <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 py-1 px-1 text-center">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Header / Footer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Header & Footer</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.header.showDate} onChange={(e) => patchHeader({ showDate: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Show date range in header</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.header.showSource} onChange={(e) => patchHeader({ showSource: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Show source name in header</span>
                </label>
              </div>
              <div>
                <label className="label">Footer note <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="input text-sm" value={config.footer.note} onChange={(e) => patchFooter({ note: e.target.value })} placeholder="e.g. Confidential — internal use only" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.footer.showRowCount} onChange={(e) => patchFooter({ showRowCount: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Show row count in footer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.footer.showTimestamp} onChange={(e) => patchFooter({ showTimestamp: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Show generated timestamp in footer</span>
                </label>
              </div>
            </div>

            {/* Date range */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date range</h2>
              <div className="flex flex-wrap gap-2">
                {ROLLING_FILTERS.map((f) => (
                  <button key={f.label}
                    onClick={() => patchConfig({ dateFilter: { type: f.type, value: f.value } })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      config.dateFilter.type === f.type && config.dateFilter.value === f.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}>{f.label}</button>
                ))}
              </div>
              {availableYears.length > 0 && (
                <select className="input text-sm"
                  value={config.dateFilter.type === 'year' ? config.dateFilter.value : ''}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value, 10)
                    patchConfig({ dateFilter: yr ? { type: 'year', value: yr } : { type: 'all', value: null } })
                  }}>
                  <option value="">— Specific year —</option>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              <p className="text-xs text-gray-400">{rows.length.toLocaleString()} rows match this range</p>
            </div>

            {/* Sections */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sections</h2>
                <span className="text-xs text-gray-400">{config.sections.length} section{config.sections.length !== 1 ? 's' : ''}</span>
              </div>

              {config.sections.length === 0 && (
                <p className="text-xs text-gray-400">No sections yet. Add one below.</p>
              )}

              <div className="space-y-2">
                {config.sections.map((section, idx) => (
                  <SectionEditorRow
                    key={section.id}
                    section={section}
                    index={idx}
                    total={config.sections.length}
                    kpis={kpis}
                    onUpdate={(patch) => updateSection(section.id, patch)}
                    onRemove={() => removeSection(section.id)}
                    onMoveUp={() => moveSection(section.id, -1)}
                    onMoveDown={() => moveSection(section.id, 1)}
                  />
                ))}
              </div>

              {/* Add section buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { type: 'kpi_grid', label: '+ KPI Grid' },
                  { type: 'chart',    label: '+ Chart' },
                  { type: 'text',     label: '+ Text' },
                  { type: 'divider',  label: '+ Divider' },
                ].map(({ type, label }) => (
                  <button key={type} onClick={() => addSection(type)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Live preview ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Live Preview</p>
              <p className="text-xs text-gray-400">{config.sections.length} section{config.sections.length !== 1 ? 's' : ''} · {rows.length.toLocaleString()} rows · {filterLabel(config.dateFilter)}</p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-96 animate-pulse" />
            ) : (
              <ReportPreview config={config} rows={rows} kpis={kpis} source={source} />
            )}

            <p className="text-xs text-gray-400 text-center">
              PDF opens in a new tab — use <span className="font-medium">Save as PDF</span> in the print dialog.
            </p>
          </div>
        </div>
      </main>

      {/* ── Schedule modal ── */}
      {showScheduleModal && (
        <ScheduleModal
          sourceId={sourceId}
          userId={user?.id}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => setShowSchedules(true)}
        />
      )}
    </div>
  )
}
