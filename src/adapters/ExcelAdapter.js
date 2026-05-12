/**
 * ExcelAdapter — Phase 2 stub.
 *
 * Two integration paths are planned:
 *   A) File upload via SheetJS (xlsx npm package) — client-side parsing,
 *      no server required. Import `read` from 'xlsx' and parse the ArrayBuffer.
 *   B) Microsoft Graph API — OAuth2 flow → GET /me/drive/items/{id}/workbook/...
 *
 * Both paths must return the same { headers, rows } shape as SheetsAdapter
 * so that all consumers (useSheetData, widgets) work without modification.
 */

/**
 * Fetches/parses an Excel workbook and returns normalised data.
 *
 * @param {object} params
 * @param {File|string} params.file   - File object (SheetJS path) or item ID (Graph path)
 * @param {string}  [params.sheetName] - Worksheet tab name
 * @param {string}  [params.accessToken] - OAuth token (Graph path only)
 * @returns {Promise<{ headers: string[], rows: (string|number)[][] }>}
 */
export async function fetchExcel({ file, sheetName }) {
  const { read, utils } = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = read(buffer, { type: 'array' })
  const ws = wb.Sheets[sheetName || wb.SheetNames[0]]
  const values = utils.sheet_to_json(ws, { header: 1 })
  return normalise(values)
}

/**
 * Lists worksheet names in a workbook.
 * Mirrors SheetsAdapter.listSheetNames for a consistent adapter interface.
 *
 * @param {File|string} file
 * @param {string} [accessToken]
 * @returns {Promise<string[]>}
 */
export async function listSheetNames(file) {
  const { read } = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = read(buffer, { type: 'array' })
  return wb.SheetNames
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
