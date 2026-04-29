import { useState, useEffect, useCallback } from 'react'
import { fetchSheetData } from '../adapters/SheetsAdapter'
import { getCached, setCached, TTL_MS } from '../utils/sheetCache'
// Phase 2: import { fetchSheetData as fetchExcelData } from '../adapters/ExcelAdapter'

/**
 * Fetches sheet data with a localStorage cache (TTL = 5 minutes).
 *
 * On mount the hook hydrates immediately from cache if a fresh entry exists —
 * zero API calls, zero quota cost.  A stale or missing entry triggers a live
 * fetch.  Calling refetch(true) bypasses the cache and always goes live.
 *
 * @param {object}   config       - Dashboard config from useConfig
 * @param {string}   accessToken  - OAuth 2.0 Bearer token from useAuth
 * @param {Function} onAuthError  - Called on 401; should logout + redirect
 * @returns {{ data, filteredData, loading, error, cachedAt, refetch }}
 */
export function useSheetData(config, accessToken, onAuthError) {
  const cachedEntry = getCached(config.sheetId, config.sheetName)

  const [data, setData] = useState(cachedEntry?.data ?? { headers: [], rows: [] })
  const [cachedAt, setCachedAt] = useState(cachedEntry?.cachedAt ?? null)
  const [loading, setLoading] = useState(!cachedEntry)
  const [error, setError] = useState(null)

  const refetch = useCallback(async (force = false) => {
    if (!config.sheetId || !config.sheetName || !accessToken) return

    if (!force) {
      const entry = getCached(config.sheetId, config.sheetName)
      if (entry) {
        setData(entry.data)
        setCachedAt(entry.cachedAt)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      // Phase 2: swap adapter based on config.source
      // const fn = config.source === 'excel' ? fetchExcelData : fetchSheetData
      const result = await fetchSheetData(config.sheetId, config.sheetName, accessToken)
      setData(result)
      const ts = setCached(config.sheetId, config.sheetName, result)
      setCachedAt(ts)
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
    refetch(false)
  }, [refetch])

  const filteredData = applyDateFilter(data, config)

  return { data, filteredData, loading, error, cachedAt, refetch }
}

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
