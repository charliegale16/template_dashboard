import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useConfig } from './hooks/useConfig'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'

function LandingRedirect({ hasConfig }) {
  const navigate = useNavigate()
  React.useEffect(() => {
    navigate(hasConfig ? '/dashboard' : '/setup', { replace: true })
  }, [hasConfig, navigate])
  return null
}

export default function App() {
  const { config, saveConfig, clearConfig, hasConfig } = useConfig()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRedirect hasConfig={hasConfig} />} />
        <Route
          path="/setup"
          element={<SetupPage config={config} saveConfig={saveConfig} />}
        />
        <Route
          path="/dashboard"
          element={
            <DashboardPage config={config} saveConfig={saveConfig} hasConfig={hasConfig} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
