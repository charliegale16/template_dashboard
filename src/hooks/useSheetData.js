import { useState, useEffect, useCallback } from 'react'
import { fetchSheet } from '../adapters/SheetsAdapter'
// Phase 2: import { fetchExcel } from '../adapters/ExcelAdapter'

/**
 * Fetches and caches data for the active config.
 * Applies an optional date range filter against the mapped date column.
 *
 * @param {object} config  - Dashboard config from useConfig
 * @returns {{ data, filteredData, loading, error, refetch }}
 */
export function useSheetData(config) {
  const [data, setData] = useState({ headers: [], rows: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!config.sheetId || !config.apiKey) return
    setLoading(true)
    setError(null)
    try {
      // Phase 2: swap adapter based on config.source
      // const adapter = config.source === 'excel' ? fetchExcel : fetchSheet
      const result = await fetchSheet({
        sheetId: config.sheetId,
        apiKey: config.apiKey,
        sheetName: config.sheetName,
      })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config.sheetId, config.apiKey, config.sheetName, config.source])

  useEffect(() => {
    fetch()
  }, [fetch])

  const filteredData = applyDateFilter(data, config)

  return { data, filteredData, loading, error, refetch: fetch }
}

/**
 * Filters rows by the configured date range.
 * Rows with unparseable dates are kept to avoid silent data loss.
 */
function applyDateFilter(data, config) {
  const { start, end } = config.dateRange || {}
  if (!start && !end) return data

  const dateColIndex = data.headers.indexOf(config.mappings?.date)
  if (dateColIndex === -1) return data

  const startMs = start ? new Date(start).getTime() : -Infinity
  const endMs = end ? new Date(end).getTime() : Infinity

  const rows = data.rows.filter((row) => {
    const d = new Date(row[dateColIndex])
    if (isNaN(d.getTime())) return true
    return d.getTime() >= startMs && d.getTime() <= endMs
  })

  return { headers: data.headers, rows }
}
