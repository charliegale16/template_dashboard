import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useConfig } from './hooks/useConfig'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'

function LandingRedirect({ hasConfig }) {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (loading) return
    if (!session) navigate('/login', { replace: true })
    else navigate(hasConfig ? '/dashboard' : '/setup', { replace: true })
  }, [session, loading, hasConfig, navigate])

  return null
}

function AppRoutes() {
  const { config, saveConfig, clearConfig, hasConfig } = useConfig()

  return (
    <Routes>
      <Route path="/" element={<LandingRedirect hasConfig={hasConfig} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <SetupPage config={config} saveConfig={saveConfig} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage config={config} saveConfig={saveConfig} hasConfig={hasConfig} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
