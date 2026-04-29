import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSheetData } from '../../hooks/useSheetData'
import { formatAge } from '../../utils/sheetCache'
import { DATE_PRESETS, describeDateRange } from '../../utils/dateFilters'
import { makeWidget } from '../../widgets/registry'
import WidgetGrid from './WidgetGrid'
import AddWidgetPanel from './AddWidgetPanel'

export default function DashboardRenderer({ config, saveConfig, auth }) {
  const navigate = useNavigate()

  function handleAuthError() {
    auth.logout()
    navigate('/setup')
  }

  const { filteredTabDataMap, loading, error, cachedAt, refetch } = useSheetData(config, auth.accessToken, handleAuthError)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Tick every 30s so the "X min ago" label stays accurate
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

  const title = config.dashboardName || 'Analytics Dashboard'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className={[
        'bg-white border-b sticky top-0 z-10 transition-colors',
        editMode ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200',
      ].join(' ')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="font-semibold text-gray-900 text-sm">{title}</h1>
            {editMode && (
              <span className="text-xs font-medium text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                Editing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!editMode && (
              <>
                <button
                  className="btn-secondary text-xs px-3 py-1.5"
                  onClick={() => setShowDateFilter((v) => !v)}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{describeDateRange(config.dateRange)}</span>
                  <span className="sm:hidden">Dates</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {cachedAt && !loading && (
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {formatAge(cachedAt)}
                    </span>
                  )}
                  <button
                    className="btn-secondary text-xs px-3 py-1.5"
                    onClick={() => refetch(true)}
                    disabled={loading}
                    title="Force-fetch fresh data from Google Sheets"
                  >
                    <svg className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </>
            )}

            {editMode && (
              <button
                className="btn-secondary text-xs px-3 py-1.5"
                onClick={() => setShowAddPanel(true)}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add widget
              </button>
            )}

            <button
              className={editMode ? 'btn-primary text-xs px-3 py-1.5' : 'btn-secondary text-xs px-3 py-1.5'}
              onClick={() => { setEditMode((v) => !v); setShowAddPanel(false) }}
            >
              {editMode ? (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Done
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Edit layout
                </>
              )}
            </button>

            {!editMode && (
              <button
                className="btn-primary text-xs px-3 py-1.5"
                onClick={() => navigate('/setup')}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Date filter panel */}
      {showDateFilter && !editMode && (
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-600 shrink-0">Date range:</span>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.filter((p) => p.id !== 'custom').map((p) => {
                const active = (config.dateRange?.preset || 'all_time') === p.id
                return (
                  <button
                    key={p.id}
                    className={[
                      'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                      active
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400',
                    ].join(' ')}
                    onClick={() => saveConfig({ dateRange: { preset: p.id, start: '', end: '' } })}
                  >
                    {p.label}
                  </button>
                )
              })}
              <button
                className={[
                  'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                  config.dateRange?.preset === 'custom'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400',
                ].join(' ')}
                onClick={() => saveConfig({ dateRange: { preset: 'custom', start: config.dateRange?.start || '', end: config.dateRange?.end || '' } })}
              >
                Custom
              </button>
            </div>
            {config.dateRange?.preset === 'custom' && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  className="input text-xs py-1 w-36"
                  value={config.dateRange?.start || ''}
                  onChange={(e) => saveConfig({ dateRange: { ...config.dateRange, start: e.target.value } })}
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  className="input text-xs py-1 w-36"
                  value={config.dateRange?.end || ''}
                  onChange={(e) => saveConfig({ dateRange: { ...config.dateRange, end: e.target.value } })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit mode hint bar */}
      {editMode && (
        <div className="bg-brand-50 border-b border-brand-100 px-4 py-2">
          <p className="max-w-7xl mx-auto text-xs text-brand-700 text-center">
            Hover a widget to resize (S/M/L/Full), reorder, or remove it. Click <strong>+ Add widget</strong> to add new ones.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={refetch} className="text-red-600 hover:underline text-xs ml-4">
              Retry
            </button>
          </div>
        )}

        {loading && !Object.keys(filteredTabDataMap).length ? (
          <LoadingSkeleton />
        ) : (
          <WidgetGrid
            widgets={config.widgets}
            filteredTabDataMap={filteredTabDataMap}
            config={config}
            editMode={editMode}
            onUpdate={handleUpdateWidget}
            onRemove={handleRemoveWidget}
            onMove={handleMoveWidget}
            onAdd={() => setShowAddPanel(true)}
          />
        )}
      </main>

      <AddWidgetPanel
        open={showAddPanel}
        config={config}
        onAdd={handleAddWidget}
        onClose={() => setShowAddPanel(false)}
      />
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
