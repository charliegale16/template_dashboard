import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useKPIs } from '../hooks/useKPIs'
import { loadSource, loadRows } from '../hooks/useDataSource'
import { computeKPI, formatKPI, getChartData, applyFilters, enrichRows, FILTER_OPERATORS, STROKE_COLOR, STROKE_COLOR_2, getExpressionColumns } from '../utils/formulaEngine'
import {
  AGGREGATIONS, AGGREGATIONS_CHART, FORMATS, COLORS,
  validateWidget,
} from '../features/widgets/widgetSchema'

// ── Constants ─────────────────────────────────────────────────────────────────

const WIDGET_TYPES = [
  {
    value: 'kpi',
    label: 'KPI Card',
    description: 'Single aggregated metric',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    value: 'line_chart',
    label: 'Line Chart',
    description: 'Trend over time or category',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 20h18" />
      </svg>
    ),
  },
  {
    value: 'bar_chart',
    label: 'Bar Chart',
    description: 'Compare values across categories',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    value: 'comparison',
    label: 'Comparison',
    description: 'Two data series on one chart',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-5 3 3 4-6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l3 3 3-2 4 5" />
      </svg>
    ),
  },
]

const MAX_KPIS = 10

// ── Chart style constants ──────────────────────────────────────────────────────

const CHART_GRID_COLOR    = '#374151'
const CHART_TICK_COLOR    = '#9ca3af'
const CHART_TOOLTIP_STYLE = {
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid #374151',
  backgroundColor: '#1f2937',
  color: '#f3f4f6',
}

const COLOR_DOT = {
  blue:    'bg-blue-500',   emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',  red:     'bg-red-500',
  purple:  'bg-purple-500', gray:    'bg-gray-400',
}
const COLOR_BORDER = {
  blue:    'border-l-blue-500',   emerald: 'border-l-emerald-500',
  amber:   'border-l-amber-500',  red:     'border-l-red-500',
  purple:  'border-l-purple-500', gray:    'border-l-gray-400',
}

// ── Y-axis / tooltip formatter ─────────────────────────────────────────────────

function shortNum(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return Number(v.toFixed(2)).toString()
}

// ── Mini chart previews ────────────────────────────────────────────────────────

function MiniLineChart({ data, color, y1Label, y2Label, isComparison }) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-6">Not enough data to preview</p>
  const stroke1    = STROKE_COLOR[color]   ?? '#3b82f6'
  const stroke2    = STROKE_COLOR_2[color] ?? '#f59e0b'
  const tickProps  = { fontSize: 10, fill: CHART_TICK_COLOR }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
        <XAxis dataKey="x" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={tickProps} tickLine={false} axisLine={false} width={40} tickFormatter={shortNum} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={shortNum} />
        {isComparison ? (
          <>
            <Legend wrapperStyle={{ fontSize: 11, color: '#d1d5db' }} />
            <Line type="monotone" dataKey="y1" name={y1Label || 'Series 1'} stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="y2" name={y2Label || 'Series 2'} stroke={stroke2} strokeWidth={2} dot={false} strokeDasharray="4 2" activeDot={{ r: 3 }} />
          </>
        ) : (
          <Line type="monotone" dataKey="y" stroke={stroke1} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

function MiniBarChart({ data, color }) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-6">Not enough data to preview</p>
  const fill      = STROKE_COLOR[color] ?? '#3b82f6'
  const tickProps = { fontSize: 10, fill: CHART_TICK_COLOR }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="x" tick={tickProps} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={tickProps} tickLine={false} axisLine={false} width={40} tickFormatter={shortNum} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={shortNum} />
        <Bar dataKey="y" fill={fill} radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Filter section ─────────────────────────────────────────────────────────────

const MAX_FILTERS  = 5
const EMPTY_FILTER = { column: '', operator: 'equals', value: '' }

function useColumnValues(rows, column) {
  return useMemo(() => {
    if (!column) return []
    const vals = new Set()
    for (const row of rows) {
      const v = String(row.data?.[column] ?? '').trim()
      if (v) vals.add(v)
      if (vals.size > 300) return []
    }
    const arr = [...vals].sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
    const allNumeric = arr.every((v) => !isNaN(parseFloat(v)) && isFinite(v))
    return allNumeric && arr.length > 20 ? [] : arr
  }, [rows, column])
}

function FilterRow({ filter, index, headers, rows, onChange, onRemove }) {
  const uniqueValues = useColumnValues(rows, filter.column)
  const opDef        = FILTER_OPERATORS.find((o) => o.value === filter.operator)
  const needsValue   = opDef?.needsValue !== false
  const useDropdown  = uniqueValues.length > 0 && uniqueValues.length <= 200

  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-10 pt-2.5 shrink-0 text-right">
        {index === 0 ? 'WHERE' : 'AND'}
      </span>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select className="input text-sm" value={filter.column}
          onChange={(e) => onChange({ ...filter, column: e.target.value, value: '' })}>
          <option value="">Select column…</option>
          {headers.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select className="input text-sm" value={filter.operator}
          onChange={(e) => onChange({ ...filter, operator: e.target.value })} disabled={!filter.column}>
          {FILTER_OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
        {needsValue ? (
          useDropdown ? (
            <select className="input text-sm" value={filter.value}
              onChange={(e) => onChange({ ...filter, value: e.target.value })} disabled={!filter.column}>
              <option value="">Any value…</option>
              {uniqueValues.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input className="input text-sm" value={filter.value}
              onChange={(e) => onChange({ ...filter, value: e.target.value })}
              placeholder={filter.column ? 'Enter value…' : '—'} disabled={!filter.column} />
          )
        ) : (
          <div className="input text-sm text-gray-400 dark:text-gray-500 flex items-center">no value needed</div>
        )}
      </div>
      <button type="button" onClick={onRemove}
        className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0 mt-0.5" title="Remove filter">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function FiltersSection({ filters, headers, rows, onChange }) {
  const filtered    = useMemo(() => applyFilters(rows, filters), [rows, filters])
  const activeCount = filters.filter((f) =>
    f.column && (f.value !== '' || !FILTER_OPERATORS.find((o) => o.value === f.operator)?.needsValue)
  ).length

  return (
    <div className="space-y-3">
      {filters.map((f, i) => (
        <FilterRow key={i} filter={f} index={i} headers={headers} rows={rows}
          onChange={(updated) => { const next = [...filters]; next[i] = updated; onChange(next) }}
          onRemove={() => onChange(filters.filter((_, idx) => idx !== i))} />
      ))}
      <div className="flex items-center justify-between">
        {filters.length < MAX_FILTERS ? (
          <button type="button" onClick={() => onChange([...filters, { ...EMPTY_FILTER }])}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add filter
          </button>
        ) : (
          <span className="text-xs text-gray-400">Max {MAX_FILTERS} filters</span>
        )}
        {activeCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-brand-600">{filtered.length.toLocaleString()}</span>
            {' '}of {rows.length.toLocaleString()} rows match
          </span>
        )}
      </div>
    </div>
  )
}

// ── Computed columns ───────────────────────────────────────────────────────────

const MAX_COMPUTED  = 5
const EMPTY_COMPUTED = { name: '', expression: '' }

/**
 * Single computed column row.
 * Name input + expression input with clickable column-reference buttons.
 */
function ComputedColumnRow({ col, realHeaders, onChange, onRemove }) {
  const inputRef = useRef(null)

  /** Insert [Column Name] at the current cursor position in the expression input */
  function insertRef(colName) {
    const input = inputRef.current
    const token = `[${colName}]`
    if (!input) {
      onChange({ ...col, expression: col.expression + token })
      return
    }
    const s    = input.selectionStart ?? col.expression.length
    const e    = input.selectionEnd   ?? col.expression.length
    const next = col.expression.slice(0, s) + token + col.expression.slice(e)
    onChange({ ...col, expression: next })
    setTimeout(() => {
      input.focus()
      const p = s + token.length
      input.setSelectionRange(p, p)
    }, 0)
  }

  const refs    = getExpressionColumns(col.expression)
  const missing = refs.filter((r) => !realHeaders.includes(r))

  return (
    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700">
      <div className="flex items-end gap-2">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="label text-[11px]">Column name</label>
            <input
              className="input text-sm"
              value={col.name}
              onChange={(e) => onChange({ ...col, name: e.target.value })}
              placeholder="e.g. Gross Profit"
            />
          </div>
          <div>
            <label className="label text-[11px]">
              Expression{' '}
              <span className="font-normal text-gray-400">use [Column] syntax</span>
            </label>
            <input
              ref={inputRef}
              className="input text-sm font-mono"
              value={col.expression}
              onChange={(e) => onChange({ ...col, expression: e.target.value })}
              placeholder="e.g. [Revenue] - [Cost]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0"
          title="Remove computed column"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Column reference chips — click to insert into expression */}
      {realHeaders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {realHeaders.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => insertRef(h)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-mono leading-snug"
              title={`Insert [${h}]`}
            >
              [{h}]
            </button>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Unknown column{missing.length > 1 ? 's' : ''}: {missing.map((m) => `[${m}]`).join(', ')}
        </p>
      )}
    </div>
  )
}

function ComputedColumnsSection({ computedCols, realHeaders, onChange }) {
  return (
    <div className="space-y-3">
      {computedCols.map((col, i) => (
        <ComputedColumnRow
          key={i}
          col={col}
          realHeaders={realHeaders}
          onChange={(updated) => { const next = [...computedCols]; next[i] = updated; onChange(next) }}
          onRemove={() => onChange(computedCols.filter((_, idx) => idx !== i))}
        />
      ))}
      {computedCols.length < MAX_COMPUTED ? (
        <button
          type="button"
          onClick={() => onChange([...computedCols, { ...EMPTY_COMPUTED }])}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add computed column
        </button>
      ) : (
        <span className="text-xs text-gray-400">Max {MAX_COMPUTED} computed columns</span>
      )}
    </div>
  )
}

// ── Form state helpers ─────────────────────────────────────────────────────────

/**
 * Build initial WidgetForm state from an existing widget (edit mode)
 * or from dataset headers (create mode).
 */
function initFormState(initialWidget, headers) {
  if (initialWidget) {
    const f  = initialWidget.formula ?? {}
    const wt = f.widget_type ?? 'kpi'
    return {
      widgetType:  wt,
      name:        initialWidget.name ?? '',
      color:       initialWidget.color ?? 'blue',
      format:      initialWidget.format ?? 'number',
      // KPI
      aggregation: f.aggregation ?? 'sum',
      column:      f.column      ?? headers[0] ?? '',
      column2:     f.column2     ?? headers[1] ?? headers[0] ?? '',
      // Chart (shared x)
      xColumn:     f.x_column  ?? headers[0] ?? '',
      yColumn:     f.y_column  ?? headers[1] ?? headers[0] ?? '',
      yLabel:      f.y_label   ?? f.y_column ?? headers[1] ?? '',
      // Comparison
      y1Column:    f.y1_column ?? headers[0] ?? '',
      y2Column:    f.y2_column ?? headers[1] ?? headers[0] ?? '',
      y1Label:     f.y1_label  ?? 'Series 1',
      y2Label:     f.y2_label  ?? 'Series 2',
      // Chart aggregation (stored as formula.aggregation)
      chartAgg:      f.aggregation ?? 'sum',
      // Filters (persisted and editable)
      filters:          f.filters ?? [],
      _filtersOpen:     f.filters?.length > 0,
      // Computed columns
      computedColumns:  f.computed_columns ?? [],
      _computedOpen:    f.computed_columns?.length > 0,
    }
  }
  return {
    widgetType:       'kpi',
    name:             '',
    color:            'blue',
    format:           'number',
    aggregation:      'sum',
    column:           headers[0] ?? '',
    column2:          headers[1] ?? headers[0] ?? '',
    xColumn:          headers[0] ?? '',
    yColumn:          headers[1] ?? headers[0] ?? '',
    yLabel:           headers[1] ?? headers[0] ?? '',
    y1Column:         headers[0] ?? '',
    y2Column:         headers[1] ?? headers[0] ?? '',
    y1Label:          'Series 1',
    y2Label:          'Series 2',
    chartAgg:         'sum',
    filters:          [],
    _filtersOpen:     false,
    computedColumns:  [],
    _computedOpen:    false,
  }
}

// ── Widget form ────────────────────────────────────────────────────────────────

/**
 * @param {object|null} initialWidget  — null = create mode; widget object = edit mode
 */
function WidgetForm({ onSave, onCancel, headers, userId, sourceId, rows, nextOrder, initialWidget }) {
  const isEditing = !!initialWidget

  const [form, setForm]     = useState(() => initFormState(initialWidget, headers))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])

  // Convenience updater
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const { widgetType, name, color, format, aggregation, column, column2,
          xColumn, yColumn, yLabel, y1Column, y2Column, y1Label, y2Label,
          chartAgg, filters, computedColumns } = form

  const needsTwoCols = aggregation === 'ratio' || aggregation === 'percent'
  const needsOneCol  = aggregation !== 'count'

  /**
   * Headers visible in column selectors = real dataset headers + names of
   * valid computed columns defined in this widget (in definition order).
   */
  const allHeaders = useMemo(() => {
    const computedNames = computedColumns
      .filter((c) => c.name?.trim())
      .map((c) => c.name.trim())
    // Deduplicate — computed names shadow real columns of the same name
    const real = headers.filter((h) => !computedNames.includes(h))
    return [...real, ...computedNames]
  }, [headers, computedColumns])

  const formula = useMemo(() => {
    const computed = computedColumns.filter((c) => c.name?.trim() && c.expression?.trim())
    if (widgetType === 'kpi') {
      return {
        widget_type:      'kpi',
        aggregation,
        column:           needsOneCol  ? column  : null,
        column2:          needsTwoCols ? column2 : null,
        filters,
        computed_columns: computed,
      }
    }
    if (widgetType === 'comparison') {
      return {
        widget_type:      'comparison',
        x_column: xColumn, y1_column: y1Column, y2_column: y2Column,
        y1_label: y1Label, y2_label: y2Label,
        aggregation: chartAgg, filters,
        computed_columns: computed,
      }
    }
    return {
      widget_type:      widgetType,
      x_column: xColumn, y_column: yColumn,
      y_label: yLabel || yColumn,
      aggregation: chartAgg, filters,
      computed_columns: computed,
    }
  }, [widgetType, aggregation, column, column2, needsOneCol, needsTwoCols,
      xColumn, yColumn, yLabel, y1Column, y2Column, y1Label, y2Label,
      chartAgg, filters, computedColumns])

  const kpiPreview = useMemo(() => {
    if (widgetType !== 'kpi' || !rows.length) return null
    return formatKPI(computeKPI(rows, formula), format)
  }, [widgetType, rows, formula, format])

  const chartPreviewData = useMemo(() => {
    if (widgetType === 'kpi' || !rows.length) return []
    return getChartData(rows, formula).slice(0, 20)
  }, [widgetType, rows, formula])

  async function handleSave() {
    const validationErrors = validateWidget({ name, formula }, allHeaders)
    if (validationErrors.length) { setErrors(validationErrors); return }
    setSaving(true)
    setErrors([])
    try {
      const payload = {
        user_id: userId, source_id: sourceId,
        name: name.trim(), formula, format, color,
        ...(isEditing ? { id: initialWidget.id } : { sort_order: nextOrder }),
      }
      await onSave(payload)
    } catch (err) {
      setErrors([err.message])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-brand-200 dark:border-brand-700 shadow-sm p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        {isEditing ? `Edit widget — ${initialWidget.name}` : 'New widget'}
      </h3>

      {/* Widget type selector */}
      <div>
        <label className="label mb-2">Widget type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WIDGET_TYPES.map((wt) => (
            <button
              key={wt.value} type="button"
              onClick={() => { set('widgetType', wt.value); setErrors([]) }}
              className={[
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                widgetType === wt.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              <span className={widgetType === wt.value ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}>{wt.icon}</span>
              <span className="text-xs font-semibold leading-tight">{wt.label}</span>
              <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">{wt.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-gray-700" />

      {/* Name + colour */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => set('name', e.target.value)}
            placeholder={widgetType === 'kpi' ? 'e.g. Total Revenue' : 'e.g. Revenue vs Cost'} />
        </div>
        <div>
          <label className="label">Colour</label>
          <div className="flex gap-2 mt-1.5">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-6 h-6 rounded-full ${COLOR_DOT[c]} ring-offset-1 dark:ring-offset-gray-800 transition-all ${color === c ? 'ring-2 ring-gray-400 scale-110' : 'opacity-50 hover:opacity-100'}`}
                title={c} />
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI fields ── */}
      {widgetType === 'kpi' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Aggregation</label>
            <select className="input" value={aggregation} onChange={(e) => set('aggregation', e.target.value)}>
              {AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input" value={format} onChange={(e) => set('format', e.target.value)}>
              {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {needsOneCol && (
            <div>
              <label className="label">{needsTwoCols ? 'Numerator column' : 'Column'}</label>
              <select className="input" value={column} onChange={(e) => set('column', e.target.value)}>
                {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          {needsTwoCols && (
            <div>
              <label className="label">Denominator column</label>
              <select className="input" value={column2} onChange={(e) => set('column2', e.target.value)}>
                {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Line / Bar chart fields ── */}
      {(widgetType === 'line_chart' || widgetType === 'bar_chart') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">X-axis column</label>
            <select className="input" value={xColumn} onChange={(e) => set('xColumn', e.target.value)}>
              {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Y-axis column</label>
            <select className="input" value={yColumn}
              onChange={(e) => { set('yColumn', e.target.value); set('yLabel', e.target.value) }}>
              {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Y-axis label</label>
            <input className="input" value={yLabel} onChange={(e) => set('yLabel', e.target.value)}
              placeholder="e.g. Revenue ($)" />
          </div>
          <div>
            <label className="label">Aggregation</label>
            <select className="input" value={chartAgg} onChange={(e) => set('chartAgg', e.target.value)}>
              {AGGREGATIONS_CHART.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Comparison chart fields ── */}
      {widgetType === 'comparison' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">X-axis column <span className="text-gray-400 font-normal">(usually a date or category)</span></label>
            <select className="input" value={xColumn} onChange={(e) => set('xColumn', e.target.value)}>
              {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Series 1 column</label>
            <select className="input" value={y1Column} onChange={(e) => set('y1Column', e.target.value)}>
              {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Series 1 label</label>
            <input className="input" value={y1Label} onChange={(e) => set('y1Label', e.target.value)}
              placeholder="e.g. Revenue" />
          </div>
          <div>
            <label className="label">Series 2 column</label>
            <select className="input" value={y2Column} onChange={(e) => set('y2Column', e.target.value)}>
              {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Series 2 label</label>
            <input className="input" value={y2Label} onChange={(e) => set('y2Label', e.target.value)}
              placeholder="e.g. Cost" />
          </div>
          <div>
            <label className="label">Aggregation</label>
            <select className="input" value={chartAgg} onChange={(e) => set('chartAgg', e.target.value)}>
              {AGGREGATIONS_CHART.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Computed columns ── */}
      <div>
        <button
          type="button"
          onClick={() => set('_computedOpen', !form._computedOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${form._computedOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Computed columns
          {computedColumns.filter((c) => c.name?.trim()).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[10px] font-bold">
              {computedColumns.filter((c) => c.name?.trim()).length}
            </span>
          )}
          <span className="font-normal text-gray-400">e.g. [Revenue] - [Cost]</span>
        </button>
        {form._computedOpen && (
          <div className="mt-3 pl-5 border-l-2 border-gray-100 dark:border-gray-700">
            <ComputedColumnsSection
              computedCols={computedColumns}
              realHeaders={headers}
              onChange={(updated) => set('computedColumns', updated)}
            />
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div>
        <button
          type="button"
          onClick={() => set('_filtersOpen', !form._filtersOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${form._filtersOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Row filters
          {filters.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[10px] font-bold">
              {filters.filter(f => f.column).length}
            </span>
          )}
        </button>
        {form._filtersOpen && (
          <div className="mt-3 pl-5 border-l-2 border-gray-100 dark:border-gray-700">
            <FiltersSection
              filters={filters}
              headers={allHeaders}
              rows={enrichRows(rows, computedColumns.filter((c) => c.name?.trim() && c.expression?.trim()))}
              onChange={(updated) => set('filters', updated)}
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
        {widgetType === 'kpi' && kpiPreview !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 inline-block min-w-[160px] shadow-sm">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{name || 'Untitled'}</p>
            <p className="text-3xl font-bold mt-2 leading-none" style={{ color: STROKE_COLOR[color] }}>{kpiPreview}</p>
          </div>
        )}
        {widgetType === 'kpi' && kpiPreview === null && (
          <p className="text-xs text-gray-400">Select a column to see a preview.</p>
        )}
        {widgetType === 'line_chart' && <MiniLineChart data={chartPreviewData} color={color} />}
        {widgetType === 'bar_chart'  && <MiniBarChart  data={chartPreviewData} color={color} />}
        {widgetType === 'comparison' && (
          <MiniLineChart data={chartPreviewData} color={color}
            y1Label={y1Label} y2Label={y2Label} isComparison />
        )}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 space-y-0.5">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 px-4">
          {saving ? (isEditing ? 'Saving…' : 'Saving…') : (isEditing ? 'Save changes' : 'Save widget')}
        </button>
      </div>
    </div>
  )
}

// ── Widget row ─────────────────────────────────────────────────────────────────

function WidgetRow({ widget, onDelete, onEdit, index }) {
  const [deleting, setDeleting] = useState(false)
  const wt    = widget.formula?.widget_type ?? 'kpi'
  const wtDef = WIDGET_TYPES.find((w) => w.value === wt)

  async function handleDelete() {
    if (!confirm('Delete this widget?')) return
    setDeleting(true)
    try { await onDelete(widget.id) } finally { setDeleting(false) }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-l-4 border-gray-100 dark:border-gray-700 ${COLOR_BORDER[widget.color] ?? 'border-l-blue-500'} p-4 flex items-center gap-3`}>
      <span className="text-xs text-gray-400 w-5 text-center shrink-0">{index + 1}</span>
      <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-400">
        {wtDef?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{widget.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {wtDef?.label}
          {wt === 'kpi'        && widget.formula?.column    && ` · ${widget.formula.column}`}
          {wt === 'comparison' && ` · ${widget.formula?.y1_column ?? ''} vs ${widget.formula?.y2_column ?? ''}`}
          {(wt === 'line_chart' || wt === 'bar_chart') && widget.formula?.x_column
            && ` · ${widget.formula.x_column} × ${widget.formula.y_column}`}
          {wt === 'kpi' && ` · ${widget.format}`}
        </p>
      </div>
      <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR_DOT[widget.color] ?? 'bg-blue-500'}`} />

      {/* Edit */}
      <button onClick={() => onEdit(widget)}
        className="p-1.5 rounded text-gray-300 dark:text-gray-600 hover:text-brand-500 transition-colors" title="Edit widget">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting}
        className="p-1.5 rounded text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" title="Delete widget">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function KPIBuilderPage() {
  const { sourceId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { kpis, loading, error: kpiError, saveKPI, deleteKPI } = useKPIs(sourceId)

  const [source, setSource]         = useState(null)
  const [rows, setRows]             = useState([])
  const [loadError, setLoadError]   = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editingWidget, setEditing] = useState(null) // null = create, widget = edit

  useEffect(() => {
    if (!sourceId) return
    loadSource(sourceId).then(setSource).catch((err) => setLoadError(err.message))
    loadRows(sourceId).then(setRows).catch(() => {})
  }, [sourceId])

  function openCreate() { setEditing(null); setShowForm(true) }
  function openEdit(widget) { setEditing(widget); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }

  async function handleSave(widget) {
    await saveKPI(widget)
    closeForm()
  }

  const headers = source?.headers ?? []
  const atLimit = kpis.length >= MAX_KPIS

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[180px]">
              {source?.name ?? 'Widget Builder'}
            </span>
          </div>
          <button onClick={() => navigate(`/source/${sourceId}`)} className="btn-primary text-xs py-1.5 px-3">
            View Dashboard →
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {(loadError || kpiError) && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {loadError || kpiError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Widget Builder</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {kpis.length}/{MAX_KPIS} widgets defined
              {source && ` · ${source.row_count.toLocaleString()} rows`}
            </p>
          </div>
          {!showForm && !atLimit && (
            <button onClick={openCreate} className="btn-primary">+ Add widget</button>
          )}
          {atLimit && !showForm && (
            <span className="text-xs text-gray-400">Maximum {MAX_KPIS} widgets</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {kpis.map((kpi, i) => (
              <WidgetRow key={kpi.id} widget={kpi} onDelete={deleteKPI} onEdit={openEdit} index={i} />
            ))}
          </div>
        )}

        {showForm && (
          <WidgetForm
            key={editingWidget?.id ?? 'new'}
            onSave={handleSave}
            onCancel={closeForm}
            headers={headers}
            userId={user?.id}
            sourceId={sourceId}
            rows={rows}
            nextOrder={kpis.length}
            initialWidget={editingWidget}
          />
        )}

        {kpis.length === 0 && !loading && !showForm && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No widgets yet.</p>
            <button onClick={openCreate} className="btn-primary mt-4">Add your first widget</button>
          </div>
        )}
      </main>
    </div>
  )
}
