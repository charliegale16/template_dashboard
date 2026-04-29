/**
 * ExcelAdapter — Phase 2 stub.
 *
 * Method signatures mirror SheetsAdapter exactly so all callers can swap
 * adapters by changing a single import.
 *
 * Two integration paths are planned:
 *   A) File upload via SheetJS (xlsx npm package) — client-side parsing,
 *      no server required.
 *   B) Microsoft Graph API — MSAL OAuth flow →
 *      GET /me/drive/items/{id}/workbook/worksheets/{sheet}/usedRange
 *
 * Phase 2: import the chosen library and implement the functions below.
 */

/**
 * Returns all worksheet names in an Excel workbook.
 *
 * @param {File|string} fileOrItemId  - File object (SheetJS) or OneDrive item ID (Graph)
 * @param {string}      accessToken   - OAuth token (Graph path only)
 * @returns {Promise<string[]>}
 */
// TODO (Phase 2): implement.
export async function fetchSheetTabs(fileOrItemId, accessToken) {
  // Strategy A — SheetJS:
  // const { read } = await import('xlsx')
  // const buf = await fileOrItemId.arrayBuffer()
  // const wb = read(buf, { type: 'array' })
  // return wb.SheetNames

  // Strategy B — Microsoft Graph:
  // const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileOrItemId}/workbook/worksheets`
  // const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  // const data = await res.json()
  // return data.value.map(ws => ws.name)

  throw new Error('ExcelAdapter.fetchSheetTabs is not yet implemented (Phase 2).')
}

/**
 * Fetches all data from a worksheet and returns { headers, rows }.
 *
 * @param {File|string} fileOrItemId  - File object (SheetJS) or OneDrive item ID (Graph)
 * @param {string}      tabName       - Worksheet name
 * @param {string}      accessToken   - OAuth token (Graph path only)
 * @returns {Promise<{ headers: string[], rows: (string|number)[][] }>}
 */
// TODO (Phase 2): implement.
export async function fetchSheetData(fileOrItemId, tabName, accessToken) {
  // Strategy A — SheetJS:
  // const { read, utils } = await import('xlsx')
  // const buf = await fileOrItemId.arrayBuffer()
  // const wb = read(buf, { type: 'array' })
  // const ws = wb.Sheets[tabName]
  // return normalise(utils.sheet_to_json(ws, { header: 1 }))

  // Strategy B — Microsoft Graph:
  // const sheet = encodeURIComponent(tabName)
  // const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileOrItemId}/workbook/worksheets/${sheet}/usedRange`
  // const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  // const data = await res.json()
  // return normalise(data.values)

  throw new Error('ExcelAdapter.fetchSheetData is not yet implemented (Phase 2).')
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
