/**
 * SheetsAdapter — Google Sheets API v4, authenticated via OAuth 2.0 Bearer token.
 *
 * ─── Google Cloud Console setup ──────────────────────────────────────────────
 *  1. Enable the Google Sheets API:
 *       console.cloud.google.com → APIs & Services → Enable APIs → "Google Sheets API"
 *  2. Create an OAuth 2.0 Client ID (Web Application type):
 *       APIs & Services → Credentials → Create Credentials → OAuth client ID
 *  3. Authorized JavaScript Origins — add:
 *       http://localhost:5173   (Vite dev server)
 *       https://your-production-domain.com
 *  4. Copy the Client ID into .env:
 *       VITE_GOOGLE_CLIENT_ID=<your_client_id>
 *  5. The Sheets API scope used here is:
 *       https://www.googleapis.com/auth/spreadsheets.readonly
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * All functions throw an error with { status: 401 } when the token has expired
 * so callers can call logout() and redirect to /setup.
 *
 * Phase 2 — Excel / Microsoft Graph: see ExcelAdapter.js for matching stubs.
 */

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Extracts the sheet document ID from a full Google Sheets URL or returns the
 * bare ID unchanged.
 */
export function extractSheetId(urlOrId) {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : urlOrId.trim()
}

/**
 * Returns all tab (worksheet) names for a spreadsheet.
 *
 * @param {string} sheetId      - Google Sheet document ID
 * @param {string} accessToken  - OAuth 2.0 Bearer token
 * @returns {Promise<string[]>}
 */
export async function fetchSheetTabs(sheetId, accessToken) {
  const url = `${SHEETS_BASE}/${sheetId}?fields=sheets.properties.title`
  const res = await fetch(url, { headers: authHeader(accessToken) })
  await assertOk(res)
  const data = await res.json()
  return (data.sheets || []).map((s) => s.properties.title)
}

/**
 * Fetches all values from a tab and returns { headers, rows }.
 * First row is treated as headers; shorter rows are padded with empty strings.
 *
 * @param {string} sheetId      - Google Sheet document ID
 * @param {string} tabName      - Worksheet tab name
 * @param {string} accessToken  - OAuth 2.0 Bearer token
 * @returns {Promise<{ headers: string[], rows: (string|number)[][] }>}
 */
export async function fetchSheetData(sheetId, tabName, accessToken) {
  const range = encodeURIComponent(tabName)
  const url = `${SHEETS_BASE}/${sheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
  const res = await fetch(url, { headers: authHeader(accessToken) })
  await assertOk(res)
  const data = await res.json()
  return normalise(data.values || [])
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` }
}

async function assertOk(res) {
  if (res.ok) return
  if (res.status === 401) {
    const err = new Error('Session expired. Please reconnect your Google account.')
    err.status = 401
    throw err
  }
  const body = await res.json().catch(() => ({}))
  throw new Error(body?.error?.message || `Sheets API error ${res.status}`)
}

function normalise(values) {
  if (!values.length) return { headers: [], rows: [] }
  const [headerRow, ...dataRows] = values
  const headers = headerRow.map(String)
  const rows = dataRows.map((row) =>
    headers.map((_, i) => (row[i] !== undefined ? row[i] : ''))
  )
  return { headers, rows }
}
