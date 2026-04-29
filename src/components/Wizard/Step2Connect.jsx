import React, { useState } from 'react'
import { extractSheetId, fetchSheet, listSheetNames } from '../../adapters/SheetsAdapter'

export default function Step2Connect({ config, onChange }) {
  const [url, setUrl] = useState(
    config.sheetId
      ? `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`
      : ''
  )
  const [sheetNames, setSheetNames] = useState([])
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFetch() {
    setError(null)
    setLoading(true)
    try {
      const id = extractSheetId(url)
      if (!id) throw new Error('Could not extract a Sheet ID from that URL.')
      if (!config.apiKey) throw new Error('Please enter your Google Sheets API key.')

      const names = await listSheetNames(id, config.apiKey)
      setSheetNames(names)

      const selectedSheet = config.sheetName || names[0]
      const data = await fetchSheet({ sheetId: id, apiKey: config.apiKey, sheetName: selectedSheet })
      setPreview(data)
      onChange({ sheetId: id, sheetName: selectedSheet })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSheetChange(name) {
    onChange({ sheetName: name })
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSheet({ sheetId: config.sheetId, apiKey: config.apiKey, sheetName: name })
      setPreview(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Connect to Google Sheets</h2>
        <p className="text-sm text-gray-500 mt-1">
          Paste your Sheet URL and API key to preview your data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Google Sheet URL</label>
          <input
            className="input"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            API Key
            <a
              className="ml-2 text-brand-600 hover:underline font-normal"
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
            >
              Get one ↗
            </a>
          </label>
          <input
            className="input"
            type="password"
            placeholder="AIza..."
            value={config.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Enable the Google Sheets API in your Google Cloud project first.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleFetch}
          disabled={loading || !url || !config.apiKey}
        >
          {loading ? (
            <>
              <Spinner /> Fetching…
            </>
          ) : (
            'Fetch & Preview'
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {sheetNames.length > 1 && (
        <div>
          <label className="label">Sheet tab</label>
          <select
            className="input"
            value={config.sheetName}
            onChange={(e) => handleSheetChange(e.target.value)}
          >
            {sheetNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {preview && <DataPreview data={preview} />}
    </div>
  )
}

function DataPreview({ data }) {
  const visibleHeaders = data.headers.slice(0, 8)
  const visibleRows = data.rows.slice(0, 5)
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        Preview — {data.headers.length} columns, {data.rows.length} rows
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {visibleHeaders.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
              {data.headers.length > 8 && (
                <th className="px-3 py-2 text-gray-400">+{data.headers.length - 8} more</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {visibleHeaders.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
