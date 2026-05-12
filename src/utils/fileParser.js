/**
 * Unified file parser — handles CSV, XLSX, and XLS files.
 * Returns { headers: string[], rows: any[][], sheetNames?: string[], activeSheet?: string }
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']
export const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]

export function getFileExtension(file) {
  return '.' + file.name.split('.').pop().toLowerCase()
}

export function isAccepted(file) {
  return ACCEPTED_EXTENSIONS.includes(getFileExtension(file))
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) return reject(new Error(errors[0].message))
        if (!data.length) return reject(new Error('File is empty'))
        const [headerRow, ...rest] = data
        resolve({ headers: headerRow.map(String), rows: rest })
      },
      error: reject,
    })
  })
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function sheetToRows(ws) {
  // sheet_to_json with header:1 returns array-of-arrays
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  // Filter trailing fully-empty rows
  const trimmed = data.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (!trimmed.length) throw new Error('Sheet is empty')
  const [headerRow, ...rest] = trimmed
  return {
    headers: headerRow.map((h) => String(h ?? '').trim()),
    rows: rest,
  }
}

async function parseExcelFile(file, sheetName = null) {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetNames = workbook.SheetNames
  if (!sheetNames.length) throw new Error('Workbook contains no sheets')

  const active = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0]
  const ws = workbook.Sheets[active]
  const { headers, rows } = sheetToRows(ws)

  return { headers, rows, sheetNames, activeSheet: active }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse any supported file.
 * @param {File} file
 * @param {string|null} sheetName  — only used for Excel; selects which sheet to parse
 * @returns {Promise<{ headers, rows, sheetNames?, activeSheet? }>}
 */
export async function parseFile(file, sheetName = null) {
  const ext = getFileExtension(file)
  if (ext === '.csv') return parseCSVFile(file)
  if (ext === '.xlsx' || ext === '.xls') return parseExcelFile(file, sheetName)
  throw new Error(`Unsupported file type: ${ext}. Please upload a CSV, XLSX, or XLS file.`)
}
