import { useState, useCallback } from 'react'

const STORAGE_KEY = 'shopify_dashboard_config'

const DEFAULT_CONFIG = {
  sheetId:    null,
  sheetName:  null,
  mappings:   {},
  costInputs: { cogs: 0, fees: 0, misc: 0 },
  configured: false,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export function useShopifyConfig() {
  const [config, setConfigState] = useState(load)

  const saveConfig = useCallback((updates) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clearConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setConfigState(DEFAULT_CONFIG)
  }, [])

  return { config, saveConfig, clearConfig }
}
