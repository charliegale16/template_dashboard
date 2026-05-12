import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { saveDataSource } from '../hooks/useDataSource'
import { parseFile, isAccepted, getFileExtension } from '../utils/fileParser'
import { extractSheetId, fetchSheetTabs, fetchSheetData } from '../adapters/SheetsAdapter'

const PREVIEW_ROWS = 5

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ headers, rows }) {
  if (!headers.length) return null
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs divide-y divide-gray-100 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
            <tr key={i}>
              {headers.map((h, j) => (
                <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">
                  {Array.isArray(row) ? String(row[j] ?? '') : String(row?.data?.[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
        Showing {Math.min(PREVIEW_ROWS, rows.length)} of {rows.length} rows
      </div>
    </div>
  )
}

// ── File type badge ───────────────────────────────────────────────────────────

function FileBadge({ ext }) {
  const map = {
    '.csv':  { label: 'CSV',  cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    '.xlsx': { label: 'XLSX', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    '.xls':  { label: 'XLS',  cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  }
  const { label, cls } = map[ext] ?? { label: ext.toUpperCase().replace('.', ''), cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const navigate = useNavigate()
  const { user, accessToken, loginWithGoogle } = useAuth()

  const hasGoogleAccess = Boolean(accessToken)

  // Restore tab after OAuth redirect
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem('upload_tab')
    if (saved) { sessionStorage.removeItem('upload_tab'); return saved }
    return 'file'
  })

  // ── File upload state ─────────────────────────────────────────────────────
  const [file, setFile]           = useState(null)
  const [fileParsed, setFileParsed] = useState(null)    // { headers, rows, sheetNames?, activeSheet? }
  const [fileName, setFileName]   = useState('')
  const [fileError, setFileError] = useState(null)
  const [dragging, setDragging]   = useState(false)
  const [parsing, setParsing]     = useState(false)
  const fileInputRef              = useRef(null)

  // ── Google Sheet state ────────────────────────────────────────────────────
  const [sheetUrl, setSheetUrl]       = useState('')
  const [sheetId, setSheetId]         = useState(null)
  const [sheetTabs, setSheetTabs]     = useState([])
  const [selectedTab, setSelectedTab] = useState('')
  const [sheetParsed, setSheetParsed] = useState(null)
  const [sheetName, setSheetName]     = useState('')
  const [sheetError, setSheetError]   = useState(null)
  const [loadingTabs, setLoadingTabs] = useState(false)
  const [loadingSheet, setLoadingSheet] = useState(false)

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [progress, setProgress]   = useState(null)

  // ── File handling ─────────────────────────────────────────────────────────

  async function handleFile(f) {
    if (!f) return
    if (!isAccepted(f)) {
      setFileError('Please upload a CSV, XLSX, or XLS file.')
      return
    }
    setFileError(null)
    setFileParsed(null)
    setFile(f)
    setFileName(f.name.replace(/\.(csv|xlsx|xls)$/i, ''))
    setParsing(true)
    try {
      const parsed = await parseFile(f)
      setFileParsed(parsed)
    } catch (err) {
      setFileError(err.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleSheetChange(sheetName) {
    if (!file || !fileParsed?.sheetNames) return
    setFileError(null)
    setParsing(true)
    try {
      const parsed = await parseFile(file, sheetName)
      setFileParsed(parsed)
    } catch (err) {
      setFileError(err.message)
    } finally {
      setParsing(false)
    }
  }

  function onFileInputChange(e) { handleFile(e.target.files?.[0] ?? null) }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  // ── Google Sheet loading ──────────────────────────────────────────────────

  useEffect(() => {
    if (!sheetUrl.trim()) {
      setSheetTabs([]); setSheetId(null); setSheetParsed(null); setSheetError(null)
      return
    }
    const id = extractSheetId(sheetUrl.trim())
    if (!id) return

    const timer = setTimeout(async () => {
      setLoadingTabs(true); setSheetError(null); setSheetTabs([]); setSheetId(id)
      try {
        if (!accessToken) throw new Error('Not authenticated with Google.')
        const tabs = await fetchSheetTabs(id, accessToken)
        setSheetTabs(tabs)
        setSelectedTab(tabs[0] ?? '')
        if (!sheetName) setSheetName(tabs[0] ?? '')
      } catch (err) {
        setSheetError(err.message)
      } finally {
        setLoadingTabs(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [sheetUrl, accessToken])

  useEffect(() => {
    if (!sheetId || !selectedTab) return
    let cancelled = false
    async function load() {
      setLoadingSheet(true); setSheetError(null); setSheetParsed(null)
      try {
        const data = await fetchSheetData(sheetId, selectedTab, accessToken)
        if (!cancelled) { setSheetParsed(data); if (!sheetName) setSheetName(selectedTab) }
      } catch (err) {
        if (!cancelled) setSheetError(err.message)
      } finally {
        if (!cancelled) setLoadingSheet(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sheetId, selectedTab, accessToken])

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return
    const isFile = tab === 'file'
    const parsed = isFile ? fileParsed : sheetParsed
    const name = (isFile ? fileName : sheetName).trim()

    if (!parsed) return
    if (!name) { setSaveError('Please enter a name for this data source.'); return }

    setSaving(true); setSaveError(null); setProgress('Saving data source…')

    try {
      const ext = file ? getFileExtension(file) : null
      const meta = isFile
        ? { filename: file?.name, format: ext?.replace('.', '') ?? 'csv' }
        : { sheetId, tab: selectedTab, url: sheetUrl }

      // Determine type — 'excel' requires the DB migration in supabase/migrations/add_excel_type.sql
      // Falls back to 'csv' automatically if the constraint hasn't been updated yet
      let sourceType = isFile ? (ext === '.csv' ? 'csv' : 'excel') : 'sheet'

      let source
      try {
        source = await saveDataSource({
          userId: user.id, name,
          type: sourceType,
          headers: parsed.headers, rows: parsed.rows, meta,
        })
      } catch (err) {
        // If constraint violation, retry with 'csv' (migration not yet applied)
        if (sourceType === 'excel' && err.message?.includes('type_check')) {
          source = await saveDataSource({
            userId: user.id, name,
            type: 'csv',
            headers: parsed.headers, rows: parsed.rows, meta,
          })
        } else {
          throw err
        }
      }
      navigate(`/source/${source.id}/kpis`)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false); setProgress(null)
    }
  }

  const canSave = tab === 'file'
    ? Boolean(fileParsed && fileName.trim() && !saving)
    : Boolean(sheetParsed && sheetName.trim() && !saving)

  const ext = file ? getFileExtension(file) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">New data source</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

          {/* Tab toggle */}
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setTab('file')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'file'
                  ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/40 dark:bg-brand-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              CSV / Excel
            </button>
            <button
              onClick={() => setTab('sheet')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'sheet'
                  ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/40 dark:bg-brand-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {!hasGoogleAccess && (
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                </svg>
              )}
              Google Sheet
            </button>
          </div>

          <div className="p-6">

            {/* ── FILE TAB ── */}
            {tab === 'file' && (
              <div className="space-y-5">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragging
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                      : fileParsed
                      ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={onFileInputChange}
                  />

                  {parsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Parsing file…</p>
                    </div>
                  ) : fileParsed ? (
                    <div className="space-y-1.5">
                      <svg className="w-8 h-8 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex items-center justify-center gap-2">
                        <FileBadge ext={ext} />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500">
                        {fileParsed.headers.length} columns · {fileParsed.rows.length.toLocaleString()} rows
                        {fileParsed.sheetNames && ` · ${fileParsed.sheetNames.length} sheet${fileParsed.sheetNames.length !== 1 ? 's' : ''}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Stacked file icons */}
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <svg className="w-7 h-7 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <svg className="w-7 h-7 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Drop a file here, or <span className="text-brand-600 font-medium">browse</span>
                      </p>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">CSV</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">XLSX</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">XLS</span>
                      </div>
                    </div>
                  )}
                </div>

                {fileError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {fileError}
                  </div>
                )}

                {fileParsed && (
                  <>
                    {/* Excel: sheet selector */}
                    {fileParsed.sheetNames && fileParsed.sheetNames.length > 1 && (
                      <div>
                        <label className="label">Sheet</label>
                        <select
                          className="input"
                          value={fileParsed.activeSheet}
                          onChange={(e) => handleSheetChange(e.target.value)}
                        >
                          {fileParsed.sheetNames.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="label">Source name</label>
                      <input
                        className="input"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="e.g. Q2 Sales Data"
                      />
                    </div>

                    <PreviewTable headers={fileParsed.headers} rows={fileParsed.rows} />
                  </>
                )}
              </div>
            )}

            {/* ── SHEET TAB ── */}
            {tab === 'sheet' && (
              <>
                {!hasGoogleAccess ? (
                  <div className="flex flex-col items-center gap-5 py-10 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm flex items-center justify-center">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Connect your Google Account</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs mx-auto">
                        To import from Google Sheets, you need to sign in with Google. This grants read-only access to your spreadsheets.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sessionStorage.setItem('oauth_return', '/upload')
                        sessionStorage.setItem('upload_tab', 'sheet')
                        loginWithGoogle(window.location.origin)
                      }}
                      className="inline-flex items-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:shadow"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                      </svg>
                      Connect with Google
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      You'll be redirected to Google, then brought back to upload automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Google account connected — read-only Sheets access enabled
                    </div>
                    <div>
                      <label className="label">Google Sheet URL</label>
                      <input
                        className="input"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                      />
                      <p className="text-xs text-gray-400 mt-1">The sheet must be shared or your Google account must have access.</p>
                    </div>

                    {loadingTabs && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                        Fetching sheet info…
                      </div>
                    )}

                    {sheetTabs.length > 1 && (
                      <div>
                        <label className="label">Tab</label>
                        <select className="input" value={selectedTab} onChange={(e) => setSelectedTab(e.target.value)}>
                          {sheetTabs.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}

                    {loadingSheet && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                        Loading sheet data…
                      </div>
                    )}

                    {sheetError && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">{sheetError}</div>
                    )}

                    {sheetParsed && (
                      <>
                        <div>
                          <label className="label">Source name</label>
                          <input className="input" value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="e.g. Monthly Revenue" />
                        </div>
                        <PreviewTable headers={sheetParsed.headers} rows={sheetParsed.rows} />
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Save area ── */}
            {saveError && (
              <div className="mt-5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">{saveError}</div>
            )}
            {progress && (
              <div className="mt-5 flex items-center gap-2 text-sm text-brand-600">
                <div className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                {progress}
              </div>
            )}

            {((tab === 'file' && fileParsed) || (tab === 'sheet' && sheetParsed)) && (
              <div className="mt-6 flex justify-end">
                <button onClick={handleSave} disabled={!canSave} className="btn-primary">
                  {saving ? 'Saving…' : 'Save to dashboard →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
