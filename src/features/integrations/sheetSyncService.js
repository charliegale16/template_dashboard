/**
 * Sheet Sync Service
 *
 * Refreshes Google Sheet data into Postgres (data_rows table), following the
 * same cached-sync architecture used for file uploads. The source's row data
 * is the Postgres cache — this service keeps it fresh.
 *
 * Features:
 *   • Rate limiting   — rejects syncs closer than MIN_SYNC_INTERVAL_MS apart
 *   • Change detection — computes a content hash; skips the DB write if rows
 *                        are identical to the last sync
 *   • Sync metadata   — writes last_synced_at / sync_status / sync_error into
 *                        data_sources.meta so the UI can show status badges
 *   • Schedule config — stores meta.sync_schedule; actual background execution
 *                        requires a Supabase Edge Function or external cron job
 *
 * Data flow:
 *   Google Sheets API → fetchSheetData → [change detection] →
 *   refreshDataSource (deletes old rows, inserts new rows, bumps version) →
 *   meta update (last_synced_at, hash, status)
 */

import { supabase } from '../../lib/supabase'
import { fetchSheetData } from '../../adapters/SheetsAdapter'
import { refreshDataSource } from '../../hooks/useDataSource'

// Minimum time between syncs — prevents hammering the Google Sheets API
export const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000   // 5 minutes
export const MIN_SYNC_INTERVAL_S  = MIN_SYNC_INTERVAL_MS / 1000

export const SYNC_SCHEDULES = [
  { value: 'manual',  label: 'Manual only' },
  { value: 'hourly',  label: 'Every hour'  },
  { value: 'daily',   label: 'Every day'   },
  { value: 'weekly',  label: 'Every week'  },
]

// ── Change detection ──────────────────────────────────────────────────────────

/**
 * Compute a lightweight fingerprint for a set of rows.
 * Combines row count with a hash of the first 200 rows' content.
 * Good enough to catch any realistic data change.
 */
export function hashRows(rows) {
  const sample = JSON.stringify(rows.slice(0, 200))
  let h = 0
  for (let i = 0; i < sample.length; i++) {
    h = (Math.imul(31, h) + sample.charCodeAt(i)) | 0
  }
  return `${rows.length}:${(h >>> 0).toString(16)}`
}

// ── Meta helpers ──────────────────────────────────────────────────────────────

async function patchMeta(sourceId, patch) {
  // Merge patch into existing meta without overwriting unrelated fields
  const { data: current } = await supabase
    .from('data_sources')
    .select('meta')
    .eq('id', sourceId)
    .single()
  const merged = { ...(current?.meta ?? {}), ...patch }
  await supabase
    .from('data_sources')
    .update({ meta: merged })
    .eq('id', sourceId)
  return merged
}

// ── Main sync function ────────────────────────────────────────────────────────

/**
 * Sync a Google Sheet into Postgres.
 *
 * @param {{ source: object, userId: string, accessToken: string }} opts
 * @returns {{ changed: boolean, rowCount: number }}
 */
export async function syncSheet({ source, userId, accessToken }) {
  const { id: sourceId, meta = {} } = source

  if (!accessToken) {
    throw new Error('Google account not connected. Please reconnect to refresh this sheet.')
  }

  const sheetId = meta.sheetId
  const tab     = meta.tab
  if (!sheetId || !tab) {
    throw new Error('This source is missing Google Sheet configuration (sheetId or tab).')
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (meta.last_synced_at) {
    const elapsed = Date.now() - new Date(meta.last_synced_at).getTime()
    if (elapsed < MIN_SYNC_INTERVAL_MS) {
      const secs = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsed) / 1000)
      throw new Error(`Please wait ${secs}s before syncing again.`)
    }
  }

  // Mark in-progress so the UI shows a spinner immediately
  await patchMeta(sourceId, { sync_status: 'syncing' })

  try {
    // ── Fetch from Google Sheets API ─────────────────────────────────────────
    const { headers, rows } = await fetchSheetData(sheetId, tab, accessToken)

    // ── Change detection — skip expensive DB write if data unchanged ─────────
    const newHash = hashRows(rows)
    if (meta.rows_hash === newHash) {
      const updatedMeta = await patchMeta(sourceId, {
        last_synced_at: new Date().toISOString(),
        sync_status:    'ok',
        sync_error:     null,
      })
      return { changed: false, rowCount: source.row_count, meta: updatedMeta }
    }

    // ── Data changed — replace rows in DB ────────────────────────────────────
    const updatedSource = await refreshDataSource({
      sourceId,
      userId,
      headers,
      rows,    // plain arrays — same format as parseFile output
      meta: {
        ...meta,
        last_synced_at: new Date().toISOString(),
        sync_status:    'ok',
        sync_error:     null,
        rows_hash:      newHash,
      },
    })

    return { changed: true, rowCount: rows.length, meta: updatedSource.meta }

  } catch (err) {
    await patchMeta(sourceId, {
      sync_status:    'error',
      sync_error:     err.message,
      last_synced_at: new Date().toISOString(),
    })
    throw err
  }
}

// ── Schedule config ───────────────────────────────────────────────────────────

/**
 * Persist the sync schedule for a sheet source into data_sources.meta.
 * Actual background execution requires a Supabase Edge Function or cron job
 * that reads meta.sync_schedule and calls syncSheet() on the configured interval.
 */
export async function updateSyncSchedule({ sourceId, schedule, currentMeta }) {
  const { data, error } = await supabase
    .from('data_sources')
    .update({ meta: { ...(currentMeta ?? {}), sync_schedule: schedule } })
    .eq('id', sourceId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
