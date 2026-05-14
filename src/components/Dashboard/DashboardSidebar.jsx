import React from 'react'
import { DATE_PRESETS } from '../../utils/dateFilters'
import { formatAge } from '../../utils/sheetCache'

export default function DashboardSidebar({
  open,
  onClose,
  dashboardName,
  tabs,
  activeTab,
  onTabChange,
  config,
  saveConfig,
  loading,
  cachedAt,
  onRefresh,
  editMode,
  onToggleEditMode,
  onAddWidget,
  onSettings,
  onHome,
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-20 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-60',
          'bg-white dark:bg-[#0f172a]',
          'border-r border-gray-100 dark:border-slate-700/50',
          'z-30 flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo / name */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-slate-700/50 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
            {dashboardName || 'Dashboard'}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Tab navigation */}
          <nav className="px-3 py-3">
            <p className="section-label">Views</p>
            {tabs.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 px-2 py-1">No tabs configured.</p>
            ) : (
              tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { onTabChange(tab); onClose() }}
                  className={[
                    'nav-item',
                    activeTab === tab ? 'nav-item-active' : 'nav-item-inactive',
                  ].join(' ')}
                >
                  <span className={[
                    'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                    activeTab === tab
                      ? 'bg-brand-500'
                      : 'bg-gray-300 dark:bg-slate-600',
                  ].join(' ')} />
                  <span className="truncate">{tab}</span>
                </button>
              ))
            )}
          </nav>

          <div className="divider" />

          {/* Date range */}
          <div className="px-4 py-3 space-y-2">
            <p className="section-label">Date range</p>
            <select
              className="input text-xs py-1.5"
              value={config.dateRange?.preset || 'all_time'}
              onChange={(e) => {
                const preset = e.target.value
                saveConfig({ dateRange: { preset, start: config.dateRange?.start || '', end: config.dateRange?.end || '' } })
              }}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {config.dateRange?.preset === 'custom' && (
              <div className="space-y-1.5">
                <input
                  type="date"
                  className="input text-xs py-1"
                  value={config.dateRange?.start || ''}
                  onChange={(e) => saveConfig({ dateRange: { ...config.dateRange, start: e.target.value } })}
                />
                <input
                  type="date"
                  className="input text-xs py-1"
                  value={config.dateRange?.end || ''}
                  onChange={(e) => saveConfig({ dateRange: { ...config.dateRange, end: e.target.value } })}
                />
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Refresh */}
          <div className="px-4 py-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="nav-item nav-item-inactive w-full disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 shrink-0 transition-transform ${loading ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="truncate text-sm">
                {loading ? 'Refreshing…' : cachedAt ? `Updated ${formatAge(cachedAt)}` : 'Refresh data'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 dark:border-slate-700/50 px-3 py-3 space-y-0.5 shrink-0">
          {editMode && (
            <button
              onClick={onAddWidget}
              className="nav-item text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/25"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add widget
            </button>
          )}

          <button
            onClick={onToggleEditMode}
            className={[
              'nav-item transition-all duration-150',
              editMode
                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                : 'nav-item-inactive',
            ].join(' ')}
          >
            {editMode ? (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Done editing
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Edit layout
              </>
            )}
          </button>

          <button onClick={onSettings} className="nav-item nav-item-inactive">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>

          <button onClick={onHome} className="nav-item nav-item-inactive">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
        </div>
      </aside>
    </>
  )
}
