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

const PREFIX = 'sheet_cache_'
export const TTL_MS = 5 * 60 * 1000 // 5 minutes

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
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
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
