import { useState, useCallback } from 'react'

const STORAGE_KEY = 'dashboard_config'

/**
 * Default config shape — all fields the wizard can populate.
 * Extend mappings and widgets as new data roles or widget types are added.
 */
export const DEFAULT_CONFIG = {
  dashboardName: '',
  source: 'sheets',        // 'sheets' | 'excel'
  sheetId: '',             // Google Sheet document ID
  sheetName: '',           // Primary tab (= sheetTabs[0])
  sheetTabs: [],           // All selected tab names (ordered; first = primary)
  // tabMappings holds column-role assignments per tab, e.g.:
  //   { Orders: { date: 'Date', primaryMetric: 'Revenue', category: 'Category' },
  //     Marketing: { date: 'Week', primaryMetric: 'Sessions' } }
  tabMappings: {},
  widgets: [],             // widget ids selected in Step 4
  dateRange: {
    start: '',
    end: '',
  },
}

/**
 * Loads and persists the dashboard config in localStorage.
 *
 * TODO (Phase 2 — backend storage): replace the localStorage read/write calls
 * below with API calls to a backend config endpoint, e.g.:
 *   GET  /api/configs/:clientId  → loadConfig()
 *   POST /api/configs/:clientId  → saveConfig()
 * The hook's return shape should remain identical so consumers don't change.
 */
export function useConfig() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { ...DEFAULT_CONFIG }
      const parsed = JSON.parse(stored)
      // Migrate old flat-mappings configs: if tabMappings is absent but
      // mappings + sheetName exist, promote them into tabMappings.
      if (parsed.mappings && parsed.sheetName && !parsed.tabMappings?.[parsed.sheetName]) {
        parsed.tabMappings = {
          ...(parsed.tabMappings || {}),
          [parsed.sheetName]: parsed.mappings,
        }
      }
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  })

  const saveConfig = useCallback((updates) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage may be unavailable in some environments
      }
      return next
    })
  }, [])

  const clearConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig({ ...DEFAULT_CONFIG })
  }, [])

  const hasConfig = Boolean(
    config.sheetId &&
    Object.values(config.tabMappings || {}).some((m) => m?.primaryMetric)
  )

  return { config, saveConfig, clearConfig, hasConfig }
}
