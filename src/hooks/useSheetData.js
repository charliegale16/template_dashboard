import { useState, useEffect, useCallback } from 'react'
import { fetchSheetData } from '../adapters/SheetsAdapter'
// Phase 2: import { fetchSheetData as fetchExcelData } from '../adapters/ExcelAdapter'

/**
 * Fetches data for the active config tab and applies the date range filter.
 *
 * @param {object}   config       - Dashboard config from useConfig
 * @param {string}   accessToken  - OAuth 2.0 Bearer token from useAuth
 * @param {Function} onAuthError  - Called when a 401 is returned; should logout + redirect
 * @returns {{ data, filteredData, loading, error, refetch }}
 */
export function useSheetData(config, accessToken, onAuthError) {
  const [data, setData] = useState({ headers: [], rows: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!config.sheetId || !config.sheetName || !accessToken) return
    setLoading(true)
    setError(null)
    try {
      // Phase 2: swap adapter based on config.source
      // const fn = config.source === 'excel' ? fetchExcelData : fetchSheetData
      const result = await fetchSheetData(config.sheetId, config.sheetName, accessToken)
      setData(result)
    } catch (err) {
      if (err.status === 401) {
        onAuthError?.()
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config.sheetId, config.sheetName, config.source, accessToken, onAuthError])

  useEffect(() => {
    refetch()
  }, [refetch])

  const filteredData = applyDateFilter(data, config)

  return { data, filteredData, loading, error, refetch }
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
