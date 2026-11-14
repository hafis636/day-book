import { useRef, useState } from 'react'
import Modal from '../../../../components/common/Modal'
import {
  useCreateProjectPaymentMutation,
  useUpdateProjectPaymentMutation,
} from '../../../../redux/services/users/usersApi'
import { validatePayment } from './validations/paymentValidation'
import ValidationSummary from './ValidationSummary'

const paymentMethods = [
  ['cash', 'Cash'],
  ['bank_transfer', 'Bank transfer'],
  ['upi', 'UPI'],
  ['cheque', 'Cheque'],
  ['card', 'Card'],
  ['other', 'Other'],
]

const paymentStatuses = [
  ['pending', 'Pending'],
  ['overdue', 'Overdue'],
  ['advance', 'Advance'],
  ['partially_paid', 'Partially paid'],
  ['completed', 'Completed'],
]

const inputClasses =
  'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 aria-invalid:border-red-500 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-600/20'

const FieldLabel = ({ htmlFor, children, required = false }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
    {children}
    {required && (
      <span aria-hidden="true" className="ml-1 text-blue-700">
        *
      </span>
    )}
  </label>
)

const AddPaymentForm = ({
  projectId,
  payment,
  transactionType = 'income',
  validateTransaction = validatePayment,
  onClose,
}) => {
  const isExpense = (payment?.type || transactionType) === 'expense'
  const transactionLabel = isExpense ? 'expense' : 'payment'
  const sectionLabel = isExpense ? 'expenses' : 'payments'
  const titleRef = useRef(null)
  const [submissionError, setSubmissionError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [status, setStatus] = useState(payment?.status || 'advance')
  const [paymentMethod, setPaymentMethod] = useState(payment?.payment_method || '')
  const [createProjectPayment, { isLoading: isCreating }] =
    useCreateProjectPaymentMutation()
  const [updateProjectPayment, { isLoading: isUpdating }] =
    useUpdateProjectPaymentMutation()
  const isLoading = isCreating || isUpdating
  const isSavingRef = useRef(isLoading)
  isSavingRef.current = isLoading
  const isPendingOrOverdue = ['pending', 'overdue'].includes(status)

  const submitPayment = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (isSavingRef.current) return
    setSubmissionError('')
    const values = new FormData(form)
    const paymentDetails = Object.fromEntries(values.entries())
    const errors = validateTransaction(paymentDetails)
    setValidationErrors(errors)
    if (Object.keys(errors).length) return

    paymentDetails.type = payment?.type || transactionType
    const submittedIsPendingOrOverdue = ['pending', 'overdue'].includes(paymentDetails.status)
    paymentDetails.title = paymentDetails.title.trim()
    paymentDetails.amount = Number(paymentDetails.amount)
    paymentDetails.description = paymentDetails.description.trim()
    paymentDetails.category = paymentDetails.category.trim()
    paymentDetails.party_name = paymentDetails.party_name.trim()
    paymentDetails.transaction_date = paymentDetails.transaction_date || null
    paymentDetails.payment_method = submittedIsPendingOrOverdue
      ? null
      : paymentDetails.payment_method
    paymentDetails.reference_number = submittedIsPendingOrOverdue
      ? null
      : paymentDetails.reference_number.trim()

    try {
      if (payment?.id) {
        await updateProjectPayment({
          projectId,
          paymentId: payment.id,
          ...paymentDetails,
        }).unwrap()
      } else {
        await createProjectPayment({ projectId, ...paymentDetails }).unwrap()
      }
      onClose()
    } catch (error) {
      setSubmissionError(
        error?.data?.error || `Unable to ${payment?.id ? 'update' : 'save'} the ${transactionLabel}. Please try again.`
      )
    }
  }

  const clearFieldError = (fieldName) => {
    setValidationErrors((errors) => {
      if (!errors[fieldName]) return errors
      const nextErrors = { ...errors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  const handleStatusChange = (event) => {
    const nextStatus = event.target.value
    setStatus(nextStatus)
    setValidationErrors((errors) => {
      const nextErrors = { ...errors }
      delete nextErrors.status
      if (['pending', 'overdue'].includes(nextStatus)) {
        delete nextErrors.payment_method
      }
      return nextErrors
    })
  }

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value)
    clearFieldError('payment_method')
  }

  return (
    <Modal
      ariaLabelledBy="payment-modal-title"
      ariaDescribedBy="payment-modal-description"
      isDismissible={!isLoading}
      initialFocusRef={titleRef}
      onClose={onClose}
    >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Project {sectionLabel}
            </p>
            <h2
              id="payment-modal-title"
              ref={titleRef}
              tabIndex="-1"
              className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              {payment?.id
                ? `Edit ${transactionLabel}`
                : `Add ${isExpense ? 'an expense' : 'a payment'}`}
            </h2>
            <p id="payment-modal-description" className="mt-1.5 text-sm leading-5 text-slate-600">
              {payment?.id
                ? `Update this project ${transactionLabel}.`
                : `Record a ${transactionLabel} for this project.`}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Close add ${transactionLabel} form`}
            disabled={isLoading}
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-2xl leading-none">×</span>
          </button>
        </header>

        <form
          noValidate
          onSubmit={submitPayment}
          className="overflow-y-auto px-5 py-5 sm:px-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="payment-title" required>Title</FieldLabel>
              <input
                autoComplete="off"
                className={inputClasses}
                id="payment-title"
                maxLength="255"
                name="title"
                placeholder="e.g. Electrical work milestone"
                defaultValue={payment?.title || ''}
                required
                aria-invalid={Boolean(validationErrors.title)}
                aria-describedby={validationErrors.title ? 'payment-title-error' : undefined}
                onChange={() => clearFieldError('title')}
              />
              {validationErrors.title && (
                <p className="mt-2 text-sm text-red-700" id="payment-title-error" role="alert">
                  {validationErrors.title}
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="payment-amount" required>Amount (INR)</FieldLabel>
              <input
                className={inputClasses}
                id="payment-amount"
                min="0.01"
                name="amount"
                placeholder="0.00"
                defaultValue={payment?.amount ?? ''}
                required
                step="0.01"
                type="number"
                aria-invalid={Boolean(validationErrors.amount)}
                aria-describedby={
                  validationErrors.amount ? 'payment-amount-error' : undefined
                }
                onChange={() => clearFieldError('amount')}
              />
              {validationErrors.amount && (
                <p className="mt-2 text-sm text-red-700" id="payment-amount-error" role="alert">
                  {validationErrors.amount}
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="payment-status" required>Status</FieldLabel>
              <select
                className={inputClasses}
                id="payment-status"
                name="status"
                onChange={handleStatusChange}
                required
                value={status}
                aria-invalid={Boolean(validationErrors.status)}
                aria-describedby={
                  validationErrors.status ? 'payment-status-error' : undefined
                }
              >
                {paymentStatuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {validationErrors.status && (
                <p className="mt-2 text-sm text-red-700" id="payment-status-error" role="alert">
                  {validationErrors.status}
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="payment-date">
                {isPendingOrOverdue ? 'Due date' : 'Transaction date'}
              </FieldLabel>
              <input
                className={inputClasses}
                defaultValue={payment?.transaction_date?.slice(0, 10) || ''}
                id="payment-date"
                name="transaction_date"
                type="date"
                aria-invalid={Boolean(validationErrors.transaction_date)}
                aria-describedby={
                  validationErrors.transaction_date ? 'payment-date-error' : undefined
                }
                onChange={() => clearFieldError('transaction_date')}
              />
              {validationErrors.transaction_date && (
                <p className="mt-2 text-sm text-red-700" id="payment-date-error" role="alert">
                  {validationErrors.transaction_date}
                </p>
              )}
            </div>
            {!isPendingOrOverdue && (
              <>
                <div>
                  <FieldLabel htmlFor="payment-method" required>Payment method</FieldLabel>
                  <select
                    className={inputClasses}
                    onChange={handlePaymentMethodChange}
                    value={paymentMethod}
                    id="payment-method"
                    name="payment_method"
                    required
                    aria-invalid={Boolean(validationErrors.payment_method)}
                    aria-describedby={
                      validationErrors.payment_method
                        ? 'payment-method-error'
                        : undefined
                    }
                  >
                    <option disabled value="">Select a method</option>
                    {paymentMethods.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {validationErrors.payment_method && (
                    <p
                      className="mt-2 text-sm text-red-700"
                      id="payment-method-error"
                      role="alert"
                    >
                      {validationErrors.payment_method}
                    </p>
                  )}
                </div>
              </>
            )}
            <div>
              <FieldLabel htmlFor="payment-category">Category</FieldLabel>
              <input
                className={inputClasses}
                id="payment-category"
                maxLength="100"
                name="category"
                placeholder="e.g. Materials"
                defaultValue={payment?.category || ''}
                aria-invalid={Boolean(validationErrors.category)}
                aria-describedby={
                  validationErrors.category ? 'payment-category-error' : undefined
                }
                onChange={() => clearFieldError('category')}
              />
              {validationErrors.category && (
                <p className="mt-2 text-sm text-red-700" id="payment-category-error" role="alert">
                  {validationErrors.category}
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="payment-party-name" required>Party name</FieldLabel>
              <input
                className={inputClasses}
                id="payment-party-name"
                maxLength="255"
                name="party_name"
                placeholder="Person or company"
                defaultValue={payment?.party_name || ''}
                required
                aria-invalid={Boolean(validationErrors.party_name)}
                aria-describedby={
                  validationErrors.party_name ? 'payment-party-name-error' : undefined
                }
                onChange={() => clearFieldError('party_name')}
              />
              {validationErrors.party_name && (
                <p
                  className="mt-2 text-sm text-red-700"
                  id="payment-party-name-error"
                  role="alert"
                >
                  {validationErrors.party_name}
                </p>
              )}
            </div>
            {!isPendingOrOverdue && (
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="payment-reference">Reference number</FieldLabel>
                <input
                  className={inputClasses}
                  id="payment-reference"
                  maxLength="255"
                  name="reference_number"
                  placeholder="Optional transaction or cheque reference"
                  defaultValue={payment?.reference_number || ''}
                  aria-invalid={Boolean(validationErrors.reference_number)}
                  aria-describedby={
                    validationErrors.reference_number
                      ? 'payment-reference-error'
                      : undefined
                  }
                  onChange={() => clearFieldError('reference_number')}
                />
                {validationErrors.reference_number && (
                  <p
                    className="mt-2 text-sm text-red-700"
                    id="payment-reference-error"
                    role="alert"
                  >
                    {validationErrors.reference_number}
                  </p>
                )}
              </div>
            )}
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="payment-description">Description</FieldLabel>
              <textarea
                className={`${inputClasses} min-h-24 resize-y`}
                id="payment-description"
                maxLength="5000"
                name="description"
                rows="3"
                defaultValue={payment?.description || ''}
                aria-invalid={Boolean(validationErrors.description)}
                aria-describedby={
                  validationErrors.description ? 'payment-description-error' : undefined
                }
                onChange={() => clearFieldError('description')}
              />
              {validationErrors.description && (
                <p
                  className="mt-2 text-sm text-red-700"
                  id="payment-description-error"
                  role="alert"
                >
                  {validationErrors.description}
                </p>
              )}
            </div>
          </div>

          {submissionError && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
              {submissionError}
            </p>
          )}

          <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ValidationSummary show={Object.keys(validationErrors).length > 0} />
            <div className="flex justify-end gap-3">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading
                  ? payment?.id
                    ? 'Updating…'
                    : 'Saving…'
                  : payment?.id
                    ? `Update ${transactionLabel}`
                    : `Save ${transactionLabel}`}
              </button>
            </div>
          </footer>
        </form>
    </Modal>
  )
}

export default AddPaymentForm
