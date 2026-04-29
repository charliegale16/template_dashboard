import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useConfig } from './hooks/useConfig'
import { useAuth } from './hooks/useAuth'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'

function LandingRedirect({ hasConfig, isAuthenticated }) {
  const navigate = useNavigate()
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/setup', { replace: true })
    } else {
      navigate(hasConfig ? '/dashboard' : '/setup', { replace: true })
    }
  }, [hasConfig, isAuthenticated, navigate])
  return null
}

function AppRoutes() {
  const { config, saveConfig, clearConfig, hasConfig } = useConfig()
  const auth = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingRedirect hasConfig={hasConfig} isAuthenticated={auth.isAuthenticated} />}
      />
      <Route
        path="/setup"
        element={<SetupPage config={config} saveConfig={saveConfig} auth={auth} />}
      />
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            config={config}
            saveConfig={saveConfig}
            hasConfig={hasConfig}
            auth={auth}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
