import React, { useState, useMemo } from 'react'

const PAGE_SIZE = 10

/**
 * DataTable — paginated, sortable view of all raw rows.
 */
export default function DataTable({ data }) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState({ col: null, dir: 'asc' })

  const sorted = useMemo(() => {
    if (sort.col === null) return data.rows
    const idx = data.headers.indexOf(sort.col)
    if (idx === -1) return data.rows
    return [...data.rows].sort((a, b) => {
      const av = a[idx]
      const bv = b[idx]
      const an = parseFloat(av)
      const bn = parseFloat(bv)
      const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(col) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }
    )
    setPage(0)
  }

  if (!data?.headers?.length) {
    return (
      <div className="card">
        <p className="text-sm font-semibold text-gray-700 mb-3">Data Table</p>
        <div className="text-sm text-gray-400 text-center py-8">No data available.</div>
      </div>
    )
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Data Table</p>
        <span className="text-xs text-gray-400">{sorted.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((h) => (
                <th
                  key={h}
                  onClick={() => handleSort(h)}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sort.col === h ? (
                      <span>{sort.dir === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100">↕</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                    {String(cell ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
