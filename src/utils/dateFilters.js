/**
 * Date-range preset utilities.
 *
 * config.dateRange stores either a named preset or a custom start/end pair:
 *   { preset: 'last_30_days' }
 *   { preset: 'custom', start: '2024-01-01', end: '2024-03-31' }
 *
 * resolveDateRange() converts any form into { startMs, endMs } (unix ms)
 * ready to compare against row timestamps.
 */

export const DATE_PRESETS = [
  { id: 'all_time',     label: 'All time' },
  { id: 'last_7_days',  label: 'Last 7 days' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_90_days', label: 'Last 90 days' },
  { id: 'this_year',    label: 'This year' },
  { id: 'custom',       label: 'Custom range' },
]

/**
 * Returns { startMs, endMs } from a dateRange config value.
 * Either bound may be null (= no limit on that side).
 */
export function resolveDateRange(dateRange) {
  const preset = dateRange?.preset || 'all_time'

  if (preset === 'custom') {
    return {
      startMs: dateRange?.start ? new Date(dateRange.start).getTime() : null,
      endMs:   dateRange?.end   ? new Date(dateRange.end).getTime()   : null,
    }
  }

  const now  = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd   = todayStart + 86_400_000 - 1 // end of today

  switch (preset) {
    case 'last_7_days':
      return { startMs: todayStart - 6 * 86_400_000, endMs: todayEnd }
    case 'last_30_days':
      return { startMs: todayStart - 29 * 86_400_000, endMs: todayEnd }
    case 'last_90_days':
      return { startMs: todayStart - 89 * 86_400_000, endMs: todayEnd }
    case 'this_year':
      return { startMs: new Date(now.getFullYear(), 0, 1).getTime(), endMs: todayEnd }
    case 'all_time':
    default:
      return { startMs: null, endMs: null }
  }
}

/**
 * Filters a rows array using a pre-resolved { startMs, endMs } range and the
 * index of the date column.  Rows with unparseable dates are kept.
 */
export function filterRowsByDate(rows, dateColIndex, startMs, endMs) {
  if (dateColIndex === -1 || (startMs === null && endMs === null)) return rows
  return rows.filter((row) => {
    const d = new Date(row[dateColIndex])
    if (isNaN(d.getTime())) return true
    const t = d.getTime()
    if (startMs !== null && t < startMs) return false
    if (endMs   !== null && t > endMs)   return false
    return true
  })
}

/** Human-friendly label for the active date range (used in the top bar). */
export function describeDateRange(dateRange) {
  const preset = DATE_PRESETS.find((p) => p.id === (dateRange?.preset || 'all_time'))
  if (preset?.id !== 'custom') return preset?.label ?? 'All time'
  const { start, end } = dateRange || {}
  if (start && end) return `${start} → ${end}`
  if (start) return `From ${start}`
  if (end)   return `Until ${end}`
  return 'Custom range'
}
