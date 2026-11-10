import { useEffect, useMemo, useState } from 'react'
import Modal from '../../../../../components/common/Modal'
import ProjectSectionLayout from '../ProjectSectionLayout'
import AddProjectEventForm from '../../forms/AddProjectEventForm'

const viewOptions = ['Month', 'Year', 'Day']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EMPTY_EVENTS = []

const parseProjectDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null

  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`

const differenceInDays = (firstDate, secondDate) =>
  Math.round(
    (Date.UTC(
      secondDate.getFullYear(),
      secondDate.getMonth(),
      secondDate.getDate()
    ) -
      Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())) /
      86400000
  )

const addDays = (date, count) => {
  const result = new Date(date)
  result.setDate(result.getDate() + count)
  return result
}

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

const formatDate = (date, options) =>
  new Intl.DateTimeFormat('en-IN', options).format(date)

const formatCurrency = (amount) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`

const formatCompactCurrency = (amount) =>
  amount >= 100000
    ? `₹${Math.round(amount / 100000)}L`
    : amount >= 1000
      ? `₹${Math.round(amount / 1000)}k`
      : formatCurrency(amount)

const isImageDocument = (document) =>
  [document.name, document.url].some(
    (value) => typeof value === 'string' &&
      /\.(?:jpe?g|png|gif|webp|bmp|avif)(?:[?#].*)?$/i.test(value)
  )

const DocumentDownloadLink = ({ document }) => (
  <a
    href={document.url || undefined}
    download={document.url ? document.name : undefined}
    aria-label={document.url ? `Download ${document.name}` : document.name}
    title={document.name}
    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
      document.url
        ? 'text-blue-700 hover:bg-blue-50'
        : 'cursor-not-allowed text-slate-400'
    }`}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 12v6m-3-3 3 3 3-3" />
    </svg>
    <span className="max-w-32 truncate">{document.name}</span>
  </a>
)

const createProjectActivities = (transactions, startDateValue, endDateValue, events = []) => {
  const startDate = parseProjectDate(startDateValue)
  const endDate = parseProjectDate(endDateValue)
  if (!startDate || !endDate || startDate > endDate) return []

  const startKey = dateKey(startDate)
  const endKey = dateKey(endDate)

  const transactionActivities = (Array.isArray(transactions) ? transactions : []).flatMap((transaction) => {
    const type = transaction.type?.toLowerCase()
    const date = parseProjectDate(transaction.transaction_date)
    const transactionDate = date && dateKey(date)
    const amount =
      transaction.amount === null ||
      typeof transaction.amount === 'undefined' ||
      transaction.amount === ''
        ? null
        : Number(transaction.amount)

    if (
      !transactionDate ||
      transactionDate < startKey ||
      transactionDate > endKey ||
      !['income', 'expense'].includes(type)
    ) {
      return []
    }

    return [{
      id: transaction.id,
      date: transactionDate,
      title: transaction.title || transaction.category || 'Untitled transaction',
      type,
      category: transaction.category,
      status: transaction.status,
      amount: Number.isFinite(amount) && amount >= 0 ? amount : null,
    }]
  })

  const projectEvents = (Array.isArray(events) ? events : []).flatMap((event) => {
    const date = parseProjectDate(event.startDate || event.start_date)
    const eventDate = date && dateKey(date)
    if (!eventDate || eventDate < startKey || eventDate > endKey) return []

    return [{
      id: event.id,
      date: eventDate,
      title: event.title,
      type: 'event',
      category: event.type || event.event_type,
      status: event.status || event.event_status,
      description: event.description,
      phase: event.phase || event.project_phase,
      priority: event.priority,
      endDate: event.endDate || event.end_date,
      documents: Array.isArray(event.files)
        ? event.files.map((file, index) => ({
            id: file.id || `${event.id}-file-${index}`,
            name: file.name || 'Event attachment',
            url: file.file_path || file.url || '',
          }))
        : [],
      amount: null,
    }]
  })

  return [...transactionActivities, ...projectEvents]
}

const getPeriodLabel = (date, view) => {
  if (view === 'year') return String(date.getFullYear())
  if (view === 'day') {
    return formatDate(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  return formatDate(date, { month: 'long', year: 'numeric' })
}

const movePeriod = (date, view, direction) => {
  if (view === 'day') return addDays(date, direction)
  if (view === 'year') {
    const year = date.getFullYear() + direction
    return new Date(year, date.getMonth(), Math.min(date.getDate(), daysInMonth(year, date.getMonth())))
  }

  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + direction, 1)
  return new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth(),
    Math.min(date.getDate(), daysInMonth(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth()))
  )
}

const isPeriodWithinRange = (date, view, startDate, endDate) => {
  if (view === 'day') return date >= startDate && date <= endDate
  if (view === 'year') {
    return date.getFullYear() >= startDate.getFullYear() &&
      date.getFullYear() <= endDate.getFullYear()
  }

  const period = date.getFullYear() * 12 + date.getMonth()
  const firstPeriod = startDate.getFullYear() * 12 + startDate.getMonth()
  const lastPeriod = endDate.getFullYear() * 12 + endDate.getMonth()
  return period >= firstPeriod && period <= lastPeriod
}

const clampDate = (date, startDate, endDate) =>
  date < startDate ? startDate : date > endDate ? endDate : date

const MonthActivityDetails = ({ date, activities, onSelectDate }) => {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const selectedImageDocuments = selectedActivity?.documents?.filter(
    (document) => document.url && isImageDocument(document)
  ) || []
  const currentImage = selectedImageDocuments[activeImageIndex]

  return (
    <>
      <aside
        aria-label="Activity this month"
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Activity this month
            </p>
            <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900">
              {formatDate(date, { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
            {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {activities.length ? (
          <ul className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {activities.map((activity) => {
              const isSelected = activity.date === dateKey(date)
              const activityLabel =
                activity.type === 'event'
                  ? 'Event'
                  : activity.type === 'expense'
                    ? 'Expense'
                    : 'Payment'
              const imageDocument = activity.documents?.find(
                (document) => document.url && isImageDocument(document)
              )
              const downloadableDocuments = activity.documents?.filter(
                (document) => !isImageDocument(document)
              ) || []
              return (
                <li key={activity.id}>
                  <div
                    className={`rounded-lg border p-3.5 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
                    }`}
                  >
                    <button
                      type="button"
                      title="Double-click to view activity details"
                      onClick={() => onSelectDate(parseProjectDate(activity.date))}
                      onDoubleClick={() => {
                        setActiveImageIndex(0)
                        setSelectedActivity(activity)
                      }}
                      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">
                            {activity.title}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-slate-600">
                            {formatDate(parseProjectDate(activity.date), {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                            {' · '}{activityLabel}
                            {activity.category ? ` · ${activity.category}` : ''}
                          </span>
                        </span>
                        {activity.status && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
                            {activity.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </span>
                      {(imageDocument || activity.description || activity.amount !== null) && (
                        <span className="mt-3 flex items-start gap-3">
                          {imageDocument && (
                            <img
                              src={imageDocument.url}
                              alt={`${activity.title} attachment`}
                              className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            {activity.description && (
                              <span className="line-clamp-3 block text-sm text-slate-600">
                                {activity.description}
                              </span>
                            )}
                            {activity.amount !== null && (
                              <span className={`block text-sm font-bold ${
                                activity.type === 'expense' ? 'text-amber-800' : 'text-blue-800'
                              } ${activity.description ? 'mt-2' : ''}`}>
                                {formatCurrency(activity.amount)}
                              </span>
                            )}
                          </span>
                        </span>
                      )}
                    </button>
                    {downloadableDocuments.length > 0 && (
                      <div className="mt-2 flex flex-wrap border-t border-slate-100 pt-2">
                        {downloadableDocuments.map((document) => (
                          <DocumentDownloadLink
                            key={document.id || document.name}
                            document={document}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
            No project activity recorded for this month.
          </p>
        )}
      </aside>

      {selectedActivity && (
        <Modal
          ariaLabelledBy="project-activity-details-title"
          ariaDescribedBy="project-activity-details-description"
          onClose={() => setSelectedActivity(null)}
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                Project {selectedActivity.type === 'event'
                  ? 'event'
                  : selectedActivity.type === 'expense'
                    ? 'expense'
                    : 'payment'}
              </p>
              <h2
                id="project-activity-details-title"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                {selectedActivity.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close activity details"
              onClick={() => setSelectedActivity(null)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div
            id="project-activity-details-description"
            className={`flex min-h-0 flex-1 ${
              selectedImageDocuments.length ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {currentImage && (
              <div className="w-2/5 shrink-0 space-y-3 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 sm:w-1/3 sm:p-6">
                <a
                  href={currentImage.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${currentImage.name}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <img
                    src={currentImage.url}
                    alt={currentImage.name}
                    className="max-h-64 w-full rounded-lg border border-slate-200 bg-white object-contain"
                  />
                </a>
                {selectedImageDocuments.length > 1 && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={() => setActiveImageIndex(
                        (activeImageIndex - 1 + selectedImageDocuments.length) %
                          selectedImageDocuments.length
                      )}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-white"
                    >
                      ‹
                    </button>
                    <span className="text-xs text-slate-600">
                      {activeImageIndex + 1} / {selectedImageDocuments.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={() => setActiveImageIndex(
                        (activeImageIndex + 1) % selectedImageDocuments.length
                      )}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-white"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
              <p className="text-sm text-slate-600">
                {formatDate(parseProjectDate(selectedActivity.date), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {selectedActivity.endDate &&
                selectedActivity.endDate !== selectedActivity.date
                  ? ` – ${formatDate(parseProjectDate(selectedActivity.endDate), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}`
                  : ''}
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Category', selectedActivity.category],
                  ['Status', selectedActivity.status?.replace(/_/g, ' ')],
                  ['Phase', selectedActivity.phase?.replace(/_/g, ' ')],
                  ['Priority', selectedActivity.priority],
                ].filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {selectedActivity.amount !== null && (
                <p className={`text-lg font-bold ${
                  selectedActivity.type === 'expense' ? 'text-amber-800' : 'text-blue-800'
                }`}>
                  {formatCurrency(selectedActivity.amount)}
                </p>
              )}
              {(selectedActivity.description || selectedActivity.documents?.length > 0) && (
                <div>
                  {selectedActivity.description && (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {selectedActivity.description}
                    </p>
                  )}
                  {selectedActivity.documents?.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedActivity.documents.filter(
                          (document) => !document.url || !isImageDocument(document)
                        ).map((document) => (
                          <DocumentDownloadLink
                            key={document.id || document.name}
                            document={document}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

const ActivityDetails = ({ date, activities, isWithinRange }) => {
  const dayActivities = activities.filter((activity) => activity.date === dateKey(date))

  return (
    <aside
      aria-label="Activity for selected day"
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Selected day
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900">
            {formatDate(date, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
        </div>
        {isWithinRange && dayActivities.length > 0 && (
          <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
            {dayActivities.length} {dayActivities.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {!isWithinRange ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
          This date is outside the project window. Activity is shown only between
          the project start and expected completion dates.
        </div>
      ) : dayActivities.length ? (
        <ul className="mt-4 space-y-3">
          {dayActivities.map((activity) => (
            <li
              key={activity.id}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3.5"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  activity.type === 'expense'
                    ? 'bg-amber-100 text-amber-800'
                    : activity.type === 'event'
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-blue-100 text-blue-800'
                }`}
              >
                {activity.type === 'expense' ? '−' : activity.type === 'event' ? '•' : '+'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{activity.title}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {activity.type === 'expense'
                    ? 'Expense'
                    : activity.type === 'event'
                      ? 'Event'
                      : 'Payment'}
                  {activity.category ? ` · ${activity.category}` : ''}
                  {activity.status ? ` · ${activity.status.replace(/_/g, ' ')}` : ''}
                </p>
                {activity.type === 'event' && (
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {activity.description && <p>{activity.description}</p>}
                    <p>
                      {activity.phase?.replace(/_/g, ' ') || 'Unspecified phase'} ·{' '}
                      {activity.priority?.toLowerCase() || 'normal'} priority
                      {activity.endDate !== activity.date
                        ? ` · through ${formatDate(parseProjectDate(activity.endDate), {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}`
                        : ''}
                    </p>
                    {activity.documents.length > 0 && (
                      <p>Documents: {activity.documents.map((document) => document.name).join(', ')}</p>
                    )}
                  </div>
                )}
                {activity.amount !== null && (
                  <p className={`mt-2 text-sm font-bold ${
                    activity.type === 'expense' ? 'text-amber-800' : 'text-blue-800'
                  }`}>
                    {formatCurrency(activity.amount)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No transactions recorded
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            There are no project transactions for this day.
          </p>
        </div>
      )}
    </aside>
  )
}

const ProjectTimeline = ({
  date,
  startDate,
  endDate,
  endDateLabel,
  isWithinRange,
}) => {
  const projectDays = differenceInDays(startDate, endDate)
  const selectedOffset = differenceInDays(startDate, date)
  const progress = projectDays === 0 ? 0 : (selectedOffset / projectDays) * 100
  const markerPosition = Math.max(1, Math.min(99, progress))

  return (
    <section
      aria-label="Project timeline"
      className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-bold text-slate-900">Progress window</h2>
        <p className="text-xs font-semibold text-slate-600">
          {isWithinRange
            ? `Day ${selectedOffset + 1} of ${projectDays + 1}`
            : 'Selected date is outside the project window'}
        </p>
      </div>
      <div className="relative mx-1 mt-4 h-2 rounded-full bg-slate-200">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full bg-blue-700"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-white bg-blue-800 shadow ring-1 ring-blue-800/20"
          style={{ left: `${markerPosition}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        <span>Start · {formatDate(startDate, { day: 'numeric', month: 'short' })}</span>
        <span>
          {endDateLabel} · {formatDate(endDate, { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </section>
  )
}

const MonthCalendar = ({
  date,
  startDate,
  endDate,
  activities,
  onSelectDate,
  onAddEvent,
}) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDayOffset = new Date(year, month, 1).getDay()
  const gridStart = addDays(new Date(year, month, 1), -firstDayOffset)
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekdays.map((day) => (
          <div
            key={day}
            className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:px-2 sm:py-3 sm:text-xs"
          >
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((calendarDate) => {
          const key = dateKey(calendarDate)
          const inRange = calendarDate >= startDate && calendarDate <= endDate
          const inMonth = calendarDate.getMonth() === month
          const dayActivities = activities.filter((activity) => activity.date === key)
          const selected = key === dateKey(date)

          return (
            <button
              key={key}
              type="button"
              disabled={!inRange}
              aria-label={`${formatDate(calendarDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}${
                dayActivities.length
                  ? `, activity: ${dayActivities.map((activity) => activity.title).join(', ')}`
                  : ''
              }`}
              aria-pressed={selected}
              title={inRange ? 'Double-click to add an event' : undefined}
              onClick={() => onSelectDate(calendarDate)}
              onDoubleClick={() => onAddEvent(calendarDate)}
              className={`group min-h-[4.75rem] min-w-0 border-b border-r border-slate-100 p-1.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-700 sm:min-h-[7.25rem] sm:p-2 ${
                !inRange
                  ? 'cursor-not-allowed bg-slate-50/70 text-slate-300'
                  : selected
                    ? 'bg-blue-50 ring-2 ring-inset ring-blue-700'
                    : 'bg-white text-slate-800 hover:bg-blue-50/60'
              } ${!inMonth && inRange ? 'text-slate-500' : ''} ${
                calendarDate.getDay() === 6 ? 'border-r-0' : ''
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm ${
                    selected ? 'bg-blue-700 text-white' : ''
                  }`}
                >
                  {calendarDate.getDate()}
                </span>
                {dayActivities.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-blue-800 sm:text-[10px]">
                    {dayActivities.length}
                  </span>
                )}
              </span>
              {dayActivities.slice(0, 1).map((activity) => (
                <span key={activity.id}>
                  <span
                    className={`mt-1.5 hidden min-w-0 items-center justify-between gap-1 truncate rounded px-1.5 py-1 text-[10px] font-semibold leading-tight sm:flex ${
                      activity.type === 'expense'
                        ? 'bg-amber-100 text-amber-950'
                        : activity.type === 'event'
                          ? 'bg-violet-100 text-violet-950'
                          : 'bg-blue-100 text-blue-950'
                    }`}
                  >
                    <span className="truncate">{activity.title}</span>
                    {activity.amount !== null && (
                      <span className="shrink-0">{formatCompactCurrency(activity.amount)}</span>
                    )}
                  </span>
                  <span
                    className={`mt-1 flex min-w-0 items-center gap-0.5 truncate rounded px-1 py-0.5 text-[8px] font-bold leading-tight sm:hidden ${
                      activity.type === 'expense'
                        ? 'bg-amber-100 text-amber-950'
                        : activity.type === 'event'
                          ? 'bg-violet-100 text-violet-950'
                          : 'bg-blue-100 text-blue-950'
                    }`}
                  >
                    <span aria-hidden="true" className="shrink-0">
                      {activity.type === 'expense' ? '−' : activity.type === 'event' ? '•' : '+'}
                    </span>
                    <span className="truncate">
                      {activity.amount !== null
                        ? formatCompactCurrency(activity.amount)
                        : activity.type === 'expense'
                          ? 'Expense'
                          : activity.type === 'event'
                            ? 'Event'
                            : 'Payment'}
                    </span>
                  </span>
                </span>
              ))}
              {dayActivities.length > 1 && (
                <span className="mt-1 hidden pl-1.5 text-[10px] font-medium text-slate-600 sm:block">
                  +{dayActivities.length - 1} more
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const YearCalendar = ({ date, startDate, endDate, activities, onSelectMonth }) => {
  const year = date.getFullYear()
  const yearIsInRange = year >= startDate.getFullYear() && year <= endDate.getFullYear()

  return (
    <div>
      {!yearIsInRange && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This year is outside the project window.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, month) => {
          const firstDay = new Date(year, month, 1)
          const lastDay = new Date(year, month + 1, 0)
          const monthStart = firstDay > startDate ? firstDay : startDate
          const monthEnd = lastDay < endDate ? lastDay : endDate
          const inRange = monthStart <= monthEnd
          const activityCount = activities.filter((activity) => {
            const eventDate = parseProjectDate(activity.date)
            return eventDate?.getFullYear() === year && eventDate.getMonth() === month
          }).length

          return (
            <button
              key={month}
              type="button"
              disabled={!inRange}
              aria-label={`${formatDate(firstDay, { month: 'long' })} ${year}${
                activityCount ? `, ${activityCount} activities` : ''
              }`}
              onClick={() => onSelectMonth(monthStart)}
              className={`min-h-28 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                inRange
                  ? 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                  : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-base font-bold text-slate-900">
                  {formatDate(firstDay, { month: 'long' })}
                </span>
                {activityCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-800">
                    {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                  </span>
                )}
              </span>
              <span className="mt-3 block text-xs text-slate-600">
                {inRange
                  ? `${formatDate(monthStart, { day: 'numeric', month: 'short' })} – ${formatDate(
                      monthEnd,
                      { day: 'numeric', month: 'short' }
                    )} · ${differenceInDays(monthStart, monthEnd) + 1} days in range`
                  : 'Outside project dates'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ProjectProgressPageView = ({
  project,
  transactions,
  isLoadingTransactions = false,
  isTransactionsError = false,
  events = EMPTY_EVENTS,
  isEventsError = false,
  onSaveEvent,
}) => {
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [createdProjectEvents, setCreatedProjectEvents] = useState([])
  const startDateValue = project?.start_date || project?.startDate
  const actualCompletionDateValue =
    project?.actual_completion_date || project?.actualCompletionDate
  const expectedCompletionDateValue =
    project?.expected_completion_date || project?.expectedCompletionDate
  const endDateValue = actualCompletionDateValue || expectedCompletionDateValue
  const endDateLabel = actualCompletionDateValue
    ? 'Actual completion'
    : 'Expected completion'
  const startDate = parseProjectDate(startDateValue)
  const endDate = parseProjectDate(endDateValue)
  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate)
  const activities = useMemo(
    () => createProjectActivities(
      transactions,
      startDateValue,
      endDateValue,
      [...events, ...createdProjectEvents].filter(
        (event, index, allEvents) =>
          allEvents.findIndex((candidate) => candidate.id === event.id) === index
      )
    ),
    [transactions, startDateValue, endDateValue, events, createdProjectEvents]
  )
  const initialDate = useMemo(() => {
    const firstActivity = activities[0] && parseProjectDate(activities[0].date)
    return firstActivity || parseProjectDate(startDateValue) || new Date()
  }, [activities, startDateValue])
  const [activeDate, setActiveDate] = useState(initialDate)
  const [activeView, setActiveView] = useState('Month')
  const activePeriod = activeView.toLowerCase()
  const monthActivities = useMemo(
    () => activities.filter((activity) => {
      const eventDate = parseProjectDate(activity.date)
      return eventDate?.getFullYear() === activeDate.getFullYear() &&
        eventDate.getMonth() === activeDate.getMonth()
    }),
    [activities, activeDate]
  )
  const openEventForm = (date) => {
    setEventDate(date ? dateKey(date) : '')
    setIsEventFormOpen(true)
  }

  useEffect(() => {
    setActiveDate(initialDate)
  }, [initialDate])

  const isActiveDateInRange =
    hasValidRange && activeDate >= startDate && activeDate <= endDate
  const previousDate = hasValidRange
    ? movePeriod(activeDate, activePeriod, -1)
    : null
  const nextDate = hasValidRange ? movePeriod(activeDate, activePeriod, 1) : null
  const canNavigatePrevious =
    hasValidRange &&
    isPeriodWithinRange(previousDate, activePeriod, startDate, endDate)
  const canNavigateNext =
    hasValidRange && isPeriodWithinRange(nextDate, activePeriod, startDate, endDate)

  return (
    <ProjectSectionLayout
      title="Project Progress"
      action={
        <button
          type="button"
          onClick={() => openEventForm()}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Add Events
        </button>
      }
    >
      {isEventFormOpen && (
        <AddProjectEventForm
          onClose={() => setIsEventFormOpen(false)}
          initialStartDate={eventDate}
          initialEndDate={eventDate}
          onAddEvent={async (event) => {
            const savedEvent = onSaveEvent ? await onSaveEvent(event) : event
            setCreatedProjectEvents((currentEvents) => [...currentEvents, savedEvent])
          }}
        />
      )}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Project window
            </p>
            {hasValidRange ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-800">
                    {formatDate(startDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    →
                  </span>
                  <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-800">
                    {formatDate(endDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Payments and expenses recorded for this project appear on their transaction dates.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Set the project start and completion dates to open the progress calendar.
              </p>
            )}
          </div>

          {hasValidRange && (
            <div
              aria-label="Calendar view"
              className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              {viewOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={activeView === option}
                  onClick={() => setActiveView(option)}
                  className={`min-h-9 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 ${
                    activeView === option
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {!hasValidRange ? (
          <div
            role="status"
            className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-xl font-bold text-blue-800"
            >
              {startDate && endDate ? '!' : '↗'}
            </span>
            <h2 className="mt-3 font-semibold text-slate-900">
              {startDate && endDate
                ? 'Check the project date range'
                : 'Project dates needed'}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
              {startDate && endDate
                ? 'The completion date is earlier than the start date. Update the project dates to use this calendar.'
                : 'A start date and completion date are needed to bound project activity.'}
            </p>
          </div>
        ) : (
          <>
            {isLoadingTransactions && (
              <p role="status" className="mt-5 text-sm text-slate-600">
                Loading project transactions…
              </p>
            )}
            {isTransactionsError && (
              <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Unable to load project transactions. Please try again.
              </p>
            )}
            {isEventsError && (
              <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Unable to load project events. Please try again.
              </p>
            )}
            {!isLoadingTransactions && !isTransactionsError && activities.length === 0 && (
              <p role="status" className="mt-5 text-sm text-slate-600">
                No project transactions with dates in the project window are available.
              </p>
            )}
            <ProjectTimeline
              date={activeDate}
              startDate={startDate}
              endDate={endDate}
              endDateLabel={endDateLabel}
              isWithinRange={isActiveDateInRange}
            />
            <div className="mt-6 flex items-center justify-between gap-3 border-y border-slate-100 py-3">
              <button
                type="button"
                aria-label={`Previous ${activePeriod}`}
                disabled={!canNavigatePrevious}
                onClick={() =>
                  setActiveDate((current) =>
                    clampDate(
                      movePeriod(current, activePeriod, -1),
                      startDate,
                      endDate
                    )
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <span aria-hidden="true" className="text-lg leading-none">←</span>
                <span className="hidden sm:inline">Previous</span>
              </button>
              <h2
                aria-live="polite"
                className="text-center text-base font-bold tracking-tight text-slate-900 sm:text-xl"
              >
                {getPeriodLabel(activeDate, activePeriod)}
              </h2>
              <button
                type="button"
                aria-label={`Next ${activePeriod}`}
                disabled={!canNavigateNext}
                onClick={() =>
                  setActiveDate((current) =>
                    clampDate(
                      movePeriod(current, activePeriod, 1),
                      startDate,
                      endDate
                    )
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <span className="hidden sm:inline">Next</span>
                <span aria-hidden="true" className="text-lg leading-none">→</span>
              </button>
            </div>

            <div
              className={`mt-4 grid items-start gap-4 xl:gap-5 ${
                activeView === 'Day'
                  ? 'grid-cols-1'
                  : 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_19rem]'
              }`}
            >
              {activeView === 'Month' && (
                <MonthCalendar
                  date={activeDate}
                  startDate={startDate}
                  endDate={endDate}
                  activities={activities}
                  onSelectDate={setActiveDate}
                  onAddEvent={(date) => {
                    setActiveDate(date)
                    openEventForm(date)
                  }}
                />
              )}
              {activeView === 'Year' && (
                <YearCalendar
                  date={activeDate}
                  startDate={startDate}
                  endDate={endDate}
                  activities={activities}
                  onSelectMonth={(firstDateInRange) => {
                    setActiveDate(firstDateInRange)
                    setActiveView('Month')
                  }}
                />
              )}
              {activeView === 'Month' ? (
                <MonthActivityDetails
                  date={activeDate}
                  activities={monthActivities}
                  onSelectDate={setActiveDate}
                />
              ) : (
                <ActivityDetails
                  date={activeDate}
                  activities={activities}
                  isWithinRange={isActiveDateInRange}
                />
              )}
            </div>
          </>
        )}
      </div>
    </ProjectSectionLayout>
  )
}

export default ProjectProgressPageView
