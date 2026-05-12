import React, { useState, useEffect, useRef, useCallback } from 'react'
import { extractSheetId, fetchSheetTabs, fetchSheetData } from '../../adapters/SheetsAdapter'
import { getCached, setCached, getCachedTabs, setCachedTabs } from '../../utils/sheetCache'

export default function Step2Connect({ config, onChange, accessToken }) {
  const [url, setUrl] = useState(
    config.sheetId
      ? `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`
      : ''
  )
  const [availableTabs, setAvailableTabs] = useState([])
  const [previews, setPreviews] = useState({})
  const [activePreview, setActivePreview] = useState(config.sheetName || null)
  const [tabsLoading, setTabsLoading] = useState(false)
  const [tabsError, setTabsError] = useState(null)
  const debounceRef = useRef(null)

  const selectedTabs = config.sheetTabs || []

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const id = extractSheetId(url)
    if (!id || !accessToken) return
    debounceRef.current = setTimeout(() => loadTabs(id, accessToken), 600)
    return () => clearTimeout(debounceRef.current)
  }, [url, accessToken])

  const loadPreview = useCallback(async (sheetId, tabName) => {
    const cached = getCached(sheetId, tabName)
    if (cached) {
      setPreviews((p) => ({ ...p, [tabName]: cached.data }))
      return
    }
    setPreviews((p) => ({ ...p, [tabName]: 'loading' }))
    try {
      const data = await fetchSheetData(sheetId, tabName, accessToken)
      setCached(sheetId, tabName, data)
      setPreviews((p) => ({ ...p, [tabName]: data }))
    } catch (err) {
      setPreviews((p) => ({ ...p, [tabName]: 'error:' + err.message }))
    }
  }, [accessToken])

  const loadTabs = useCallback(async (sheetId, token) => {
    const cachedNames = getCachedTabs(sheetId)
    if (cachedNames) {
      setAvailableTabs(cachedNames)
      const validSelected = (config.sheetTabs || []).filter((t) => cachedNames.includes(t))
      const initial = validSelected.length ? validSelected : [cachedNames[0]]
      onChange({ sheetId, sheetTabs: initial, sheetName: initial[0] })
      setActivePreview(initial[0])
      loadPreview(sheetId, initial[0])
      return
    }
    setTabsLoading(true)
    setTabsError(null)
    try {
      const names = await fetchSheetTabs(sheetId, token)
      setCachedTabs(sheetId, names)
      setAvailableTabs(names)
      const validSelected = (config.sheetTabs || []).filter((t) => names.includes(t))
      const initial = validSelected.length ? validSelected : [names[0]]
      onChange({ sheetId, sheetTabs: initial, sheetName: initial[0] })
      setActivePreview(initial[0])
      loadPreview(sheetId, initial[0])
    } catch (err) {
      setTabsError(err.message)
    } finally {
      setTabsLoading(false)
    }
  }, [config.sheetTabs, onChange, loadPreview])

  function handleTabToggle(tabName) {
    if (selectedTabs.includes(tabName)) {
      if (selectedTabs.length === 1) return
      const next = selectedTabs.filter((t) => t !== tabName)
      onChange({ sheetTabs: next, sheetName: next[0] })
    } else {
      const next = [...selectedTabs, tabName]
      onChange({ sheetTabs: next, sheetName: next[0] })
    }
  }

  function handlePreviewTab(tabName) {
    setActivePreview(tabName)
    const id = extractSheetId(url)
    if (id && accessToken && !previews[tabName]) {
      loadPreview(id, tabName)
    }
  }

  const previewData = activePreview ? previews[activePreview] : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Select your sheet</h2>
        <p className="text-sm text-gray-500 mt-1">
          Paste the URL of your Google Sheet — tabs load automatically.
        </p>
      </div>

      <div>
        <label className="label">Google Sheet URL</label>
        <input
          className="input"
          type="url"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          The sheet must be accessible by your connected Google account.
        </p>
      </div>

      {tabsError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {tabsError}
        </div>
      )}

      {(tabsLoading || availableTabs.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {tabsLoading
                ? 'Fetching tabs…'
                : `${availableTabs.length} tab${availableTabs.length !== 1 ? 's' : ''} found — select which to use`}
            </p>
            {selectedTabs.length > 1 && (
              <span className="text-xs text-brand-600 font-medium">{selectedTabs.length} selected</span>
            )}
          </div>

          {tabsLoading ? (
            <TabSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableTabs.map((tabName) => (
                <TabCard
                  key={tabName}
                  tabName={tabName}
                  isSelected={selectedTabs.includes(tabName)}
                  isPrimary={selectedTabs[0] === tabName}
                  isPreviewing={activePreview === tabName}
                  onToggle={() => handleTabToggle(tabName)}
                  onPreview={() => handlePreviewTab(tabName)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activePreview && (
        <PreviewPanel tabName={activePreview} data={previewData} totalTabs={selectedTabs.length} />
      )}
    </div>
  )
}

function TabCard({ tabName, isSelected, isPrimary, isPreviewing, onToggle, onPreview }) {
  return (
    <div className={[
      'relative rounded-xl border-2 p-3 transition-all cursor-pointer select-none',
      isSelected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300',
    ].join(' ')}>
      {isPrimary && (
        <span className="absolute -top-2 left-3 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-600 text-white leading-none">
          PRIMARY
        </span>
      )}
      <div className="flex items-start gap-2" onClick={onToggle}>
        <span className={[
          'mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white',
        ].join(' ')}>
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug break-all">{tabName}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPreview() }}
        className={[
          'mt-2 ml-6 text-xs transition-colors',
          isPreviewing ? 'text-brand-600 font-medium' : 'text-gray-400 hover:text-brand-500',
        ].join(' ')}
      >
        {isPreviewing ? '▶ Previewing' : 'Preview →'}
      </button>
    </div>
  )
}

function PreviewPanel({ tabName, data, totalTabs }) {
  if (!data) return null
  if (data === 'loading') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Preview: <span className="text-brand-600">{tabName}</span>
        </p>
        <div className="h-28 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading preview…
        </div>
      </div>
    )
  }
  if (typeof data === 'string' && data.startsWith('error:')) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Could not preview <strong>{tabName}</strong>: {data.slice(6)}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-medium text-gray-700">
          Preview: <span className="text-brand-600">{tabName}</span>
        </p>
        <span className="text-xs text-gray-400">
          {data.headers.length} columns · {data.rows.length} rows
          {totalTabs > 1 && ' · click another tab above to switch'}
        </span>
      </div>
      <div className="overflow-auto rounded-lg border border-gray-200 max-h-72">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {data.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="px-3 py-4 text-center text-gray-400">
                  No data rows found.
                </td>
              </tr>
            ) : (
              data.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {data.headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate">
                      {String(row[ci] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl border-2 border-gray-100 bg-gray-50 animate-pulse" />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
// eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof eof
