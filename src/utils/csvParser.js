import Papa from 'papaparse'

/**
 * Parse a CSV File object into { headers: string[], rows: any[][] }
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) return reject(new Error(errors[0].message))
        if (!data.length) return reject(new Error('CSV is empty'))
        const [headerRow, ...rest] = data
        resolve({
          headers: headerRow.map(String),
          rows: rest,
        })
      },
      error: reject,
    })
  })
}
