import { act, fireEvent, render, screen, within } from '@testing-library/react'
import LabourDetailsPageView from '../pages/users/builders/sections/labours/LabourDetailsPageView'

jest.mock('../redux/services/users/usersApi', () => ({
  useCreateProjectLabourAssignmentMutation: jest.fn(),
  useLazySearchLabourWorkersQuery: jest.fn(),
}))

const {
  useCreateProjectLabourAssignmentMutation,
  useLazySearchLabourWorkersQuery,
} = require('../redux/services/users/usersApi')

jest.mock('../pages/users/builders/sections/ProjectSectionLayout', () => ({
  __esModule: true,
  default: ({ title, action, children }) => (
    <section>
      <h1>{title}</h1>
      {action}
      {children}
    </section>
  ),
}))

let searchLabourWorkers
let createProjectLabourAssignment

beforeEach(() => {
  searchLabourWorkers = jest.fn(() => ({
    unwrap: () => Promise.resolve({ labourWorkers: [] }),
  }))
  useLazySearchLabourWorkersQuery.mockReturnValue([searchLabourWorkers])
  createProjectLabourAssignment = jest.fn((payload) => ({
    unwrap: () =>
      Promise.resolve({
        assignment: {
          id: 'assignment-1',
          project_id: payload.projectId,
          labour_id: payload.labourId || 'worker-1',
          work_type: payload.workType,
          labour_name: payload.labourName,
          skill_type: payload.skillType,
          work_description: payload.workDescription,
          start_date: payload.startDate,
          expected_end_date: payload.expectedEndDate || null,
          rate: payload.rate,
          rate_unit: payload.rateUnit,
          estimated_quantity: payload.estimatedQuantity,
          estimated_amount: payload.rate * payload.estimatedQuantity,
          status: 'ACTIVE',
        },
      }),
  }))
  useCreateProjectLabourAssignmentMutation.mockReturnValue([
    createProjectLabourAssignment,
    { isLoading: false, error: null, reset: jest.fn() },
  ])
})

afterEach(() => {
  jest.useRealTimers()
})

test('filters project labour assignments by search, type and status', () => {
  render(
    <LabourDetailsPageView
      projectId="project-1"
      project={{
        labour_assignments: [
          {
            id: 'assignment-1',
            labour_name: 'Ramesh Kumar',
            skill_type: 'Mason',
            work_type: 'INDIVIDUAL',
            work_description: 'Blockwork, level 2',
            start_date: '2026-11-18',
            expected_end_date: '2026-11-30',
            estimated_quantity: '18',
            rate_unit: 'Per quantity',
            estimated_amount: '12800',
            status: 'ACTIVE',
          },
          {
            id: 'assignment-2',
            labour_name: 'Apex Electricals',
            skill_type: 'Electrician',
            work_type: 'CONTRACTOR',
            work_description: 'Conduit installation',
            start_date: '2026-11-10',
            expected_end_date: '2026-11-20',
            estimated_quantity: '74',
            rate_unit: 'Per quantity',
            estimated_amount: '54000',
            status: 'COMPLETED',
          },
        ],
      }}
    />
  )

  const table = screen.getByRole('table')
  expect(within(table).getByText('Ramesh Kumar')).toBeInTheDocument()
  expect(within(table).getByText('Apex Electricals')).toBeInTheDocument()
  const rameshRow = within(table).getByText('Ramesh Kumar').closest('tr')
  expect(rameshRow).toHaveTextContent('Active')
  expect(rameshRow).toHaveTextContent('18 Nov 2026 – 30 Nov 2026')
  expect(rameshRow).toHaveTextContent('18 units')
  expect(rameshRow).toHaveTextContent('₹12,800')
  expect(within(screen.getByRole('region', { name: 'Labour overview' })).getByText('₹66,800')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Search labour roster'), {
    target: { value: 'Ramesh' },
  })

  expect(within(table).getByText('Ramesh Kumar')).toBeInTheDocument()
  expect(within(table).queryByText('Apex Electricals')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Search labour roster'), {
    target: { value: '' },
  })
  fireEvent.change(screen.getByLabelText('Filter by labour type'), {
    target: { value: 'Contractor' },
  })
  fireEvent.change(screen.getByLabelText('Filter by assignment status'), {
    target: { value: 'Completed' },
  })

  expect(within(table).getByText('Apex Electricals')).toBeInTheDocument()
  expect(within(table).queryByText('Ramesh Kumar')).not.toBeInTheDocument()
})

test('shows an empty roster when the project has no labour assignments', () => {
  render(<LabourDetailsPageView projectId="project-1" />)

  expect(screen.getAllByText('No labour assignments yet')).toHaveLength(2)
  expect(within(screen.getByRole('table')).queryByText('Ramesh Kumar')).not.toBeInTheDocument()
  const compactRoster = screen.getByRole('list', {
    name: 'Compact labour roster',
  })
  expect(within(compactRoster).getAllByRole('listitem')).toHaveLength(1)
})

test('opens and cancels the labour assignment dialog', () => {
  render(<LabourDetailsPageView projectId="project-1" />)

  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  expect(dialog).toBeInTheDocument()
  expect(within(dialog).getByRole('heading', { name: 'Labour details' })).toBeInTheDocument()
  expect(within(dialog).getByRole('heading', { name: 'Work details' })).toBeInTheDocument()
  expect(within(dialog).getByLabelText(/^Labour name/)).toHaveFocus()

  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('shows every field error and submits after all required values are fixed', async () => {
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  expect(within(dialog).getByLabelText(/^Labour name/)).toBeRequired()
  expect(within(dialog).getByLabelText(/^Mobile number/)).toBeRequired()
  expect(within(dialog).getByLabelText(/^Start date/)).toBeRequired()
  expect(within(dialog).getByRole('spinbutton', { name: 'Rate' })).toBeRequired()
  expect(within(dialog).getByLabelText(/^Rate unit/)).toBeRequired()
  expect(within(dialog).getByLabelText(/^Estimated quantity/)).toBeRequired()

  fireEvent.submit(within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form'))

  expect(within(dialog).getByText('Enter a labour name.')).toBeInTheDocument()
  expect(within(dialog).getByText('Enter a mobile number.')).toBeInTheDocument()
  expect(within(dialog).getByText('Select a start date.')).toBeInTheDocument()
  expect(within(dialog).getByText('Enter a rate.')).toBeInTheDocument()
  expect(
    within(dialog).getByText('Enter an estimated quantity.')
  ).toBeInTheDocument()
  expect(
    within(dialog).getByText(
      'There are items that require your attention!!'
    )
  ).toHaveAttribute('role', 'alert')
  expect(within(dialog).queryByText('Enter a labour name to continue.')).not.toBeInTheDocument()
  expect(createProjectLabourAssignment).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Labour Assignment' })).toBeInTheDocument()

  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Mobile number/), {
    target: { value: '9876543210' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Start date/), {
    target: { value: '2026-11-20' },
  })
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Rate' }), {
    target: { value: '300' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Estimated quantity/), {
    target: { value: '1' },
  })
  await act(async () => {
    fireEvent.submit(
      within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
    )
    await Promise.resolve()
  })

  expect(createProjectLabourAssignment).toHaveBeenCalledTimes(1)
})

test('validates end date ordering before saving an assignment', () => {
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Mobile number/), {
    target: { value: '9876543210' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Start date/), {
    target: { value: '2026-11-20' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Expected end date/), {
    target: { value: '2026-11-19' },
  })

  fireEvent.submit(within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form'))

  expect(
    within(dialog).getByText(
      'Expected end date must be on or after the start date.'
    )
  ).toBeInTheDocument()
  expect(within(dialog).getByLabelText(/^Expected end date/)).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(within(screen.getByRole('table')).queryByText('Asha Patel')).not.toBeInTheDocument()
})

test('keeps assignment dates within the project dates', () => {
  render(
    <LabourDetailsPageView
      projectId="project-1"
      project={{
        start_date: '2026-11-20',
        expected_completion_date: '2026-12-31',
      }}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  const startDate = within(dialog).getByLabelText(/^Start date/)
  const expectedEndDate = within(dialog).getByLabelText(/^Expected end date/)
  expect(startDate).toHaveAttribute('max', '2026-11-20')
  expect(expectedEndDate).toHaveAttribute('max', '2026-12-31')

  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Mobile number/), {
    target: { value: '9876543210' },
  })
  fireEvent.change(startDate, { target: { value: '2026-11-21' } })
  fireEvent.submit(
    within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
  )

  expect(
    within(dialog).getByText(
      'Start date must be on or before the project start date.'
    )
  ).toBeInTheDocument()
  expect(startDate).toHaveAttribute('aria-invalid', 'true')

  fireEvent.change(startDate, { target: { value: '2026-11-20' } })
  fireEvent.change(expectedEndDate, { target: { value: '2027-01-01' } })
  fireEvent.submit(
    within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
  )

  expect(
    within(dialog).getByText(
      'Expected end date must be on or before the project expected completion date.'
    )
  ).toBeInTheDocument()
  expect(expectedEndDate).toHaveAttribute('aria-invalid', 'true')
  expect(createProjectLabourAssignment).not.toHaveBeenCalled()
})

test('rejects invalid 10-digit mobile numbers before saving an assignment', () => {
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  const mobileInput = within(dialog).getByLabelText(/^Mobile number/)
  expect(mobileInput).toHaveAttribute('pattern', '[6-9][0-9]{9}')
  fireEvent.change(mobileInput, { target: { value: '1234567890' } })
  fireEvent.change(within(dialog).getByLabelText(/^Start date/), {
    target: { value: '2026-11-20' },
  })

  fireEvent.submit(within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form'))

  expect(
    within(dialog).getByText('Enter a valid 10-digit mobile number.')
  ).toBeInTheDocument()
  expect(createProjectLabourAssignment).not.toHaveBeenCalled()
})

test('requires email when adding a person as an application user', () => {
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  const mobileInput = within(dialog).getByLabelText(/^Mobile number/)
  fireEvent.change(mobileInput, { target: { value: '9876543210' } })
  fireEvent.blur(mobileInput)
  fireEvent.click(
    within(dialog).getByLabelText(/Do you want to add this person as an application user/)
  )

  const emailInput = within(dialog).getByLabelText(/^Email/)
  expect(emailInput).toBeRequired()
  fireEvent.submit(
    within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
  )

  expect(
    within(dialog).getByText(
      'Enter an email address to add this person as an application user.'
    )
  ).toBeInTheDocument()
  expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  expect(createProjectLabourAssignment).not.toHaveBeenCalled()
})

test('persists and displays an assignment without a local-draft label', async () => {
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Asha Patel' },
  })
  const mobileInput = within(dialog).getByLabelText(/^Mobile number/)
  fireEvent.focus(mobileInput)
  fireEvent.change(mobileInput, {
    target: { value: '9876543210' },
  })
  expect(
    within(dialog).queryByLabelText(/add this person as an application user/i)
  ).not.toBeInTheDocument()
  fireEvent.blur(mobileInput)
  const mobileField = within(dialog)
    .getByLabelText(/^Mobile number/)
    .closest('div')
  const applicationUserCheckbox = within(dialog).getByLabelText(
    /add this person as an application user/i
  )
  expect(applicationUserCheckbox).toBeInTheDocument()
  expect(mobileField.nextElementSibling).toBe(
    applicationUserCheckbox.closest('label')
  )
  fireEvent.click(applicationUserCheckbox)
  fireEvent.change(within(dialog).getByLabelText(/^Email/), {
    target: { value: 'asha@example.test' },
  })
  fireEvent.change(within(dialog).getByLabelText('Work type'), {
    target: { value: 'CONTRACTOR' },
  })
  fireEvent.change(within(dialog).getByLabelText('Skill type'), {
    target: { value: 'Carpenter' },
  })
  fireEvent.change(within(dialog).getByLabelText('Address'), {
    target: { value: '18 Market Road' },
  })
  fireEvent.change(within(dialog).getByLabelText('Work description'), {
    target: { value: 'Door frame installation' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Start date/), {
    target: { value: '2026-11-20' },
  })
  fireEvent.change(within(dialog).getByLabelText('Expected end date'), {
    target: { value: '2026-11-24' },
  })
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Rate' }), {
    target: { value: '300' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Rate unit/), {
    target: { value: 'Per quantity' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Estimated quantity/), {
    target: { value: '20' },
  })
  fireEvent.change(within(dialog).getByLabelText('Comments'), {
    target: { value: 'Use treated wood' },
  })

  await act(async () => {
    fireEvent.submit(
      within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
    )
    await Promise.resolve()
  })

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(createProjectLabourAssignment).toHaveBeenCalledWith({
    projectId: 'project-1',
    labourName: 'Asha Patel',
    mobileNumber: '9876543210',
    email: 'asha@example.test',
    workType: 'CONTRACTOR',
    skillType: 'Carpenter',
    address: '18 Market Road',
    workDescription: 'Door frame installation',
    startDate: '2026-11-20',
    expectedEndDate: '2026-11-24',
    rate: 300,
    rateUnit: 'Per quantity',
    estimatedQuantity: 20,
    comments: 'Use treated wood',
  })
  const table = screen.getByRole('table')
  const newRow = within(table).getByText('Asha Patel').closest('tr')
  expect(within(newRow).getByText('Contractor')).toBeInTheDocument()
  expect(within(newRow).getByText('Door frame installation')).toBeInTheDocument()
  expect(within(newRow).getByText('Carpenter · Assigned')).toBeInTheDocument()
  expect(within(newRow).getByText('₹6,000')).toBeInTheDocument()
  expect(within(newRow).queryByText(/local draft/i)).not.toBeInTheDocument()
})

test('loads persisted assignments into the roster totals', () => {
  render(
    <LabourDetailsPageView
      projectId="project-1"
      project={{
        labour_assignments: [
          {
            id: 'persisted-assignment',
            labour_name: 'Nita Rao',
            skill_type: 'Painter',
            work_type: 'INDIVIDUAL',
            work_description: 'Paint stairwell',
            start_date: '2026-11-18',
            expected_end_date: '2026-11-18',
            rate: '250',
            rate_unit: 'Per quantity',
            estimated_quantity: '5',
            estimated_amount: '1250',
            status: 'ACTIVE',
          },
        ],
      }}
    />
  )

  const row = within(screen.getByRole('table')).getByText('Nita Rao').closest('tr')
  expect(within(row).getByText('Paint stairwell')).toBeInTheDocument()
  expect(within(row).getByText('₹1,250')).toBeInTheDocument()
  expect(within(row).queryByText(/local draft/i)).not.toBeInTheDocument()
})

test('keeps the form open and shows the API failure message', async () => {
  createProjectLabourAssignment.mockImplementationOnce(() => ({
    unwrap: () => Promise.reject({ data: { error: 'Project not found' } }),
  }))
  render(<LabourDetailsPageView projectId="project-1" />)
  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))

  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'New Worker' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Mobile number/), {
    target: { value: '9876543210' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Start date/), {
    target: { value: '2026-11-20' },
  })
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Rate' }), {
    target: { value: '0' },
  })
  fireEvent.change(within(dialog).getByLabelText(/^Estimated quantity/), {
    target: { value: '1' },
  })
  fireEvent.submit(
    within(dialog).getByRole('button', { name: 'Add assignment' }).closest('form')
  )

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Project not found'
  )
  expect(screen.getByRole('dialog', { name: 'Labour Assignment' })).toBeInTheDocument()
})

test('debounces labour lookup and fills selected worker details with mobile read-only', async () => {
  const worker = {
    id: 'labour-1',
    name: 'Ravi Kumar',
    mobile: '9876543210',
    email: 'ravi@example.test',
    work_type: 'CONTRACTOR',
    skill_type: 'Carpenter',
    address: '12 Site Road',
    user_id: 'user-1',
    has_application_user: true,
  }
  searchLabourWorkers.mockReturnValue({
    unwrap: () => Promise.resolve({ labourWorkers: [worker] }),
  })
  jest.useFakeTimers()
  render(<LabourDetailsPageView projectId="project-1" />)

  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))
  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  const nameInput = within(dialog).getByLabelText(/^Labour name/)
  fireEvent.change(nameInput, { target: { value: 'Rav' } })

  await act(async () => {
    jest.advanceTimersByTime(999)
  })
  expect(searchLabourWorkers).not.toHaveBeenCalled()

  await act(async () => {
    jest.advanceTimersByTime(1)
    await Promise.resolve()
    await Promise.resolve()
  })
  expect(searchLabourWorkers).toHaveBeenCalledWith('Rav')

  fireEvent.click(within(dialog).getByRole('option', { name: /Ravi Kumar/ }))
  const mobileInput = within(dialog).getByLabelText(/^Mobile number/)
  expect(nameInput).toHaveValue('Ravi Kumar')
  expect(mobileInput).toHaveValue('9876543210')
  expect(mobileInput).toHaveAttribute('readonly')
  expect(within(dialog).queryByText(/Existing labour selected/)).not.toBeInTheDocument()
  expect(nameInput.closest('.grid-cols-1')).toBe(
    mobileInput.closest('.grid-cols-1')
  )
  expect(within(dialog).getByLabelText('Email')).toHaveValue('ravi@example.test')
  expect(within(dialog).getByLabelText('Work type')).toHaveValue('CONTRACTOR')
  expect(within(dialog).getByLabelText('Skill type')).toHaveValue('Carpenter')
  expect(within(dialog).getByLabelText('Address')).toHaveValue('12 Site Road')
  expect(
    within(dialog).queryByLabelText(/add this person as an application user/i)
  ).not.toBeInTheDocument()
})

test('shows application-user checkbox for selected labour without a valid user account', async () => {
  const worker = {
    id: 'labour-2',
    name: 'Ravi Kumar',
    mobile: '9876543210',
    work_type: 'INDIVIDUAL',
    skill_type: 'Mason',
    user_id: 'missing-user-id',
    has_application_user: false,
  }
  searchLabourWorkers.mockReturnValue({
    unwrap: () => Promise.resolve({ labourWorkers: [worker] }),
  })
  jest.useFakeTimers()
  render(<LabourDetailsPageView projectId="project-1" />)

  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))
  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Rav' },
  })
  await act(async () => {
    jest.advanceTimersByTime(1000)
    await Promise.resolve()
    await Promise.resolve()
  })
  fireEvent.click(within(dialog).getByRole('option', { name: /Ravi Kumar/ }))

  expect(
    within(dialog).getByLabelText(/add this person as an application user/i)
  ).toBeInTheDocument()
})

test('shows a spinner while the labour lookup is pending and removes it when resolved', async () => {
  let resolveSearch
  searchLabourWorkers.mockReturnValue({
    unwrap: () =>
      new Promise((resolve) => {
        resolveSearch = resolve
      }),
  })
  jest.useFakeTimers()
  render(<LabourDetailsPageView projectId="project-1" />)

  fireEvent.click(screen.getByRole('button', { name: 'Labour Assignment' }))
  const dialog = screen.getByRole('dialog', { name: 'Labour Assignment' })
  fireEvent.change(within(dialog).getByLabelText(/^Labour name/), {
    target: { value: 'Rav' },
  })

  await act(async () => {
    jest.advanceTimersByTime(1000)
    await Promise.resolve()
  })

  expect(searchLabourWorkers).toHaveBeenCalledWith('Rav')
  expect(within(dialog).getByText('Searching available labour…')).toBeInTheDocument()
  expect(dialog.querySelector('[aria-hidden="true"].animate-spin')).toBeInTheDocument()

  await act(async () => {
    resolveSearch({ labourWorkers: [] })
  })

  expect(dialog.querySelector('[aria-hidden="true"].animate-spin')).not.toBeInTheDocument()
  expect(within(dialog).getByText(
    'No active labour records found. You can continue with a new entry.'
  )).toBeInTheDocument()
})
