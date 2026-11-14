import { useState } from 'react'
import {
  useCreateProjectLabourAssignmentMutation,
} from '../../../../../redux/services/users/usersApi'
import ProjectSectionLayout from '../ProjectSectionLayout'
import LabourAssignmentForm from '../../forms/LabourAssignmentForm'
import LabourOverview from './LabourOverview'
import LabourRoster from './LabourRoster'

const dailyRecords = [
  {
    date: '13 Nov',
    dateTime: '2026-11-13',
    name: 'Shakti Labour Co.',
    attendance: '8 present · 8 hrs',
    work: 'Column shuttering',
    quantity: '2 columns',
  },
  {
    date: '13 Nov',
    dateTime: '2026-11-13',
    name: 'Ramesh Kumar',
    attendance: 'Present · 8 hrs',
    work: 'Blockwork, level 2',
    quantity: '4.5 m²',
  },
  {
    date: '12 Nov',
    dateTime: '2026-11-12',
    name: 'Rebar crew',
    attendance: '6 present · 9 hrs',
    work: 'Footing reinforcement',
    quantity: '280 kg',
  },
]

const formatRupees = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const workTypes = ['INDIVIDUAL', 'CONTRACTOR', 'PART TIME']

const getWorkType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')
  return workTypes.includes(normalized) ? normalized : 'INDIVIDUAL'
}

const getDateValue = (date) =>
  typeof date === 'string'
    ? date.slice(0, 10)
    : date?.toISOString?.().slice(0, 10) || ''

const toRosterEntry = (assignment) => {
  const quantity =
    assignment.estimated_quantity === null ||
    assignment.estimated_quantity === undefined ||
    assignment.estimated_quantity === ''
      ? null
      : Number(assignment.estimated_quantity)
  const amount =
    assignment.estimated_amount === null ||
    assignment.estimated_amount === undefined ||
    assignment.estimated_amount === ''
      ? null
      : Number(assignment.estimated_amount)
  const rate =
    assignment.rate === null ||
    assignment.rate === undefined ||
    assignment.rate === ''
      ? null
      : Number(assignment.rate)
  const rateUnit = String(assignment.rate_unit || '').toLowerCase()
  const unitLabel = rateUnit.includes('day')
    ? 'days'
    : rateUnit.includes('hour')
      ? 'hours'
      : 'units'
  const workType = getWorkType(assignment.work_type)
  const type =
    workType === 'CONTRACTOR'
      ? 'Contractor'
      : workType === 'PART TIME'
        ? 'Crew'
        : 'Individual'
  const rawStatus = String(assignment.status || '').trim().toLowerCase()
  const status = rawStatus
    ? rawStatus.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Unknown'
  const calculatedAmount =
    Number.isFinite(rate) && Number.isFinite(quantity) ? rate * quantity : null

  return {
    id: assignment.id,
    name: assignment.labour_name || assignment.name || 'Labour worker',
    detail: `${assignment.skill_type || 'Labour'} · Assigned`,
    type,
    assignment:
      assignment.work_description ||
      `${assignment.skill_type || 'Labour'} assignment`,
    status,
    startDate: getDateValue(assignment.start_date),
    expectedEndDate: getDateValue(assignment.expected_end_date),
    quantity:
      Number.isFinite(quantity) && quantity > 0
        ? `${new Intl.NumberFormat('en-IN').format(quantity)} ${unitLabel}`
        : '—',
    estimatedAmount: Number.isFinite(amount)
      ? amount
      : calculatedAmount,
  }
}

const LabourDetailsPageView = ({ projectId, project }) => {
  const projectStartDate = project?.start_date || project?.startDate
  const projectExpectedCompletionDate =
    project?.expected_completion_date || project?.expectedCompletionDate
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
  const [submittedAssignments, setSubmittedAssignments] = useState([])
  const [submissionError, setSubmissionError] = useState('')
  const [createProjectLabourAssignment, createAssignmentState] =
    useCreateProjectLabourAssignmentMutation()
  const isSaving = createAssignmentState.isLoading
  const assignmentError = submissionError || (createAssignmentState.error?.data?.error
    ? createAssignmentState.error.data.error
    : createAssignmentState.error
      ? 'Unable to save this labour assignment. Please try again.'
      : '')
  const persistedAssignments = project?.labour_assignments || []
  const persistedIds = new Set(persistedAssignments.map(({ id }) => id))
  const rosterEntries = [
    ...persistedAssignments.map(toRosterEntry),
    ...submittedAssignments
      .filter(
        ({ id, project_id: assignmentProjectId }) =>
          assignmentProjectId === projectId && !persistedIds.has(id)
      )
      .map(toRosterEntry),
  ]
  const activeAssignments = rosterEntries.filter(
    (entry) => entry.status.toLowerCase() === 'active'
  ).length
  const completedAssignments = rosterEntries.filter(
    (entry) => entry.status.toLowerCase() === 'completed'
  ).length
  const estimatedAmountTotal = rosterEntries.reduce(
    (total, entry) => total + (entry.estimatedAmount || 0),
    0
  )
  const payableTotal = 225200
  const paidTotal = 157600
  const dueTotal = payableTotal - paidTotal
  const paymentBreakdown = [
    { label: 'Advances issued', amount: 32000 },
    { label: 'Wages paid', amount: 89600 },
    { label: 'Partial payments', amount: 36000 },
    { label: 'Final payments', amount: 0 },
  ]

  const addAssignment = async (assignment) => {
    setSubmissionError('')
    try {
      const result = await createProjectLabourAssignment({
        projectId,
        ...assignment,
      }).unwrap()
      if (result?.assignment) {
        setSubmittedAssignments((current) =>
          current.some(({ id }) => id === result.assignment.id)
            ? current
            : [result.assignment, ...current]
        )
      }
      setIsAssignmentOpen(false)
    } catch (error) {
      setSubmissionError(
        error?.data?.error ||
          'Unable to save this labour assignment. Please try again.'
      )
    }
  }

  const assignmentAction = (
    <button
      type="button"
      onClick={() => {
        createAssignmentState.reset?.()
        setSubmissionError('')
        setIsAssignmentOpen(true)
      }}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className="text-lg leading-none">+</span>
      Labour Assignment
    </button>
  )

  return (
    <ProjectSectionLayout title="Labour Details" action={assignmentAction}>
      <div className="mt-2">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-slate-600">
              Review project labour assignments and their estimated costs.
            </p>
          </div>
        </div>

        <LabourOverview
          assignmentCount={rosterEntries.length}
          activeAssignments={activeAssignments}
          completedAssignments={completedAssignments}
          estimatedAmount={estimatedAmountTotal}
        />

        <LabourRoster entries={rosterEntries} />

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section
            aria-labelledby="daily-records-heading"
            className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                Field log
              </p>
              <h2
                id="daily-records-heading"
                className="mt-1 text-lg font-bold tracking-tight text-slate-900"
              >
                Recent daily records
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {dailyRecords.map((record) => (
                <article
                  key={`${record.date}-${record.name}`}
                  className="grid grid-cols-[52px_1fr] gap-x-3 px-4 py-4 sm:grid-cols-[60px_1fr_auto] sm:items-center sm:px-5"
                >
                  <time
                    dateTime={record.dateTime}
                    className="pt-0.5 text-xs font-semibold tabular-nums text-slate-500"
                  >
                    {record.date}
                  </time>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {record.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.attendance}
                    </p>
                  </div>
                  <div className="col-start-2 mt-2 sm:col-start-auto sm:mt-0 sm:text-right">
                    <p className="text-xs font-medium text-slate-700">
                      {record.work}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {record.quantity} measured
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-5">
              Sample attendance, hours and measured quantities
            </p>
          </section>

          <section
            aria-labelledby="payment-summary-heading"
            className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                Cost position
              </p>
              <h2
                id="payment-summary-heading"
                className="mt-1 text-lg font-bold tracking-tight text-slate-900"
              >
                Labour payments
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
              <div className="min-w-0 px-3 py-4 sm:px-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Payable
                </p>
                <p className="mt-2 text-base font-bold tabular-nums text-slate-900 sm:text-lg">
                  {formatRupees(payableTotal)}
                </p>
              </div>
              <div className="min-w-0 px-3 py-4 sm:px-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Paid
                </p>
                <p className="mt-2 text-base font-bold tabular-nums text-emerald-700 sm:text-lg">
                  {formatRupees(paidTotal)}
                </p>
              </div>
              <div className="min-w-0 px-3 py-4 sm:px-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Due
                </p>
                <p className="mt-2 text-base font-bold tabular-nums text-amber-800 sm:text-lg">
                  {formatRupees(dueTotal)}
                </p>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Payment breakdown
              </h3>
              <dl className="mt-3 space-y-3">
                {paymentBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <dt className="text-slate-600">{item.label}</dt>
                    <dd className="font-semibold tabular-nums text-slate-800">
                      {formatRupees(item.amount)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
              Demo figures only; no payment records are created or changed here.
            </p>
          </section>
        </div>
      </div>
      {isAssignmentOpen && (
        <LabourAssignmentForm
          onClose={() => setIsAssignmentOpen(false)}
          onSubmit={addAssignment}
          isSaving={isSaving}
          submitError={assignmentError}
          projectStartDate={projectStartDate}
          projectExpectedCompletionDate={projectExpectedCompletionDate}
        />
      )}
    </ProjectSectionLayout>
  )
}

export default LabourDetailsPageView
