/**
 * SheetsAdapter — fetches data from the Google Sheets API v4 and normalises
 * it into the standard { headers, rows } format consumed by all widgets.
 *
 * Google Sheets API reference:
 *   https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 */

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Extracts the sheet ID from a full Google Sheets URL.
 * Accepts both /d/<id>/edit and bare IDs.
 */
export function extractSheetId(urlOrId) {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : urlOrId.trim()
}

/**
 * Fetches all values from a sheet range and returns the standard data shape.
 *
 * @param {object} params
 * @param {string} params.sheetId   - Google Sheet document ID
 * @param {string} params.apiKey    - Google Sheets API key
 * @param {string} [params.sheetName] - Tab name (defaults to first sheet)
 * @param {string} [params.range]   - A1 notation range (defaults to entire sheet)
 * @returns {Promise<{ headers: string[], rows: (string|number)[][] }>}
 */
export async function fetchSheet({ sheetId, apiKey, sheetName, range }) {
  const tab = sheetName ? encodeURIComponent(sheetName) : ''
  const a1Range = range || (tab ? `${tab}` : 'A:ZZ')
  const url = `${SHEETS_BASE}/${sheetId}/values/${a1Range}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Sheets API error ${res.status}`)
  }

  const data = await res.json()
  return normalise(data.values || [])
}

/**
 * Lists all sheet (tab) names in a spreadsheet — used in the wizard preview.
 *
 * @param {string} sheetId
 * @param {string} apiKey
 * @returns {Promise<string[]>}
 */
export async function listSheetNames(sheetId, apiKey) {
  const url = `${SHEETS_BASE}/${sheetId}?key=${apiKey}&fields=sheets.properties.title`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API error ${res.status}`)
  const data = await res.json()
  return (data.sheets || []).map((s) => s.properties.title)
}

/**
 * Normalises a raw 2-D values array from the Sheets API into { headers, rows }.
 * First row is treated as headers; subsequent rows become data rows.
 * Rows shorter than the header are padded with empty strings.
 */
function normalise(values) {
  if (!values.length) return { headers: [], rows: [] }
  const [headerRow, ...dataRows] = values
  const headers = headerRow.map(String)
  const rows = dataRows.map((row) =>
    headers.map((_, i) => (row[i] !== undefined ? row[i] : ''))
  )
  return { headers, rows }
}

// Phase 2 Excel placeholder — see ExcelAdapter.js
