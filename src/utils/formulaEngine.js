/**
 * Formula engine — handles both KPI aggregations and chart data generation.
 *
 * formula.widget_type:
 *   'kpi'         — single aggregated value (default / backwards-compat)
 *   'line_chart'  — single series line chart
 *   'bar_chart'   — single series bar chart grouped by category
 *   'comparison'  — two-series line chart (y1 vs y2)
 *
 * Rows from Supabase: { data: { [colName]: value } }[]
 */

// ── Filter engine ─────────────────────────────────────────────────────────────

/**
 * Filter operators applied per-row before aggregation.
 * filter shape: { column, operator, value }
 */
export const FILTER_OPERATORS = [
  { value: 'equals',         label: '= equals',        needsValue: true  },
  { value: 'not_equals',     label: '≠ not equals',    needsValue: true  },
  { value: 'contains',       label: '∋ contains',      needsValue: true  },
  { value: 'not_contains',   label: '∌ not contains',  needsValue: true  },
  { value: 'starts_with',    label: '⌖ starts with',   needsValue: true  },
  { value: 'greater_than',   label: '> greater than',  needsValue: true  },
  { value: 'less_than',      label: '< less than',     needsValue: true  },
  { value: 'gte',            label: '≥ at least',      needsValue: true  },
  { value: 'lte',            label: '≤ at most',       needsValue: true  },
  { value: 'is_empty',       label: '∅ is empty',      needsValue: false },
  { value: 'is_not_empty',   label: '✓ is not empty',  needsValue: false },
]

function matchesFilter(row, { column, operator, value }) {
  const raw  = row.data?.[column]
  const cell = String(raw ?? '').trim()
  const cLow = cell.toLowerCase()
  const vLow = String(value ?? '').trim().toLowerCase()
  const numC = parseFloat(cell)
  const numV = parseFloat(value ?? '')

  switch (operator) {
    case 'equals':       return cLow === vLow
    case 'not_equals':   return cLow !== vLow
    case 'contains':     return cLow.includes(vLow)
    case 'not_contains': return !cLow.includes(vLow)
    case 'starts_with':  return cLow.startsWith(vLow)
    case 'greater_than': return !isNaN(numC) && !isNaN(numV) && numC > numV
    case 'less_than':    return !isNaN(numC) && !isNaN(numV) && numC < numV
    case 'gte':          return !isNaN(numC) && !isNaN(numV) && numC >= numV
    case 'lte':          return !isNaN(numC) && !isNaN(numV) && numC <= numV
    case 'is_empty':     return cell === '' || raw == null
    case 'is_not_empty': return cell !== '' && raw != null
    default:             return true
  }
}

/**
 * Apply an array of AND-combined filters to a row set.
 * Exported so UI components can preview counts live.
 */
export function applyFilters(rows, filters) {
  if (!filters?.length) return rows
  const active = filters.filter(
    (f) => f.column && (f.value !== '' || !FILTER_OPERATORS.find((o) => o.value === f.operator)?.needsValue)
  )
  if (!active.length) return rows
  return rows.filter((r) => active.every((f) => matchesFilter(r, f)))
}

// ── Expression evaluator ──────────────────────────────────────────────────────

/**
 * Safely evaluate a simple arithmetic expression referencing dataset columns.
 *
 * Syntax:
 *   - Column references: [Column Name]   (e.g. [Revenue], [Cost of Goods])
 *   - Numeric literals:  1234, 3.14
 *   - Operators:         +  -  *  /
 *   - Parentheses:       (  )
 *   - Unary minus:       -[Col]
 *
 * Examples:
 *   "[Revenue] - [Cost]"
 *   "([Sales] / [Target]) * 100"
 *   "[Qty] * [Unit Price]"
 *
 * @param {string}               expr     — the expression string
 * @param {Record<string, any>}  rowData  — row.data object from Supabase
 * @returns {number}
 */
export function evaluateExpression(expr, rowData) {
  if (!expr?.trim()) return 0

  let pos = 0
  const str = expr.trim()

  function skipWS() {
    while (pos < str.length && /\s/.test(str[pos])) pos++
  }
  function peek()    { return str[pos] }
  function consume() { return str[pos++] }

  function parseExpr()    { return parseAddSub() }

  function parseAddSub() {
    let left = parseMulDiv()
    skipWS()
    while (pos < str.length && (peek() === '+' || peek() === '-')) {
      const op = consume()
      const right = parseMulDiv()
      left = op === '+' ? left + right : left - right
      skipWS()
    }
    return left
  }

  function parseMulDiv() {
    let left = parseUnary()
    skipWS()
    while (pos < str.length && (peek() === '*' || peek() === '/')) {
      const op = consume()
      const right = parseUnary()
      if (op === '*') left = left * right
      else left = right !== 0 ? left / right : 0
      skipWS()
    }
    return left
  }

  function parseUnary() {
    skipWS()
    if (pos < str.length && peek() === '-') { consume(); return -parsePrimary() }
    if (pos < str.length && peek() === '+') { consume(); return  parsePrimary() }
    return parsePrimary()
  }

  function parsePrimary() {
    skipWS()
    if (pos >= str.length) return 0

    // Column reference: [Column Name]
    if (peek() === '[') {
      consume() // [
      let name = ''
      while (pos < str.length && peek() !== ']') name += consume()
      if (pos < str.length) consume() // ]
      const raw = rowData?.[name]
      return parseFloat(String(raw ?? '').replace(/[$£€,%\s]/g, '')) || 0
    }

    // Parenthesised sub-expression
    if (peek() === '(') {
      consume()
      const val = parseExpr()
      skipWS()
      if (pos < str.length && peek() === ')') consume()
      return val
    }

    // Numeric literal (including negative handled by parseUnary)
    let numStr = ''
    while (pos < str.length && /[\d.]/.test(str[pos])) numStr += consume()
    if (numStr) return parseFloat(numStr) || 0

    // Unknown character — skip
    consume()
    return 0
  }

  try { return parseExpr() } catch { return 0 }
}

/**
 * Extract all [Column Name] references from an expression string.
 * Useful for validation (check referenced columns exist).
 */
export function getExpressionColumns(expr) {
  const refs = []
  const re = /\[([^\]]+)\]/g
  let m
  while ((m = re.exec(expr ?? '')) !== null) refs.push(m[1])
  return refs
}

/**
 * Enrich a single row's .data with values computed from user-defined expressions.
 *
 * @param {object}  row           — { data: {...} }
 * @param {Array}   computedCols  — [{ name, expression }]
 * @returns {object}              — new row object (original unchanged)
 */
export function applyComputedColumns(row, computedCols) {
  if (!computedCols?.length) return row
  const enrichedData = { ...row.data }
  for (const col of computedCols) {
    if (col.name?.trim() && col.expression?.trim()) {
      // Evaluate in order so later computed cols can reference earlier ones
      enrichedData[col.name.trim()] = evaluateExpression(col.expression, enrichedData)
    }
  }
  return { ...row, data: enrichedData }
}

/**
 * Apply computed columns to every row in a dataset.
 */
export function enrichRows(rows, computedCols) {
  if (!computedCols?.length) return rows
  return rows.map((r) => applyComputedColumns(r, computedCols))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function toNum(val) {
  return parseFloat(String(val ?? '').replace(/[$£€,%\s,]/g, '')) || 0
}

function colNums(rows, col) {
  return rows.map((r) => toNum(r.data?.[col]))
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

function aggGroup(groupRows, col, aggregation) {
  if (!col) return 0
  const nums = groupRows.map((r) => toNum(r.data?.[col]))
  switch (aggregation) {
    case 'avg':            return nums.length ? sum(nums) / nums.length : 0
    case 'min':            return Math.min(...nums)
    case 'max':            return Math.max(...nums)
    case 'count':          return groupRows.length
    case 'count_distinct': return new Set(groupRows.map((r) => String(r.data?.[col] ?? ''))).size
    default:               return sum(nums) // sum
  }
}

// ── KPI computation ───────────────────────────────────────────────────────────

export function computeKPI(rows, formula) {
  const enriched = enrichRows(rows, formula.computed_columns)
  const r = applyFilters(enriched, formula.filters)
  if (!r.length) return 0
  const { aggregation, column, column2 } = formula

  switch (aggregation) {
    case 'sum':            return sum(colNums(r, column))
    case 'avg':            return sum(colNums(r, column)) / r.length
    case 'count':          return r.length
    case 'count_distinct': return new Set(r.map((row) => String(row.data?.[column] ?? ''))).size
    case 'min':            return Math.min(...colNums(r, column))
    case 'max':            return Math.max(...colNums(r, column))
    case 'ratio': {
      const den = sum(colNums(r, column2))
      return den !== 0 ? sum(colNums(r, column)) / den : 0
    }
    case 'percent': {
      const den = sum(colNums(r, column2))
      return den !== 0 ? (sum(colNums(r, column)) / den) * 100 : 0
    }
    default: return 0
  }
}

export function formatKPI(value, format) {
  if (!isFinite(value)) return '—'
  switch (format) {
    case 'currency':
      if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
      if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
      if (Math.abs(value) >= 1_000)     return `${(value / 1_000).toFixed(1)}K`
      return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  }
}

// ── Chart data ────────────────────────────────────────────────────────────────

/**
 * Build grouped / aggregated data suitable for Recharts.
 *
 * Returns an array of objects sorted chronologically (date x-axis) or
 * alphabetically (category x-axis).
 *
 * For 'comparison' widget_type, each point has { x, y1, y2 }.
 * For 'line_chart' / 'bar_chart', each point has { x, y }.
 */
export function getChartData(rows, formula) {
  const {
    widget_type,
    x_column,
    y_column,
    y1_column,
    y2_column,
    aggregation = 'sum',
  } = formula

  const enriched = enrichRows(rows, formula.computed_columns)
  const filteredRows = applyFilters(enriched, formula.filters)
  if (!x_column || !filteredRows.length) return []

  // Group rows by x value
  const grouped = new Map()
  for (const row of filteredRows) {
    const xVal = String(row.data?.[x_column] ?? '').trim()
    if (!xVal || xVal === 'undefined' || xVal === 'null') continue
    if (!grouped.has(xVal)) grouped.set(xVal, [])
    grouped.get(xVal).push(row)
  }

  const data = []
  for (const [x, groupRows] of grouped) {
    const entry = { x }
    if (widget_type === 'comparison') {
      entry.y1 = aggGroup(groupRows, y1_column, aggregation)
      entry.y2 = aggGroup(groupRows, y2_column, aggregation)
    } else {
      entry.y = aggGroup(groupRows, y_column, aggregation)
    }
    data.push(entry)
  }

  // Sort: date-parse first, then alphabetical
  return data.sort((a, b) => {
    const da = new Date(a.x)
    const db = new Date(b.x)
    if (!isNaN(da) && !isNaN(db)) return da - db
    return String(a.x).localeCompare(String(b.x))
  })
}

// ── Colour map ────────────────────────────────────────────────────────────────

export const STROKE_COLOR = {
  blue:    '#3b82f6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  purple:  '#8b5cf6',
  gray:    '#9ca3af',
}

// Second series colour for comparison charts (complementary)
export const STROKE_COLOR_2 = {
  blue:    '#f59e0b',
  emerald: '#8b5cf6',
  amber:   '#3b82f6',
  red:     '#10b981',
  purple:  '#f59e0b',
  gray:    '#ef4444',
}
