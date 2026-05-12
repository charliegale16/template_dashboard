import Papa from 'papaparse'

/** Download rows as a CSV file */
export function exportCSV(headers, rows, filename = 'export.csv') {
  const data = rows.map((r) => {
    const obj = {}
    headers.forEach((h) => { obj[h] = r.data?.[h] ?? '' })
    return obj
  })
  const csv = Papa.unparse(data, { columns: headers })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Trigger browser print dialog (user can Save as PDF) */
export function printDashboard() {
  window.print()
}
