/**
 * KPI computation utilities for ecommerce dashboards.
 *
 * All functions accept the standard { headers, rows } data shape and a
 * mappings object with ecommerce role keys (revenue, quantity, customerId, cost…).
 *
 * Period-over-period comparison splits rows in half by their dataset order
 * (assumes chronological sort, typical for Sheets exports).
 */

/** Sum of the revenue column. */
export function computeRevenue(data, mappings) {
  return sumColumn(data, mappings?.revenue)
}

/** Number of data rows (= order count). */
export function computeOrderCount(data) {
  return data?.rows?.length ?? 0
}

/** Average order value = revenue / order count. */
export function computeAOV(data, mappings) {
  const count = computeOrderCount(data)
  if (!count) return 0
  return computeRevenue(data, mappings) / count
}

/** Sum of the quantity column. */
export function computeUnits(data, mappings) {
  return sumColumn(data, mappings?.quantity)
}

/** Count of distinct values in the customerId column. */
export function computeCustomers(data, mappings) {
  const col = data?.headers?.indexOf(mappings?.customerId)
  if (!data?.rows?.length || col === undefined || col === -1) return 0
  return new Set(data.rows.map((r) => String(r[col] ?? '').trim()).filter(Boolean)).size
}

/**
 * Gross margin % = (revenue - cost) / revenue × 100.
 * Returns 0 when revenue is 0 or cost column is unmapped.
 */
export function computeMargin(data, mappings) {
  const totalRevenue = sumColumn(data, mappings?.revenue)
  const totalCost    = sumColumn(data, mappings?.cost)
  if (!totalRevenue) return 0
  return ((totalRevenue - totalCost) / totalRevenue) * 100
}

/** Most frequently occurring value in the category column. */
export function computeTopProduct(data, mappings) {
  const col = data?.headers?.indexOf(mappings?.category)
  if (!data?.rows?.length || col === -1) return '—'
  const freq = {}
  data.rows.forEach((row) => {
    const v = String(row[col] ?? '').trim()
    if (v) freq[v] = (freq[v] || 0) + 1
  })
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
  return top?.[0] ?? '—'
}

/**
 * Period-over-period % change for any metric function.
 * Splits rows into two equal halves and computes (current - prior) / |prior| × 100.
 * Returns null when prior is 0 or data is too sparse.
 */
export function computeChange(data, metricFn, mappings) {
  if (!data?.rows?.length || data.rows.length < 2) return null
  const half        = Math.floor(data.rows.length / 2)
  const priorData   = { headers: data.headers, rows: data.rows.slice(0, half) }
  const currentData = { headers: data.headers, rows: data.rows.slice(half) }
  const prior   = metricFn(priorData, mappings)
  const current = metricFn(currentData, mappings)
  if (!prior) return null
  return ((current - prior) / Math.abs(prior)) * 100
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function sumColumn(data, columnName) {
  const col = data?.headers?.indexOf(columnName)
  if (!data?.rows?.length || col === undefined || col === -1) return 0
  return data.rows.reduce((acc, row) => {
    const v = parseFloat(row[col])
    return acc + (isNaN(v) ? 0 : v)
  }, 0)
}

/** Formats a number compactly: 1234567 → "1.2M", 12345 → "12.3K". */
export function formatMetric(n, prefix = '', suffix = '') {
  if (n === null || n === undefined) return '—'
  let formatted
  if (Math.abs(n) >= 1_000_000) formatted = `${(n / 1_000_000).toFixed(1)}M`
  else if (Math.abs(n) >= 1_000) formatted = `${(n / 1_000).toFixed(1)}K`
  else formatted = Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)
  return `${prefix}${formatted}${suffix}`
}
