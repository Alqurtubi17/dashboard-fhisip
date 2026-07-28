import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages)

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1
  const endItem = Math.min(validCurrentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (validCurrentPage > 3) pages.push('...')

      const start = Math.max(2, validCurrentPage - 1)
      const end = Math.min(totalPages - 1, validCurrentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)

      if (validCurrentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
      {/* Items Info & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Menampilkan <strong className="font-semibold text-slate-800">{startItem}</strong> -{' '}
          <strong className="font-semibold text-slate-800">{endItem}</strong> dari{' '}
          <strong className="font-semibold text-slate-800">{totalItems}</strong> data
        </span>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
          <label htmlFor="page-size-select" className="text-slate-500">Tampilkan:</label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-ut-blue"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / hal
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                validCurrentPage === p
                  ? 'bg-ut-navy text-white shadow-sm'
                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-slate-400 font-bold">
              ...
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
          title="Halaman Selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
