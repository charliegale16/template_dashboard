/**
 * localStorage cache for Google Sheets data.
 *
 * Each entry is stored as:
 *   { data: { headers, rows }, cachedAt: <unix ms> }
 *
 * Entries older than TTL_MS are treated as missing and pruned on read.
 * The Refresh button in DashboardRenderer passes force=true to bypass the
 * cache entirely and write a fresh entry.
 */

const PREFIX      = 'sheet_cache_'
const TABS_PREFIX = 'sheet_tabs_'
export const TTL_MS      = 5  * 60 * 1000  // 5 min  — row data
export const TABS_TTL_MS = 10 * 60 * 1000  // 10 min — tab list (structure changes rarely)

function key(sheetId, tabName) {
  return `${PREFIX}${sheetId}_${tabName}`
}

/** Returns { data, cachedAt } if a fresh entry exists, otherwise null. */
export function getCached(sheetId, tabName) {
  try {
    const raw = localStorage.getItem(key(sheetId, tabName))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(key(sheetId, tabName))
      return null
    }
    return entry
  } catch {
    return null
  }
}

/** Writes { data, cachedAt } and returns the timestamp. */
export function setCached(sheetId, tabName, data) {
  try {
    const entry = { data, cachedAt: Date.now() }
    localStorage.setItem(key(sheetId, tabName), JSON.stringify(entry))
    return entry.cachedAt
  } catch {
    // localStorage may be full — fail silently, data is still returned live
    return Date.now()
  }
}

/** Removes a specific entry so the next fetch is forced live. */
export function invalidateCache(sheetId, tabName) {
  localStorage.removeItem(key(sheetId, tabName))
}

/** Removes all cached sheet entries (e.g. on logout or config change). */
export function invalidateAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX) || k.startsWith(TABS_PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}

/** Returns cached tab names for a sheet, or null if stale/missing. */
export function getCachedTabs(sheetId) {
  try {
    const raw = localStorage.getItem(TABS_PREFIX + sheetId)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > TABS_TTL_MS) {
      localStorage.removeItem(TABS_PREFIX + sheetId)
      return null
    }
    return entry.tabs
  } catch {
    return null
  }
}

/** Persists tab names for a sheet. */
export function setCachedTabs(sheetId, tabs) {
  try {
    localStorage.setItem(TABS_PREFIX + sheetId, JSON.stringify({ tabs, cachedAt: Date.now() }))
  } catch {
    // fail silently
  }
}

/** Human-readable age string: "just now", "2 min ago", "1 hr ago". */
export function formatAge(cachedAt) {
  if (!cachedAt) return null
  const secs = Math.floor((Date.now() - cachedAt) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)} hr ago`
}
