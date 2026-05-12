import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import KPIBuilderPage from './pages/KPIBuilderPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import ReportPage from './pages/ReportPage'
import ReuploadPage from './pages/ReuploadPage'

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  )
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

/** After Google OAuth the browser lands on '/'. Check if we stored a return path. */
function OAuthReturnHandler({ children }) {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (loading || !isAuthenticated) return
    const returnPath = sessionStorage.getItem('oauth_return')
    if (returnPath) {
      sessionStorage.removeItem('oauth_return')
      navigate(returnPath, { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  return children
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <OAuthReturnHandler>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/source/:sourceId/kpis" element={<RequireAuth><KPIBuilderPage /></RequireAuth>} />
        <Route path="/source/:sourceId" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/source/:sourceId/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/source/:sourceId/update" element={<RequireAuth><ReuploadPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </OAuthReturnHandler>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
