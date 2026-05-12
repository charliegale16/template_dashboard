import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSheetData } from '../../hooks/useSheetData'
import { makeWidget } from '../../widgets/registry'
import WidgetGrid from './WidgetGrid'
import AddWidgetPanel from './AddWidgetPanel'
import DashboardSidebar from './DashboardSidebar'

export default function DashboardRenderer({ config, saveConfig, auth }) {
  const navigate = useNavigate()
  const [reauthNeeded, setReauthNeeded] = useState(false)

  function handleAuthError() {
    setReauthNeeded(true)
  }

  const { filteredTabDataMap, loading, error, cachedAt, refetch } = useSheetData(
    config,
    auth.accessToken,
    handleAuthError,
  )

  // Detect a genuine new token (successful re-login) by comparing to the previous value.
  // We cannot use isAuthenticated here — the expired token string keeps it true.
  const prevTokenRef = useRef(auth.accessToken)
  useEffect(() => {
    const prev = prevTokenRef.current
    prevTokenRef.current = auth.accessToken
    if (reauthNeeded && auth.accessToken && auth.accessToken !== prev) {
      setReauthNeeded(false)
      refetch(true)
    }
  }, [auth.accessToken, reauthNeeded, refetch])

  const [editMode, setEditMode] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tabs that have at least one column mapped
  const configuredTabs = useMemo(() => {
    return (config.sheetTabs || (config.sheetName ? [config.sheetName] : [])).filter((tab) => {
      const m = config.tabMappings?.[tab]
      return m && Object.values(m).some(Boolean)
    })
  }, [config.sheetTabs, config.sheetName, config.tabMappings])

  const [activeDashboardTab, setActiveDashboardTab] = useState(() => configuredTabs[0] ?? null)

  // Keep active tab valid when tabs change
  useEffect(() => {
    if (configuredTabs.length && !configuredTabs.includes(activeDashboardTab)) {
      setActiveDashboardTab(configuredTabs[0])
    }
  }, [configuredTabs, activeDashboardTab])

  // Tick every 30s so "X min ago" stays accurate
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── Widget mutation helpers ───────────────────────────────────────────────

  const handleAddWidget = useCallback((type) => {
    const widget = makeWidget(type)
    saveConfig({ widgets: [...(config.widgets || []), widget] })
  }, [config.widgets, saveConfig])

  const handleUpdateWidget = useCallback((id, updates) => {
    saveConfig({
      widgets: (config.widgets || []).map((w) => w.id === id ? { ...w, ...updates } : w),
    })
  }, [config.widgets, saveConfig])

  const handleRemoveWidget = useCallback((id) => {
    saveConfig({ widgets: (config.widgets || []).filter((w) => w.id !== id) })
  }, [config.widgets, saveConfig])

  const handleMoveWidget = useCallback((id, dir) => {
    const widgets = [...(config.widgets || [])]
    const idx = widgets.findIndex((w) => w.id === id)
    if (idx === -1) return
    const next = idx + dir
    if (next < 0 || next >= widgets.length) return
    ;[widgets[idx], widgets[next]] = [widgets[next], widgets[idx]]
    saveConfig({ widgets })
  }, [config.widgets, saveConfig])

  function handleReauth() {
    auth.login()
  }

  const activeTabData = filteredTabDataMap[activeDashboardTab] ?? { headers: [], rows: [] }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dashboardName={config.dashboardName}
        tabs={configuredTabs}
        activeTab={activeDashboardTab}
        onTabChange={(tab) => setActiveDashboardTab(tab)}
        config={config}
        saveConfig={saveConfig}
        loading={loading}
        cachedAt={cachedAt}
        onRefresh={() => refetch(true)}
        editMode={editMode}
        onToggleEditMode={() => { setEditMode((v) => !v); setShowAddPanel(false) }}
        onAddWidget={() => setShowAddPanel(true)}
        onSettings={() => navigate('/setup')}
        onHome={() => navigate('/')}
      />

      {/* Main area — offset on large screens */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* Top header */}
        <header className={[
          'bg-white border-b sticky top-0 z-10 transition-colors',
          editMode ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200',
        ].join(' ')}>
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
            {/* Left: hamburger (mobile) + active tab name */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="font-semibold text-gray-900 text-sm truncate">
                {activeDashboardTab || config.dashboardName || 'Dashboard'}
              </h1>
              {editMode && (
                <span className="text-xs font-medium text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full shrink-0">
                  Editing
                </span>
              )}
            </div>

            {/* Right: row count */}
            {!loading && activeDashboardTab && (
              <span className="text-xs text-gray-400 shrink-0">
                {activeTabData.rows.length} row{activeTabData.rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </header>

        {/* Edit mode hint bar */}
        {editMode && (
          <div className="bg-brand-50 border-b border-brand-100 px-4 py-2">
            <p className="text-xs text-brand-700 text-center">
              Hover a widget to resize, reorder, or remove it. Click <strong>Add widget</strong> in the sidebar to add new ones.
            </p>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={refetch} className="text-red-600 hover:underline text-xs ml-4">
                Retry
              </button>
            </div>
          )}

          {loading && !activeTabData.rows.length ? (
            <LoadingSkeleton />
          ) : (
            <WidgetGrid
              widgets={config.widgets}
              tabData={activeTabData}
              activeTab={activeDashboardTab}
              config={config}
              editMode={editMode}
              onUpdate={handleUpdateWidget}
              onRemove={handleRemoveWidget}
              onMove={handleMoveWidget}
              onAdd={() => setShowAddPanel(true)}
            />
          )}
        </main>
      </div>

      <AddWidgetPanel
        open={showAddPanel}
        config={config}
        onAdd={handleAddWidget}
        onClose={() => setShowAddPanel(false)}
      />

      {/* Session-expired reauth modal */}
      {reauthNeeded && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Session expired</h2>
                <p className="text-xs text-gray-500 mt-0.5">Sign in again to keep your dashboard live.</p>
              </div>
            </div>
            <button
              onClick={handleReauth}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => { setReauthNeeded(false); navigate('/setup') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              Go to settings instead
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`card animate-pulse bg-gray-100 h-32 ${i > 1 ? 'col-span-2' : ''}`}
        />
      ))}
    </div>
  )
}
