/**
 * ReuploadPage — replace the data for an existing source.
 *
 * The source_id is kept stable, so all widgets, dashboard layouts,
 * and KPI configurations remain intact after the upload.
 *
 * Route: /source/:sourceId/update
 */

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { loadSource, refreshDataSource } from '../hooks/useDataSource'
import { parseFile, isAccepted, getFileExtension } from '../utils/fileParser'

const PREVIEW_ROWS = 5

// ── Helpers ───────────────────────────────────────────────────────────────────

function PreviewTable({ headers, rows }) {
  if (!headers.length) return null
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs divide-y divide-gray-100 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
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
        Showing {Math.min(PREVIEW_ROWS, rows.length)} of {rows.length.toLocaleString()} rows
      </div>
    </div>
  )
}

/** Highlight columns that are new or removed compared to the existing dataset. */
function ColumnDiff({ prevHeaders, nextHeaders }) {
  if (!prevHeaders?.length) return null
  const prev = new Set(prevHeaders)
  const next = new Set(nextHeaders)
  const added   = nextHeaders.filter((h) => !prev.has(h))
  const removed = prevHeaders.filter((h) => !next.has(h))
  if (!added.length && !removed.length) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        All {nextHeaders.length} columns match the existing dataset — widgets will continue to work.
      </p>
    )
  }
  return (
    <div className="text-xs space-y-1">
      {added.length > 0 && (
        <p className="text-brand-600 dark:text-brand-400">
          <span className="font-semibold">+ Added:</span> {added.join(', ')}
        </p>
      )}
      {removed.length > 0 && (
        <p className="text-amber-600 dark:text-amber-400">
          <span className="font-semibold">⚠ Removed:</span> {removed.join(', ')} — widgets referencing these columns will show no data.
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReuploadPage() {
  const { sourceId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [source, setSource]         = useState(null)
  const [sourceError, setSourceError] = useState(null)

  const [file, setFile]             = useState(null)
  const [parsed, setParsed]         = useState(null)   // { headers, rows, sheetNames?, activeSheet? }
  const [fileError, setFileError]   = useState(null)
  const [parsing, setParsing]       = useState(false)
  const [dragging, setDragging]     = useState(false)
  const fileInputRef                = useRef(null)

  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [progress, setProgress]     = useState(null)

  // Load current source metadata
  useEffect(() => {
    if (!sourceId) return
    loadSource(sourceId)
      .then(setSource)
      .catch((err) => setSourceError(err.message))
  }, [sourceId])

  // ── File handling ─────────────────────────────────────────────────────────

  async function handleFile(f) {
    if (!f) return
    if (!isAccepted(f)) { setFileError('Please upload a CSV, XLSX, or XLS file.'); return }
    setFileError(null); setParsed(null); setFile(f); setParsing(true)
    try {
      setParsed(await parseFile(f))
    } catch (err) {
      setFileError(err.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleSheetChange(sheetName) {
    if (!file || !parsed?.sheetNames) return
    setFileError(null); setParsing(true)
    try { setParsed(await parseFile(file, sheetName)) }
    catch (err) { setFileError(err.message) }
    finally { setParsing(false) }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || !parsed || !source) return
    setSaving(true); setSaveError(null); setProgress('Replacing dataset rows…')
    try {
      const ext = file ? getFileExtension(file) : null
      await refreshDataSource({
        sourceId,
        userId: user.id,
        headers: parsed.headers,
        rows:    parsed.rows,
        meta: {
          ...(source.meta ?? {}),
          filename:    file?.name ?? source.meta?.filename,
          format:      ext?.replace('.', '') ?? source.meta?.format ?? 'csv',
          uploaded_at: new Date().toISOString(),
        },
      })
      navigate(`/source/${sourceId}`)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false); setProgress(null)
    }
  }

  const ext     = file ? getFileExtension(file) : null
  const version = (source?.meta?.version ?? 1) + 1   // what the new version will be

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            Update — {source?.name ?? '…'}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {sourceError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {sourceError}
          </div>
        )}

        {/* Current source summary */}
        {source && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{source.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {source.row_count.toLocaleString()} rows · {source.headers?.length ?? 0} columns
                  {source.meta?.version && ` · v${source.meta.version}`}
                  {source.meta?.updated_at && ` · Updated ${new Date(source.meta.updated_at).toLocaleDateString()}`}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 shrink-0">
                → v{version}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Uploading a new file replaces all rows but keeps all widgets, layouts, and KPI configurations intact.
            </p>
          </div>
        )}

        {/* Upload area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging         ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
              : parsed         ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />

            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Parsing file…</p>
              </div>
            ) : parsed ? (
              <div className="space-y-1.5">
                <svg className="w-8 h-8 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  {parsed.headers.length} columns · {parsed.rows.length.toLocaleString()} rows
                </p>
                <p className="text-xs text-gray-400 mt-1">Click to change file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="w-8 h-8 text-gray-300 dark:text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
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

          {parsed && (
            <div className="space-y-4">
              {/* Sheet selector for multi-sheet Excel */}
              {parsed.sheetNames && parsed.sheetNames.length > 1 && (
                <div>
                  <label className="label">Sheet</label>
                  <select className="input" value={parsed.activeSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}>
                    {parsed.sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Column diff vs current source */}
              <ColumnDiff prevHeaders={source?.headers} nextHeaders={parsed.headers} />

              <PreviewTable headers={parsed.headers} rows={parsed.rows} />
            </div>
          )}

          {saveError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {saveError}
            </div>
          )}

          {progress && (
            <div className="flex items-center gap-2 text-sm text-brand-600">
              <div className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              {progress}
            </div>
          )}

          {parsed && (
            <div className="flex justify-end gap-2">
              <button onClick={() => navigate(-1)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !source} className="btn-primary text-sm">
                {saving ? 'Updating…' : `Replace data → v${version}`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
