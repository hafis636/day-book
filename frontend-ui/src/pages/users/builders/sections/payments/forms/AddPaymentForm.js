import { useEffect, useRef, useState } from 'react'
import { useCreateProjectPaymentMutation } from '../../../../../../redux/services/users/usersApi'

const paymentMethods = [
  ['cash', 'Cash'],
  ['bank_transfer', 'Bank transfer'],
  ['upi', 'UPI'],
  ['cheque', 'Cheque'],
  ['card', 'Card'],
  ['other', 'Other'],
]

const paymentStatuses = [
  ['advance', 'Advance'],
  ['partially_paid', 'Partially paid'],
  ['completed', 'Completed'],
]

const inputClasses =
  'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'

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

const AddPaymentForm = ({ projectId, onClose }) => {
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const [submissionError, setSubmissionError] = useState('')
  const [createProjectPayment, { isLoading }] = useCreateProjectPaymentMutation()
  const isSavingRef = useRef(isLoading)
  isSavingRef.current = isLoading

  useEffect(() => {
    const previouslyFocusedElement = window.document.activeElement
    const previousBodyOverflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    titleRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isSavingRef.current) onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        )
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && window.document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && window.document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    window.document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [onClose])

  const submitPayment = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (isSavingRef.current) return
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    setSubmissionError('')
    const values = new FormData(form)
    const payment = Object.fromEntries(values.entries())
    payment.title = payment.title.trim()
    payment.amount = Number(payment.amount)
    payment.transaction_date = payment.transaction_date || null
    payment.description = payment.description.trim()
    payment.category = payment.category.trim()
    payment.party_name = payment.party_name.trim()
    payment.reference_number = payment.reference_number.trim()

    try {
      await createProjectPayment({ projectId, ...payment }).unwrap()
      onClose()
    } catch (error) {
      setSubmissionError(
        error?.data?.error || 'Unable to save the payment. Please try again.'
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (!isLoading && event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby="payment-modal-title"
        aria-describedby="payment-modal-description"
        aria-modal="true"
        className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Project payments
            </p>
            <h2
              id="payment-modal-title"
              ref={titleRef}
              tabIndex="-1"
              className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Add a payment
            </h2>
            <p id="payment-modal-description" className="mt-1.5 text-sm leading-5 text-slate-600">
              Record a payment for this project.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close add payment form"
            disabled={isLoading}
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-2xl leading-none">×</span>
          </button>
        </header>

        <form onSubmit={submitPayment} className="overflow-y-auto px-5 py-5 sm:px-7">
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
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="payment-amount" required>Amount (INR)</FieldLabel>
              <input
                className={inputClasses}
                id="payment-amount"
                min="0.01"
                name="amount"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </div>
            <div>
              <FieldLabel htmlFor="payment-date">Transaction date</FieldLabel>
              <input
                className={inputClasses}
                id="payment-date"
                name="transaction_date"
                type="date"
              />
            </div>
            <div>
              <FieldLabel htmlFor="payment-method" required>Payment method</FieldLabel>
              <select
                className={inputClasses}
                defaultValue=""
                id="payment-method"
                name="payment_method"
                required
              >
                <option disabled value="">Select a method</option>
                {paymentMethods.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="payment-status" required>Status</FieldLabel>
              <select
                className={inputClasses}
                defaultValue="advance"
                id="payment-status"
                name="status"
                required
              >
                {paymentStatuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="payment-category">Category</FieldLabel>
              <input
                className={inputClasses}
                id="payment-category"
                maxLength="100"
                name="category"
                placeholder="e.g. Materials"
              />
            </div>
            <div>
              <FieldLabel htmlFor="payment-party-name">Party name</FieldLabel>
              <input
                className={inputClasses}
                id="payment-party-name"
                maxLength="255"
                name="party_name"
                placeholder="Person or company"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="payment-reference">Reference number</FieldLabel>
              <input
                className={inputClasses}
                id="payment-reference"
                maxLength="255"
                name="reference_number"
                placeholder="Optional transaction or cheque reference"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="payment-description">Description</FieldLabel>
              <textarea
                className={`${inputClasses} min-h-24 resize-y`}
                id="payment-description"
                maxLength="5000"
                name="description"
                rows="3"
              />
            </div>
          </div>

          {submissionError && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
              {submissionError}
            </p>
          )}

          <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
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
              {isLoading ? 'Saving…' : 'Save payment'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default AddPaymentForm
