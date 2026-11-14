import { useState } from 'react'

const assignmentStatusStyle = {
  Active: 'bg-amber-50 text-amber-800 ring-amber-700/15',
  Completed: 'bg-slate-100 text-slate-700 ring-slate-500/15',
}

const formatRupees = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const formatAssignmentDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '—'
  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(year, month - 1, day)
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return '—'
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

const AssignmentStatus = ({ status }) => (
  <span
    className={`inline-flex rounded-sm px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${assignmentStatusStyle[status] || 'bg-slate-100 text-slate-700 ring-slate-500/15'}`}
  >
    {status}
  </span>
)

const WorkDates = ({ startDate, expectedEndDate }) => (
  <>
    {startDate ? formatAssignmentDate(startDate) : '—'}
    {' – '}
    {expectedEndDate ? formatAssignmentDate(expectedEndDate) : '—'}
  </>
)

const EmptyRoster = ({ hasAssignments }) => (
  <>
    <p className="text-sm font-semibold text-slate-800">
      {hasAssignments ? 'No roster entries found' : 'No labour assignments yet'}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      {hasAssignments
        ? 'Try another name, work item or filter.'
        : 'Add a labour assignment to populate this roster.'}
    </p>
  </>
)

const LabourRoster = ({ entries }) => {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const filteredEntries = entries.filter((entry) => {
    const searchText =
      `${entry.name} ${entry.detail} ${entry.assignment} ${entry.type}`.toLowerCase()

    return (
      searchText.includes(query.trim().toLowerCase()) &&
      (typeFilter === 'All types' || entry.type === typeFilter) &&
      (statusFilter === 'All statuses' || entry.status === statusFilter)
    )
  })

  return (
    <section
      aria-labelledby="roster-heading"
      className="mt-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
            Site allocation
          </p>
          <h2
            id="roster-heading"
            className="mt-1 text-lg font-bold tracking-tight text-slate-900"
          >
            Labour roster
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Saved labour assignments for this project
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[550px]">
          <label className="sm:col-span-1">
            <span className="sr-only">Search labour roster</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or work"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
          </label>
          <label>
            <span className="sr-only">Filter by labour type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            >
              <option>All types</option>
              <option>Individual</option>
              <option>Contractor</option>
              <option>Crew</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by assignment status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            >
              <option>All statuses</option>
              {[...new Set(entries.map((entry) => entry.status))]
                .sort()
                .map((status) => (
                  <option key={status}>{status}</option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">
              <th scope="col" className="px-5 py-3">Worker / team</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Assigned work</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Work dates</th>
              <th scope="col" className="px-4 py-3">Estimated quantity</th>
              <th scope="col" className="px-5 py-3 text-right">Estimated amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEntries.map((entry) => (
              <tr
                key={entry.id || entry.name}
                className="transition-colors hover:bg-slate-50/80"
              >
                <th scope="row" className="px-5 py-4 font-normal">
                  <span className="block text-sm font-semibold text-slate-900">
                    {entry.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {entry.detail}
                  </span>
                </th>
                <td className="px-4 py-4 text-xs font-medium text-slate-600">
                  {entry.type}
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {entry.assignment}
                </td>
                <td className="px-4 py-4">
                  <AssignmentStatus status={entry.status} />
                </td>
                <td className="px-4 py-4 text-sm font-medium text-slate-700">
                  <WorkDates
                    startDate={entry.startDate}
                    expectedEndDate={entry.expectedEndDate}
                  />
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {entry.quantity}
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-slate-900">
                    {entry.estimatedAmount === null
                      ? '—'
                      : formatRupees(entry.estimatedAmount)}
                  </span>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="7" className="px-5 py-12 text-center">
                  <EmptyRoster hasAssignments={entries.length > 0} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        aria-label="Compact labour roster"
        className="divide-y divide-slate-200 lg:hidden"
        role="list"
      >
        {filteredEntries.map((entry) => (
          <article
            key={entry.id || entry.name}
            className="border-l-2 border-l-amber-400 px-4 py-4 sm:px-5"
            role="listitem"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900">
                  {entry.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{entry.detail}</p>
              </div>
              <AssignmentStatus status={entry.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  Assigned work
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {entry.assignment}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  Type · quantity
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  {entry.type} · {entry.quantity}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  Work dates
                </p>
                <p className="mt-1 text-xs font-medium tabular-nums text-slate-700">
                  <WorkDates
                    startDate={entry.startDate}
                    expectedEndDate={entry.expectedEndDate}
                  />
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  Estimated amount
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                  {entry.estimatedAmount === null
                    ? '—'
                    : formatRupees(entry.estimatedAmount)}
                </p>
              </div>
            </div>
          </article>
        ))}
        {filteredEntries.length === 0 && (
          <div className="px-5 py-12 text-center" role="listitem">
            <EmptyRoster hasAssignments={entries.length > 0} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p>
          Showing <span className="font-semibold text-slate-700">{filteredEntries.length}</span> of {entries.length} roster entries
        </p>
        <p>Amounts shown in Indian rupees (INR)</p>
      </div>
    </section>
  )
}

export default LabourRoster
