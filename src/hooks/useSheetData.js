import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchSheetData } from '../adapters/SheetsAdapter'
import { getCached, setCached } from '../utils/sheetCache'
import { resolveDateRange, filterRowsByDate } from '../utils/dateFilters'
// Phase 2: import { fetchSheetData as fetchExcelData } from '../adapters/ExcelAdapter'

/**
 * Fetches data for every selected tab in parallel with a localStorage cache.
 *
 * Returns filteredTabDataMap — a map of tabName → { headers, rows } with the
 * date-range filter applied using each tab's own column mappings.
 *
 * refetch(force=false) — omitting force (or passing false) serves from cache
 * when all tabs are fresh.  refetch(true) always goes live and refreshes cache.
 */
export function useSheetData(config, accessToken, onAuthError) {
  const tabs = useMemo(
    () => config.sheetTabs?.length ? config.sheetTabs : config.sheetName ? [config.sheetName] : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.sheetTabs?.join(','), config.sheetName]
  )

  // Hydrate from cache synchronously so widgets render immediately
  const [tabDataMap, setTabDataMap] = useState(() => {
    const map = {}
    tabs.forEach((tab) => {
      const entry = getCached(config.sheetId, tab)
      if (entry) map[tab] = entry.data
    })
    return map
  })

  const [cachedAt, setCachedAt] = useState(() => {
    const ats = tabs.map((tab) => getCached(config.sheetId, tab)?.cachedAt).filter(Boolean)
    return ats.length ? Math.min(...ats) : null
  })

  const [loading, setLoading] = useState(() => tabs.some((tab) => !getCached(config.sheetId, tab)))
  const [error, setError] = useState(null)

  const refetch = useCallback(async (force = false) => {
    if (!config.sheetId || !tabs.length || !accessToken) return

    if (!force) {
      const allCached = tabs.every((tab) => getCached(config.sheetId, tab))
      if (allCached) {
        const map = {}
        const ats = []
        tabs.forEach((tab) => {
          const entry = getCached(config.sheetId, tab)
          map[tab] = entry.data
          ats.push(entry.cachedAt)
        })
        setTabDataMap(map)
        setCachedAt(Math.min(...ats))
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        tabs.map(async (tab) => {
          // Re-use cache for individual tabs that are still fresh during a partial force-refresh
          if (!force) {
            const entry = getCached(config.sheetId, tab)
            if (entry) return { tab, data: entry.data, ts: entry.cachedAt }
          }
          // Phase 2: const fn = config.source === 'excel' ? fetchExcelData : fetchSheetData
          const data = await fetchSheetData(config.sheetId, tab, accessToken)
          const ts = setCached(config.sheetId, tab, data)
          return { tab, data, ts }
        })
      )
      const map = {}
      const ats = []
      results.forEach(({ tab, data, ts }) => { map[tab] = data; ats.push(ts) })
      setTabDataMap(map)
      setCachedAt(Math.min(...ats))
    } catch (err) {
      if (err.status === 401) { onAuthError?.(); return }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config.sheetId, tabs, config.source, accessToken, onAuthError])

  useEffect(() => { refetch(false) }, [refetch])

  // Apply per-tab date filter using each tab's own column mappings
  const filteredTabDataMap = useMemo(() => {
    const out = {}
    const { startMs, endMs } = resolveDateRange(config.dateRange)
    Object.entries(tabDataMap).forEach(([tab, data]) => {
      const mappings = config.tabMappings?.[tab] || {}
      const dateColIndex = data.headers.indexOf(mappings.date || '')
      out[tab] = {
        headers: data.headers,
        rows: filterRowsByDate(data.rows, dateColIndex, startMs, endMs),
      }
    })
    return out
  }, [tabDataMap, config.tabMappings, config.dateRange])

  return { tabDataMap, filteredTabDataMap, loading, error, cachedAt, refetch }
}
