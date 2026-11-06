import { useState } from 'react'

const DataTable = ({
  ariaLabel,
  columns,
  data,
  initialPageSize = 10,
  minTableWidth = '900px',
  pageSizeOptions = [10, 25, 50],
  rowKey,
  renderRowActions,
  sortOptions = [],
}) => {
  const [sort, setSort] = useState(() => {
    const initialSort = sortOptions[0]
    return initialSort
      ? { key: initialSort.key, direction: initialSort.initialDirection || 'asc' }
      : { key: null, direction: 'asc' }
  })
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [page, setPage] = useState(1)
  const activeSort = sortOptions.find(({ key }) => key === sort.key)
  const sortedData = data
    .map((row, index) => ({ row, index }))
    .sort((first, second) => {
      if (!activeSort) return first.index - second.index

      const firstValue = activeSort.getValue(first.row)
      const secondValue = activeSort.getValue(second.row)
      if (firstValue == null) return secondValue == null ? first.index - second.index : 1
      if (secondValue == null) return -1

      const comparison =
        typeof firstValue === 'number' && typeof secondValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue), undefined, {
              numeric: true,
              sensitivity: 'base',
            })
      const tieComparison =
        comparison === 0 && activeSort.compareRows
          ? activeSort.compareRows(first.row, second.row)
          : 0
      return comparison === 0
        ? tieComparison || first.index - second.index
        : comparison * (sort.direction === 'asc' ? 1 : -1)
    })
    .map(({ row }) => row)
  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = (key) => {
    const option = sortOptions.find((item) => item.key === key)
    if (!option) return
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key
          ? currentSort.direction === 'asc'
            ? 'desc'
            : 'asc'
          : option.initialDirection || 'asc',
    }))
    setPage(1)
  }

  const renderSortHeader = (column) => {
    const option = sortOptions.find(({ key }) => key === column.sortKey)
    if (!option) return column.label

    const isActive = sort.key === option.key
    const defaultDirection = option.initialDirection || 'asc'
    const nextDirection = isActive
      ? sort.direction === 'asc'
        ? 'descending'
        : 'ascending'
      : defaultDirection === 'asc'
        ? 'ascending'
        : 'descending'

    return (
      <button
        type="button"
        aria-label={`Sort by ${column.label.toLowerCase()} ${nextDirection}`}
        className="inline-flex items-center gap-1 rounded-sm text-left font-semibold uppercase tracking-[0.08em] text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={() => toggleSort(option.key)}
      >
        {column.label}
        <span aria-hidden="true" className="text-sm leading-none">
          {isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="flex justify-end border-b border-slate-200 px-4 py-3 sm:px-5">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Rows
          <select
            aria-label={`${ariaLabel} per page`}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            value={pageSize}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label={ariaLabel}
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: minTableWidth }}
        >
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {columns.map((column) => {
                const isSorted = sort.key === column.sortKey
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-label={column.ariaLabel}
                    aria-sort={
                      column.sortKey && isSorted
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={column.headerClassName}
                  >
                    {renderSortHeader(column)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr
                key={rowKey(row)}
                className="group transition-colors hover:bg-slate-50/80"
              >
                {columns.map((column, index) => (
                  <td key={column.key} className={column.cellClassName}>
                    {index === columns.length - 1 && renderRowActions ? (
                      <div className="relative">
                        {column.renderCell(row)}
                        <div
                          data-row-actions
                          className="pointer-events-none absolute right-0 top-1/2 z-20 flex w-max -translate-y-1/2 items-center justify-end gap-1 rounded-md bg-white/95 p-1 opacity-0 shadow-md transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                        >
                          {renderRowActions(row)}
                        </div>
                      </div>
                    ) : (
                      column.renderCell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-slate-500" aria-live="polite">
          Showing {(currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}{' '}
          {ariaLabel.toLowerCase()}
        </p>
        <nav aria-label={`${ariaLabel} pages`} className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span className="text-xs tabular-nums text-slate-600">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </nav>
      </div>
    </>
  )
}

export default DataTable
