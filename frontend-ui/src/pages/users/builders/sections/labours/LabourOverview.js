const formatRupees = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const Metric = ({ label, value, note, accent }) => (
  <article className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 left-0 w-1 ${accent}`}
    />
    <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
      {label}
    </p>
    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
      {value}
    </p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
  </article>
)

const LabourOverview = ({
  assignmentCount,
  activeAssignments,
  completedAssignments,
  estimatedAmount,
}) => (
  <section aria-label="Labour overview" className="mt-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Assignments"
        value={assignmentCount}
        note="Saved to this project"
        accent="bg-blue-700"
      />
      <Metric
        label="Active assignments"
        value={activeAssignments}
        note="Currently in progress"
        accent="bg-emerald-600"
      />
      <Metric
        label="Completed assignments"
        value={completedAssignments}
        note="Marked completed"
        accent="bg-amber-500"
      />
      <Metric
        label="Estimated value"
        value={formatRupees(estimatedAmount)}
        note="From saved rates and quantities"
        accent="bg-slate-700"
      />
    </div>
  </section>
)

export default LabourOverview
