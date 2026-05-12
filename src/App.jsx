import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage    from './pages/LoginPage'
import HomePage     from './pages/HomePage'
import UploadPage   from './pages/UploadPage'
import KPIBuilderPage from './pages/KPIBuilderPage'
import DashboardPage  from './pages/DashboardPage'
import ProfilePage    from './pages/ProfilePage'
import ReportPage     from './pages/ReportPage'
import ReuploadPage   from './pages/ReuploadPage'

// ── Auth guard ────────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  )

  if (!isAuthenticated) {
    // Preserve destination so we can return after login
    sessionStorage.setItem('auth_return', location.pathname + location.search)
    return <Navigate to="/login" replace />
  }

  return children
}

// ── OAuth return handler ──────────────────────────────────────────────────────

/**
 * After Google OAuth the browser lands on '/'.
 * Check for a stored return path (set either by RequireAuth or by the pre-OAuth
 * save in LoginPage) and redirect there.
 */
function OAuthReturnHandler({ children }) {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (loading || !isAuthenticated) return
    const returnPath = sessionStorage.getItem('oauth_return') || sessionStorage.getItem('auth_return')
    if (returnPath && returnPath !== '/login') {
      sessionStorage.removeItem('oauth_return')
      sessionStorage.removeItem('auth_return')
      navigate(returnPath, { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  return children
}

// ── 404 ───────────────────────────────────────────────────────────────────────

function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-black text-gray-200 dark:text-gray-700 mb-4">404</p>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Page not found</p>
        <p className="text-sm text-gray-400 mb-6">The route you requested doesn't exist.</p>
        <button onClick={() => navigate('/', { replace: true })} className="btn-primary">
          Back to home
        </button>
      </div>
    </div>
  )
}

// ── Routes ────────────────────────────────────────────────────────────────────

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
        {/* Public */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

        {/* Protected */}
        <Route path="/"                              element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/upload"                        element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/profile"                       element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/source/:sourceId"              element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/source/:sourceId/kpis"         element={<RequireAuth><KPIBuilderPage /></RequireAuth>} />
        <Route path="/source/:sourceId/report"       element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/source/:sourceId/report/:reportId" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/source/:sourceId/update"       element={<RequireAuth><ReuploadPage /></RequireAuth>} />

        {/* Shared report view (public — ReportPage handles unauthenticated read) */}
        <Route path="/report/:reportId"              element={<ReportPage viewOnly />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
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
