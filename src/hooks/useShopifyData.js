import { useState, useEffect, useCallback } from 'react'
import { fetchSheetData } from '../adapters/SheetsAdapter'
import { getCached, setCached } from '../utils/sheetCache'
import { normalizeRows } from '../themes/shopify/utils/normalize'

export function useShopifyData(config, accessToken, onAuthError) {
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [cachedAt, setCachedAt] = useState(null)

  const fetch = useCallback(async (force = false) => {
    if (!config?.sheetId || !config?.sheetName || !accessToken) return

    if (!force) {
      const hit = getCached(config.sheetId, config.sheetName)
      if (hit) {
        setRows(normalizeRows(hit.data.headers, hit.data.rows, config.mappings))
        setCachedAt(hit.cachedAt)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const raw = await fetchSheetData(config.sheetId, config.sheetName, accessToken)
      const ts  = setCached(config.sheetId, config.sheetName, raw)
      setRows(normalizeRows(raw.headers, raw.rows, config.mappings))
      setCachedAt(ts)
    } catch (err) {
      if (err.status === 401) { onAuthError?.(); return }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config?.sheetId, config?.sheetName, config?.mappings, accessToken, onAuthError])

  useEffect(() => {
    setRows(null)
    fetch(false)
  }, [fetch])

  return { rows, loading, error, cachedAt, refetch: fetch }
}
