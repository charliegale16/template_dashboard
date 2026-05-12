/**
 * useSheetSync
 *
 * React hook for triggering and tracking a Google Sheet → Postgres sync.
 *
 * Usage:
 *   const { sync, syncing, lastResult, error, updateSchedule } =
 *     useSheetSync(source, userId, accessToken, onSyncComplete)
 *
 * `onSyncComplete(updatedSource)` is called after a successful sync so the
 * parent can refresh its local source state (updated row_count, meta, etc.).
 */

import { useState, useCallback } from 'react'
import { syncSheet, updateSyncSchedule } from '../features/integrations/sheetSyncService'

export function useSheetSync(source, userId, accessToken, onSyncComplete) {
  const [syncing, setSyncing]       = useState(false)
  const [lastResult, setLastResult] = useState(null)   // { changed, rowCount }
  const [error, setError]           = useState(null)

  const sync = useCallback(async () => {
    if (!source || !userId) return
    setSyncing(true)
    setError(null)
    setLastResult(null)
    try {
      const result = await syncSheet({ source, userId, accessToken })
      setLastResult(result)
      onSyncComplete?.({ ...source, meta: result.meta, row_count: result.rowCount })
      return result
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [source, userId, accessToken, onSyncComplete])

  const updateSchedule = useCallback(async (schedule) => {
    if (!source) return
    const updated = await updateSyncSchedule({
      sourceId:    source.id,
      schedule,
      currentMeta: source.meta,
    })
    onSyncComplete?.(updated)
    return updated
  }, [source, onSyncComplete])

  return { sync, syncing, lastResult, error, updateSchedule }
}
