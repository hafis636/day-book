import { useEffect, useRef, useState } from 'react'
import Modal from '../../../../components/common/Modal'
import { useLazySearchLabourWorkersQuery } from '../../../../redux/services/users/usersApi'
import { validateLabourAssignment } from './validations/labourAssignmentValidation'
import ValidationSummary from './ValidationSummary'

const assignmentInputClasses =
  'mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 aria-invalid:border-red-500 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-600/20'

const initialAssignmentValues = {
  labourName: '',
  mobileNumber: '',
  email: '',
  workType: 'INDIVIDUAL',
  skillType: 'Mason',
  address: '',
  workDescription: '',
  startDate: '',
  expectedEndDate: '',
  rate: '',
  rateUnit: 'Per day',
  estimatedQuantity: '',
  comments: '',
}

const workTypes = ['INDIVIDUAL', 'CONTRACTOR', 'PART TIME']
const skillTypes = [
  'Mason',
  'Carpenter',
  'Electrician',
  'Painter',
  'Helper',
  'Tile worker',
  'Miscellaneous',
  'Others',
]

const getWorkType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')
  return workTypes.includes(normalized) ? normalized : 'INDIVIDUAL'
}

const getSkillType = (value) =>
  skillTypes.find(
    (skill) => skill.toLowerCase() === String(value || '').trim().toLowerCase()
  ) || 'Others'

const AssignmentField = ({ id, label, required = false, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
      {label}
      {required && (
        <span aria-hidden="true" className="ml-1 text-blue-700">
          *
        </span>
      )}
    </label>
    {children}
  </div>
)

const FieldErrors = ({ id, errors = [] }) =>
  errors.length > 0 ? (
    <div id={id}>
      {errors.map((error) => (
        <p key={error} className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ))}
    </div>
  ) : null

const LabourAssignmentForm = ({
  onClose,
  onSubmit,
  isSaving,
  submitError,
  projectStartDate,
  projectExpectedCompletionDate,
}) => {
  const firstFieldRef = useRef(null)
  const searchRequestRef = useRef(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [values, setValues] = useState(initialAssignmentValues)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [isApplicationUserRequested, setIsApplicationUserRequested] =
    useState(false)
  const [isMobileFocused, setIsMobileFocused] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [searchedName, setSearchedName] = useState('')
  const [searchError, setSearchError] = useState('')
  const [searchLabourWorkers] = useLazySearchLabourWorkersQuery()

  useEffect(() => {
    const name = values.labourName.trim()
    if (name.length < 3 || selectedWorker?.name === name) {
      setSearchResults([])
      setSearchedName('')
      setSearchError('')
      setIsSearching(false)
      return undefined
    }

    setSearchResults([])
    setSearchedName('')
    setSearchError('')
    const requestId = ++searchRequestRef.current
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const result = await searchLabourWorkers(name).unwrap()
        if (requestId === searchRequestRef.current) {
          setSearchResults(result.labourWorkers)
          setSearchedName(name)
          setActiveSuggestionIndex(-1)
        }
      } catch (error) {
        if (requestId === searchRequestRef.current) {
          setSearchError(
            error?.data?.error || 'Unable to search labour records. Please try again.'
          )
          setSearchedName(name)
        }
      } finally {
        if (requestId === searchRequestRef.current) setIsSearching(false)
      }
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      if (requestId === searchRequestRef.current) searchRequestRef.current += 1
    }
  }, [values.labourName, selectedWorker, searchLabourWorkers])

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  const selectWorker = (worker) => {
    setValues((current) => ({
      ...current,
      labourName: worker.name,
      mobileNumber: worker.mobile,
      email: worker.email || '',
      workType: getWorkType(worker.work_type),
      skillType: getSkillType(worker.skill_type),
      address: worker.address || '',
    }))
    setSelectedWorker(worker)
    setIsApplicationUserRequested(false)
    setSearchResults([])
    setSearchedName('')
    setActiveSuggestionIndex(-1)
    setSearchError('')
  }

  const submitAssignment = (event) => {
    event.preventDefault()
    if (isSaving) return
    setHasSubmitted(true)
    const labourName = values.labourName.trim()
    const mobileNumber = values.mobileNumber.trim()
    const startDate = values.startDate
    const expectedEndDate = values.expectedEndDate
    const errors = validateLabourAssignment(
      values,
      isApplicationUserRequested,
      projectStartDate,
      projectExpectedCompletionDate
    )
    if (Object.keys(errors).length > 0) return

    const assignment = {
      ...(selectedWorker ? { labourId: selectedWorker.id } : {}),
      labourName,
      mobileNumber,
      email: values.email.trim(),
      workType: values.workType,
      skillType: values.skillType,
      address: values.address.trim(),
      workDescription: values.workDescription.trim(),
      startDate,
      expectedEndDate,
      rate: Number(values.rate),
      rateUnit: values.rateUnit,
      estimatedQuantity: Number(values.estimatedQuantity),
      comments: values.comments.trim(),
    }

    onSubmit(assignment)
  }
  const validationErrors = hasSubmitted
    ? validateLabourAssignment(
        values,
        isApplicationUserRequested,
        projectStartDate,
        projectExpectedCompletionDate
      )
    : {}

  return (
    <Modal
      ariaLabelledBy="labour-assignment-title"
      ariaDescribedBy="labour-assignment-description"
      initialFocusRef={firstFieldRef}
      onClose={onClose}
      panelClassName="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
            Site allocation
          </p>
          <h2
            id="labour-assignment-title"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            tabIndex="-1"
          >
            Labour Assignment
          </h2>
          <p
            id="labour-assignment-description"
            className="mt-1.5 text-sm leading-5 text-slate-600"
          >
            Save a worker assignment to this project roster.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close labour assignment form"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-xl leading-none text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <form
        className="min-h-0 overflow-y-auto"
        noValidate
        onSubmit={submitAssignment}
      >
        <div className="space-y-5 px-5 py-5 sm:px-7">
          <p className="text-xs text-slate-500">
            Fields marked <span className="font-bold text-blue-700">*</span> are required.
          </p>
          {submitError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
              {submitError}
            </p>
          )}

          <section aria-labelledby="labour-details-heading">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-2.5">
              <span aria-hidden="true" className="h-5 w-1 bg-amber-500" />
              <h3 id="labour-details-heading" className="text-base font-bold text-slate-900">
                Labour details
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <AssignmentField id="labour-name" label="Labour name" required>
                <div className="relative">
                  <input
                    ref={firstFieldRef}
                    className={`${assignmentInputClasses} ${isSearching ? 'pr-10' : ''} ${validationErrors.labourName ? 'border-red-500' : ''}`}
                    id="labour-name"
                    name="labourName"
                    type="text"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={searchResults.length > 0}
                    aria-controls="labour-worker-options"
                    aria-activedescendant={
                      activeSuggestionIndex >= 0
                        ? `labour-worker-option-${activeSuggestionIndex}`
                        : undefined
                    }
                    aria-invalid={Boolean(validationErrors.labourName)}
                    aria-describedby={
                      validationErrors.labourName
                        ? 'labour-name-error'
                        : undefined
                    }
                    value={values.labourName}
                    onChange={(event) => {
                      const nextName = event.target.value
                      if (selectedWorker) {
                        setValues((current) => ({
                          ...initialAssignmentValues,
                          labourName: nextName,
                          workDescription: current.workDescription,
                          startDate: current.startDate,
                          expectedEndDate: current.expectedEndDate,
                          rate: current.rate,
                          rateUnit: current.rateUnit,
                          estimatedQuantity: current.estimatedQuantity,
                          comments: current.comments,
                        }))
                        setSelectedWorker(null)
                        setIsApplicationUserRequested(false)
                      } else {
                        updateField('labourName')(event)
                      }
                      setActiveSuggestionIndex(-1)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' && searchResults.length) {
                        event.preventDefault()
                        setActiveSuggestionIndex((index) =>
                          Math.min(index + 1, searchResults.length - 1)
                        )
                      } else if (event.key === 'ArrowUp' && searchResults.length) {
                        event.preventDefault()
                        setActiveSuggestionIndex((index) => Math.max(index - 1, 0))
                      } else if (
                        event.key === 'Enter' &&
                        activeSuggestionIndex >= 0
                      ) {
                        event.preventDefault()
                        selectWorker(searchResults[activeSuggestionIndex])
                      } else if (event.key === 'Escape' && searchResults.length) {
                        setSearchResults([])
                        setActiveSuggestionIndex(-1)
                      }
                    }}
                    required
                  />
                  {isSearching && (
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-7 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                    />
                  )}
                  {searchResults.length > 0 && (
                    <ul
                      id="labour-worker-options"
                      role="listbox"
                      aria-label="Available labour workers"
                      className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      {searchResults.map((worker, index) => (
                        <li key={worker.id} role="presentation">
                          <button
                            id={`labour-worker-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={activeSuggestionIndex === index}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectWorker(worker)}
                            className={`w-full px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                              activeSuggestionIndex === index
                                ? 'bg-blue-50'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-sm font-semibold text-slate-900">
                              {worker.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {[worker.mobile, worker.email].filter(Boolean).join(' · ')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {isSearching && (
                    <p className="mt-1 text-xs text-slate-500" role="status">
                      Searching available labour…
                    </p>
                  )}
                  {!isSearching &&
                    values.labourName.trim().length >= 3 &&
                    searchError && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {searchError}
                      </p>
                    )}
                  {!isSearching &&
                    values.labourName.trim().length >= 3 &&
                    searchedName === values.labourName.trim() &&
                    !searchError &&
                    searchResults.length === 0 && (
                      <p className="mt-1 text-xs text-slate-500" role="status">
                        No active labour records found. You can continue with a new entry.
                      </p>
                    )}
                </div>
                <FieldErrors
                  id="labour-name-error"
                  errors={validationErrors.labourName}
                />
              </AssignmentField>
              <AssignmentField id="labour-mobile" label="Mobile number" required>
                <input
                  className={`${assignmentInputClasses} read-only:bg-slate-100 read-only:text-slate-600 ${validationErrors.mobileNumber ? 'border-red-500' : ''}`}
                  id="labour-mobile"
                  name="mobileNumber"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  autoComplete="tel"
                  value={values.mobileNumber}
                  onChange={updateField('mobileNumber')}
                  onFocus={() => setIsMobileFocused(true)}
                  onBlur={() => setIsMobileFocused(false)}
                  readOnly={Boolean(selectedWorker)}
                  aria-invalid={Boolean(validationErrors.mobileNumber)}
                  aria-describedby={
                    validationErrors.mobileNumber
                      ? 'labour-mobile-error'
                      : undefined
                  }
                  required
                />
                <FieldErrors
                  id="labour-mobile-error"
                  errors={validationErrors.mobileNumber}
                />
              </AssignmentField>
              {((selectedWorker && selectedWorker.has_application_user !== true) ||
                (!selectedWorker &&
                  !isMobileFocused &&
                  values.mobileNumber.trim())) && (
                <label className="flex items-start gap-2.5 text-sm text-slate-700 sm:col-span-2">
                  <input
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                    type="checkbox"
                    checked={isApplicationUserRequested}
                    onChange={(event) =>
                      setIsApplicationUserRequested(event.target.checked)
                    }
                  />
                  <span>
                    Do you want to add this person as an application user?
                    <span className="mt-1 block text-xs text-slate-500">
                      This choice is not saved with the labour assignment.
                    </span>
                  </span>
                </label>
              )}
              <AssignmentField
                id="labour-email"
                label="Email"
                required={isApplicationUserRequested}
              >
                <input
                  className={`${assignmentInputClasses} ${validationErrors.email ? 'border-red-500' : ''}`}
                  id="labour-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={updateField('email')}
                  required={isApplicationUserRequested}
                  aria-invalid={Boolean(validationErrors.email)}
                  aria-describedby={
                    validationErrors.email ? 'labour-email-error' : undefined
                  }
                />
                <FieldErrors
                  id="labour-email-error"
                  errors={validationErrors.email}
                />
              </AssignmentField>
              <AssignmentField id="labour-work-type" label="Work type">
                <select
                  className={assignmentInputClasses}
                  id="labour-work-type"
                  name="workType"
                  value={values.workType}
                  onChange={updateField('workType')}
                >
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="CONTRACTOR">CONTRACTOR</option>
                  <option value="PART TIME">PART TIME</option>
                </select>
              </AssignmentField>
              <AssignmentField id="labour-skill-type" label="Skill type">
                <select
                  className={assignmentInputClasses}
                  id="labour-skill-type"
                  name="skillType"
                  value={values.skillType}
                  onChange={updateField('skillType')}
                >
                  {skillTypes.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </AssignmentField>
              <div className="sm:col-span-2">
                <AssignmentField id="labour-address" label="Address">
                  <textarea
                    className={`${assignmentInputClasses} min-h-20 resize-y`}
                    id="labour-address"
                    name="address"
                    rows="2"
                    autoComplete="street-address"
                    value={values.address}
                    onChange={updateField('address')}
                  />
                </AssignmentField>
              </div>
            </div>
          </section>

          <section aria-labelledby="work-details-heading">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-2.5">
              <span aria-hidden="true" className="h-5 w-1 bg-blue-700" />
              <h3 id="work-details-heading" className="text-base font-bold text-slate-900">
                Work details
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AssignmentField id="labour-work-description" label="Work description">
                  <textarea
                    className={`${assignmentInputClasses} min-h-20 resize-y`}
                    id="labour-work-description"
                    name="workDescription"
                    rows="2"
                    value={values.workDescription}
                    onChange={updateField('workDescription')}
                  />
                </AssignmentField>
              </div>
              <AssignmentField id="labour-start-date" label="Start date" required>
                <input
                  className={`${assignmentInputClasses} ${validationErrors.startDate ? 'border-red-500' : ''}`}
                  id="labour-start-date"
                  name="startDate"
                  type="date"
                  max={projectStartDate || undefined}
                  value={values.startDate}
                  onChange={updateField('startDate')}
                  aria-invalid={Boolean(validationErrors.startDate)}
                  aria-describedby={
                    validationErrors.startDate
                      ? 'labour-start-date-error'
                      : undefined
                  }
                  required
                />
                <FieldErrors
                  id="labour-start-date-error"
                  errors={validationErrors.startDate}
                />
              </AssignmentField>
              <AssignmentField id="labour-end-date" label="Expected end date">
                <input
                  className={`${assignmentInputClasses} ${validationErrors.expectedEndDate ? 'border-red-500' : ''}`}
                  id="labour-end-date"
                  name="expectedEndDate"
                  type="date"
                  max={projectExpectedCompletionDate || undefined}
                  value={values.expectedEndDate}
                  onChange={updateField('expectedEndDate')}
                  aria-invalid={Boolean(validationErrors.expectedEndDate)}
                  aria-describedby={
                    validationErrors.expectedEndDate
                      ? 'labour-end-date-error'
                      : undefined
                  }
                />
                <FieldErrors
                  id="labour-end-date-error"
                  errors={validationErrors.expectedEndDate}
                />
              </AssignmentField>
              <AssignmentField id="labour-rate" label="Rate" required>
                <input
                  className={`${assignmentInputClasses} ${validationErrors.rate ? 'border-red-500' : ''}`}
                  id="labour-rate"
                  name="rate"
                  type="number"
                  min="0"
                  step="any"
                  value={values.rate}
                  onChange={updateField('rate')}
                  aria-invalid={Boolean(validationErrors.rate)}
                  aria-describedby={
                    validationErrors.rate ? 'labour-rate-error' : undefined
                  }
                  required
                />
                <FieldErrors
                  id="labour-rate-error"
                  errors={validationErrors.rate}
                />
              </AssignmentField>
              <AssignmentField id="labour-rate-unit" label="Rate unit" required>
                <select
                  className={`${assignmentInputClasses} ${validationErrors.rateUnit ? 'border-red-500' : ''}`}
                  id="labour-rate-unit"
                  name="rateUnit"
                  value={values.rateUnit}
                  onChange={updateField('rateUnit')}
                  aria-invalid={Boolean(validationErrors.rateUnit)}
                  aria-describedby={
                    validationErrors.rateUnit
                      ? 'labour-rate-unit-error'
                      : undefined
                  }
                  required
                >
                  <option>Per day</option>
                  <option>Per hour</option>
                  <option>Per quantity</option>
                </select>
                <FieldErrors
                  id="labour-rate-unit-error"
                  errors={validationErrors.rateUnit}
                />
              </AssignmentField>
              <AssignmentField id="labour-estimated-quantity" label="Estimated quantity" required>
                <input
                  className={`${assignmentInputClasses} ${validationErrors.estimatedQuantity ? 'border-red-500' : ''}`}
                  id="labour-estimated-quantity"
                  name="estimatedQuantity"
                  type="number"
                  min="0.01"
                  step="any"
                  value={values.estimatedQuantity}
                  onChange={updateField('estimatedQuantity')}
                  aria-invalid={Boolean(validationErrors.estimatedQuantity)}
                  aria-describedby={
                    validationErrors.estimatedQuantity
                      ? 'labour-estimated-quantity-error'
                      : undefined
                  }
                  required
                />
                <FieldErrors
                  id="labour-estimated-quantity-error"
                  errors={validationErrors.estimatedQuantity}
                />
              </AssignmentField>
              <AssignmentField id="labour-comments" label="Comments">
                <textarea
                  className={`${assignmentInputClasses} min-h-20 resize-y`}
                  id="labour-comments"
                  name="comments"
                  rows="2"
                  value={values.comments}
                  onChange={updateField('comments')}
                />
              </AssignmentField>
            </div>
          </section>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <ValidationSummary show={Object.keys(validationErrors).length > 0} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving assignment…' : 'Add assignment'}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  )
}

export default LabourAssignmentForm
