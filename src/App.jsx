import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useConfig } from './hooks/useConfig'
import { useAuth } from './hooks/useAuth'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">{this.state.error.message}</p>
            <button
              className="btn-primary"
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
            >
              Reload dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}
