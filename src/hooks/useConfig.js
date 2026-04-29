import { useState, useCallback } from 'react'

const STORAGE_KEY = 'dashboard_config'

export const DEFAULT_CONFIG = {
  dashboardName: '',
  source: 'sheets',
  sheetId: '',
  sheetName: '',
  sheetTabs: [],
  // tabMappings: { [tabName]: { date, revenue, quantity, orderId, customerId, product, category, region, status, channel, cost, discount, secondaryMetric } }
  tabMappings: {},
  widgets: [],
  dateRange: {
    preset: 'all_time',
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
      let dirty = false  // track whether any migration ran so we can re-persist

      // Migrate old flat-mappings configs: promote mappings + sheetName into tabMappings
      if (parsed.mappings && parsed.sheetName && !parsed.tabMappings?.[parsed.sheetName]) {
        parsed.tabMappings = { ...(parsed.tabMappings || {}), [parsed.sheetName]: parsed.mappings }
        dirty = true
      }

      // Migrate string-array widgets → object instances
      if (parsed.widgets?.length && typeof parsed.widgets[0] === 'string') {
        const defaultSizes = {
          kpi_total: 'sm', kpi_revenue: 'sm', kpi_orders: 'sm', kpi_aov: 'sm',
          kpi_units: 'sm', kpi_customers: 'sm', kpi_margin: 'sm',
          revenue_over_time: 'md', top_categories: 'md', data_table: 'full',
        }
        parsed.widgets = parsed.widgets.map((type) => ({
          id: crypto.randomUUID(),
          type: type === 'kpi_total' ? 'kpi_revenue' : type,
          size: defaultSizes[type] ?? 'md',
        }))
        dirty = true
      }

      // Migrate widget object instances: kpi_total → kpi_revenue
      if (parsed.widgets?.some?.((w) => w?.type === 'kpi_total')) {
        parsed.widgets = parsed.widgets.map((w) =>
          w.type === 'kpi_total' ? { ...w, type: 'kpi_revenue' } : w
        )
        dirty = true
      }

      // Migrate primaryMetric → revenue in tabMappings
      if (parsed.tabMappings) {
        Object.values(parsed.tabMappings).forEach((m) => {
          if (m?.primaryMetric && !m?.revenue) {
            m.revenue = m.primaryMetric
            delete m.primaryMetric
            dirty = true
          }
        })
      }

      // Migrate primaryMetric → revenue in per-widget config overrides
      parsed.widgets?.forEach?.((w) => {
        if (w?.config?.primaryMetric && !w.config?.revenue) {
          w.config.revenue = w.config.primaryMetric
          delete w.config.primaryMetric
          dirty = true
        }
      })

      const next = { ...DEFAULT_CONFIG, ...parsed }

      // Persist any migrations immediately so they survive the next reload
      if (dirty) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      }

      return next
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  })

  const saveConfig = useCallback((updates) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch { /* localStorage unavailable */ }
      return next
    })
  }, [])

  const clearConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig({ ...DEFAULT_CONFIG })
  }, [])

  // A tab is "configured" when at least one role has been mapped (not necessarily revenue)
  const hasConfig = Boolean(
    config.sheetId &&
    Object.values(config.tabMappings || {}).some((m) => m && Object.values(m).some(Boolean))
  )

  return { config, saveConfig, clearConfig, hasConfig }
}
