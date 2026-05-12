import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataSources, duplicateSource } from '../hooks/useDataSource'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './ProfilePage'

// ── Relative time helper ──────────────────────────────────────────────────────
function timeAgo(isoString) {
  if (!isoString) return null
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function SourceCard({ source, onDelete, onDuplicate }) {
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)

  const version    = source.meta?.version ?? 1
  const updatedAt  = source.meta?.updated_at
  const updatedStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const isSheet      = source.type === 'sheet'
  const isTemplate   = Boolean(source.meta?.template_from)
  const syncStatus   = source.meta?.sync_status
  const lastSynced   = source.meta?.last_synced_at
  const iconCls = isSheet
    ? 'bg-emerald-100 dark:bg-emerald-900/40'
    : source.type === 'excel'
    ? 'bg-emerald-100 dark:bg-emerald-900/40'
    : 'bg-blue-100 dark:bg-blue-900/40'

  async function handleDuplicate() {
    setDuplicating(true)
    try { await onDuplicate(source.id) }
    finally { setDuplicating(false) }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
            {isSheet ? (
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className={`w-4 h-4 ${source.type === 'csv' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{source.name}</h3>
            <p className="text-xs text-gray-400 truncate">
              {source.row_count.toLocaleString()} rows · {source.type.toUpperCase()}
              {version > 1 && <span className="ml-1.5 px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium text-[10px]">v{version}</span>}
              {updatedStr && <span className="ml-1">· {updatedStr}</span>}
              {isTemplate && <span className="ml-1.5 px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium text-[10px]">template</span>}
            </p>
            {/* Sheet sync status */}
            {isSheet && lastSynced && (
              <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${syncStatus === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                {syncStatus === 'error' ? (
                  <>
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Sync error · {timeAgo(lastSynced)}
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Synced {timeAgo(lastSynced)}
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-brand-500 transition-colors"
            title="Duplicate dashboard"
          >
            {duplicating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(source.id)}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
            title="Delete source"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <button onClick={() => navigate(`/source/${source.id}`)} className="flex-1 btn-primary py-1.5 text-xs">
          Dashboard →
        </button>
        <button onClick={() => navigate(`/source/${source.id}/kpis`)} className="btn-secondary py-1.5 text-xs px-3">
          Widgets
        </button>
        {!isSheet && (
          <button
            onClick={() => navigate(`/source/${source.id}/update`)}
            className="btn-secondary py-1.5 text-xs px-3"
            title="Re-upload data file"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { sources, loading, deleteSource, reload } = useDataSources()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleDelete(id) {
    if (!confirm('Delete this data source and all its data?')) return
    await deleteSource(id)
  }

  async function handleDuplicate(id) {
    await duplicateSource(id, user?.id)
    await reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Analytics</span>
          </div>
          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Open user menu"
            >
              <Avatar user={user} size="sm" />
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block max-w-[140px] truncate">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}
              </span>
              <svg className="w-3.5 h-3.5 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-20 py-1 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Account'}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View profile
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Your data sources</h1>
            <p className="text-sm text-gray-400 mt-0.5">Upload CSV or connect a Google Sheet to get started.</p>
          </div>
          <button onClick={() => navigate('/upload')} className="btn-primary">
            + New source
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />)}
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data sources yet.</p>
            <button onClick={() => navigate('/upload')} className="btn-primary mt-4">Upload your first file</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
