import React, { useEffect } from 'react'
import { useShopifyConfig } from '../hooks/useShopifyConfig'
import ShopifyOnboarding from '../themes/shopify/ShopifyOnboarding'
import ShopifyDashboard from '../themes/shopify/ShopifyDashboard'

export default function ShopifyPage({ auth }) {
  const { config, saveConfig, clearConfig } = useShopifyConfig()

  // Auto-complete onboarding once mappings come in
  function handleOnboardingComplete({ sheetId, sheetName, mappings }) {
    saveConfig({
      sheetId,
      sheetName,
      mappings,
      costInputs: { cogs: 0, fees: 0, misc: 0 },
      configured: true,
    })
  }

  if (!config.configured) {
    return (
      <ShopifyOnboarding
        auth={auth}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  return (
    <ShopifyDashboard
      config={config}
      saveConfig={saveConfig}
      auth={auth}
      onResetConfig={clearConfig}
    />
  )
}
