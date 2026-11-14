const ValidationSummary = ({ show }) =>
  show ? (
    <p
      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-bold text-red-800"
      role="alert"
    >
      There are items that require your attention!!
    </p>
  ) : null

export default ValidationSummary
