import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardRenderer from '../components/Dashboard/DashboardRenderer'

export default function DashboardPage({ config, saveConfig, hasConfig, auth }) {
  const navigate = useNavigate()

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-5">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session expired</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your Google session has expired. Reconnect to continue viewing your dashboard.
          </p>
          <button className="btn-primary" onClick={() => navigate('/setup')}>
            Reconnect →
          </button>
        </div>
      </div>
    )
  }

  if (!hasConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 mb-5">
            <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No dashboard configured</h2>
          <p className="text-gray-500 text-sm mb-6">
            Run the setup wizard to connect your data source and choose your widgets.
          </p>
          <button className="btn-primary" onClick={() => navigate('/setup')}>
            Start Setup →
          </button>
        </div>
      </div>
    )
  }

  return <DashboardRenderer config={config} saveConfig={saveConfig} auth={auth} />
}
