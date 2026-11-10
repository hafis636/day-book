import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectProgressPage from '../pages/users/builders/sections/progress/ProjectProgressPage'
import ProjectProgressPageView from '../pages/users/builders/sections/progress/ProjectProgressPageView'

const mockCreateProjectEvent = jest.fn()

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => ({ data: undefined }),
  useCreateProjectEventMutation: () => [mockCreateProjectEvent],
}))

const renderProgress = (project, props = {}) =>
  render(
    <MemoryRouter>
      <ProjectProgressPageView
        project={project}
        canAddEvents
        canViewProgressCard
        {...props}
      />
    </MemoryRouter>
  )

const project = {
  start_date: '2026-03-01',
  expected_completion_date: '2026-04-30',
  payments: [
    {
      id: 'payment-from-project',
      type: 'income',
      title: 'Payment loaded from project response',
      amount: '25000',
      transaction_date: '2026-03-05',
    },
  ],
  expenses: [],
  events: [],
}

beforeEach(() => mockCreateProjectEvent.mockReset())

test('uses transactions from the project response and displays them in progress', () => {
  render(
    <MemoryRouter>
      <ProjectProgressPage
        project={project}
        projectId="project-1"
        canAddEvents
        canViewProgressCard
      />
    </MemoryRouter>
  )

  expect(
    screen.getAllByText('Payment loaded from project response').length
  ).toBeGreaterThan(0)
})

test('shows project payments and expenses on their transaction dates', () => {
  renderProgress(project, {
    transactions: [
      {
        id: 'payment-1',
        type: 'income',
        title: 'Client milestone payment',
        amount: '50000',
        transaction_date: '2026-03-06',
        payment_method: 'bank_transfer',
        status: 'completed',
      },
      {
        id: 'expense-1',
        type: 'expense',
        title: 'Lighting materials',
        amount: '12500',
        transaction_date: '2026-03-09',
        category: 'Materials',
        status: 'pending',
      },
      {
        id: 'out-of-range',
        type: 'expense',
        title: 'Out of range transaction',
        amount: '100',
        transaction_date: '2026-05-01',
      },
    ],
  })

  expect(screen.getByText('1 Mar 2026')).toBeInTheDocument()
  expect(screen.getByText('30 Apr 2026')).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { name: 'March 2026' })).toHaveLength(2)
  expect(screen.getAllByText('Client milestone payment').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Lighting materials').length).toBeGreaterThan(0)
  expect(screen.queryByText('Out of range transaction')).not.toBeInTheDocument()
  expect(screen.getAllByText('₹50k').length).toBeGreaterThan(0)
  expect(screen.getAllByText('₹13k').length).toBeGreaterThan(0)
  expect(screen.getByText('Day 6 of 61')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Friday, 6 March 2026/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Day' }))
  expect(screen.getByText('Payment · completed')).toBeInTheDocument()
  expect(screen.getByText('₹50,000')).toBeInTheDocument()
  expect(screen.getByText('Day 6 of 61')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Month' }))
  fireEvent.click(screen.getByRole('button', { name: /Monday, 9 March 2026/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Day' }))
  expect(screen.getByText('Expense · Materials · pending')).toBeInTheDocument()
  expect(screen.getByText('₹12,500')).toBeInTheDocument()
})

test('lists all monthly activity and highlights the selected activity card', () => {
  renderProgress(project, {
    transactions: [
      {
        id: 'payment-march',
        type: 'income',
        title: 'March payment',
        amount: '25000',
        transaction_date: '2026-03-15',
        status: 'completed',
      },
      {
        id: 'expense-march',
        type: 'expense',
        title: 'March materials',
        amount: '5000',
        transaction_date: '2026-03-18',
        category: 'Materials',
        status: 'pending',
      },
      {
        id: 'expense-april',
        type: 'expense',
        title: 'April materials',
        amount: '1000',
        transaction_date: '2026-04-04',
      },
    ],
    events: [
      {
        id: 'event-1',
        title: 'Foundation inspection',
        event_type: 'INSPECTION',
        event_status: 'PLANNED',
        project_phase: 'FOUNDATION',
        start_date: '2026-03-10',
        end_date: '2026-03-11',
        priority: 'HIGH',
        description: 'Inspect the completed foundation.',
        files: [
          {
            id: 'pdf-1',
            name: 'inspection.pdf',
            file_path: 'https://storage.example/inspection.pdf',
          },
          {
            id: 'photo-1',
            name: 'foundation.jpg',
            file_path: 'https://storage.example/foundation.jpg',
          },
          {
            id: 'photo-2',
            name: 'foundation-detail.png',
            file_path: 'https://storage.example/foundation-detail.png',
          },
          {
            id: 'text-1',
            name: 'notes.txt',
            file_path: 'https://storage.example/notes.txt',
          },
        ],
      },
      {
        id: 'event-2',
        title: 'Structure milestone',
        event_type: 'MILESTONE',
        event_status: 'IN_PROGRESS',
        project_phase: 'STRUCTURE',
        start_date: '2026-03-20',
        priority: 'NORMAL',
      },
      {
        id: 'event-3',
        title: 'April inspection',
        event_type: 'INSPECTION',
        event_status: 'PLANNED',
        start_date: '2026-04-04',
      },
    ],
  })

  const monthCard = screen.getByRole('complementary', { name: 'Activity this month' })
  const getActivityCard = (name) => within(monthCard).getByRole('button', { name })
  const firstEventCard = getActivityCard(/Foundation inspection/)
  const firstEventCardContainer = firstEventCard.parentElement
  expect(getActivityCard(/Structure milestone/)).toBeInTheDocument()
  expect(getActivityCard(/March payment/)).toBeInTheDocument()
  expect(getActivityCard(/March materials/)).toBeInTheDocument()
  expect(within(monthCard).queryByRole('button', { name: /April materials/ })).not.toBeInTheDocument()
  expect(firstEventCard).toHaveAttribute('title', 'Double-click to view activity details')
  expect(firstEventCardContainer).not.toHaveClass('ring-2')
  const cardThumbnail = within(firstEventCard).getByRole('img', {
    name: 'Foundation inspection attachment',
  })
  expect(cardThumbnail).toHaveAttribute('src', 'https://storage.example/foundation.jpg')
  expect(cardThumbnail.parentElement).toHaveClass('flex')
  expect(within(firstEventCard).getAllByRole('img')).toHaveLength(1)
  expect(within(firstEventCardContainer).getByRole('link', { name: 'Download inspection.pdf' }))
    .toHaveAttribute('download', 'inspection.pdf')
  expect(within(firstEventCardContainer).getByRole('link', { name: 'Download notes.txt' }))
    .toHaveAttribute('href', 'https://storage.example/notes.txt')

  fireEvent.click(screen.getByRole('button', { name: /Tuesday, 10 March 2026/ }))
  expect(firstEventCardContainer).toHaveClass('ring-2')
  fireEvent.click(screen.getByRole('button', { name: /Friday, 20 March 2026/ }))
  expect(firstEventCardContainer).not.toHaveClass('ring-2')
  fireEvent.click(screen.getByRole('button', { name: /Tuesday, 10 March 2026/ }))
  expect(firstEventCardContainer).toHaveClass('ring-2')

  fireEvent.doubleClick(firstEventCard)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Foundation inspection' })).toBeInTheDocument()
  expect(screen.getAllByText('Inspect the completed foundation.')).toHaveLength(2)
  expect(within(screen.getByRole('dialog')).getByRole('link', {
    name: 'Download inspection.pdf',
  })).toHaveAttribute('download', 'inspection.pdf')
  const popupThumbnail = screen.getByRole('img', { name: 'foundation.jpg' })
  expect(popupThumbnail).toHaveAttribute(
    'src',
    'https://storage.example/foundation.jpg'
  )
  expect(popupThumbnail.parentElement.parentElement).toHaveClass('w-2/5')
  expect(within(screen.getByRole('dialog')).queryByText('foundation.jpg')).not.toBeInTheDocument()
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
  expect(screen.getByRole('img', { name: 'foundation-detail.png' })).toHaveAttribute(
    'src',
    'https://storage.example/foundation-detail.png'
  )
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Previous image' }))
  expect(screen.getByRole('img', { name: 'foundation.jpg' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Close activity details' }))
  const paymentCard = getActivityCard(/March payment/)
  fireEvent.doubleClick(paymentCard)
  expect(screen.getByRole('heading', { name: 'March payment' })).toBeInTheDocument()
  expect(screen.getAllByText('₹25,000')).toHaveLength(2)
})

test('switches between month, year and day views and selects a year month', () => {
  renderProgress(project)

  fireEvent.click(screen.getByRole('button', { name: 'Year' }))
  expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /March 2026/ }))
  expect(screen.getAllByRole('heading', { name: 'March 2026' })).toHaveLength(2)

  fireEvent.click(screen.getByRole('button', { name: 'Day' }))
  expect(screen.getAllByRole('heading', { name: /1 March 2026/ }).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
  expect(screen.getAllByRole('heading', { name: /2 March 2026/ }).length).toBeGreaterThan(0)
})

test('disables month and day navigation outside the project dates', () => {
  renderProgress({
    ...project,
    actual_completion_date: '2026-03-31',
    expected_completion_date: '2026-04-30',
  })

  fireEvent.click(screen.getByRole('button', { name: /Sunday, 1 March 2026/ }))
  expect(screen.getByText('No project activity recorded for this month.')).toBeInTheDocument()

  expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  expect(screen.getByText('Actual completion · 31 Mar')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Day' }))
  expect(screen.getByRole('button', { name: 'Previous day' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled()
})

test('limits year navigation to years covered by project dates', () => {
  renderProgress({
    start_date: '2025-11-15',
    expected_completion_date: '2026-04-30',
    actual_completion_date: '2026-02-02',
  })

  fireEvent.click(screen.getByRole('button', { name: 'Year' }))
  expect(screen.getByRole('heading', { name: '2025' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Next year' })).toBeEnabled()

  fireEvent.click(screen.getByRole('button', { name: 'Next year' }))
  expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous year' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled()
})

test('shows transaction loading and error states', () => {
  const { rerender } = renderProgress(project, { isLoadingTransactions: true })
  expect(screen.getByText('Loading project transactions…')).toBeInTheDocument()

  rerender(
    <MemoryRouter>
      <ProjectProgressPageView project={project} isTransactionsError />
    </MemoryRouter>
  )
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to load project transactions'
  )
})

test('asks for valid project dates before showing the calendar', () => {
  renderProgress({ start_date: '2026-03-01' })

  expect(screen.getByText('Project dates needed')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Month' })).not.toBeInTheDocument()
})

test('adds an event to the project calendar from the event form', async () => {
  renderProgress(project)

  fireEvent.click(screen.getByRole('button', { name: 'Add Events' }))
  expect(screen.getByRole('heading', { name: 'Add event' })).toBeInTheDocument()

  const typeSelect = screen.getByLabelText(/Type/)
  expect(typeSelect).toBeRequired()
  expect(typeSelect.options).toHaveLength(12)
  expect(screen.getByLabelText(/Project phase/).options).toHaveLength(15)
  expect(screen.getByLabelText(/Start date/)).toBeRequired()
  expect(screen.getByLabelText(/End date/)).toBeRequired()
  expect(screen.getByLabelText(/Start date/)).toHaveAttribute('min', '2026-03-01')
  expect(screen.getByLabelText(/Start date/)).toHaveAttribute('max', '2026-04-30')
  expect(screen.getByLabelText(/End date/)).toHaveAttribute('min', '2026-03-01')
  expect(screen.getByLabelText(/End date/)).toHaveAttribute('max', '2026-04-30')
  expect(screen.getByLabelText(/Status/)).toBeRequired()
  expect(screen.getByLabelText(/Priority/)).toHaveValue('LOW')

  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: 'Foundation inspection' },
  })
  fireEvent.change(typeSelect, { target: { value: 'INSPECTION' } })
  fireEvent.change(screen.getByLabelText(/Project phase/), {
    target: { value: 'FOUNDATION' },
  })
  fireEvent.change(screen.getByLabelText(/Start date/), {
    target: { value: '2026-03-10' },
  })
  fireEvent.change(screen.getByLabelText(/End date/), {
    target: { value: '2026-03-11' },
  })
  fireEvent.change(screen.getByLabelText(/Status/), {
    target: { value: 'PLANNED' },
  })

  const documentsInput = screen.getByLabelText(/Documents/)
  expect(documentsInput).toHaveAttribute('multiple')
  fireEvent.change(documentsInput, {
    target: {
      files: [
        new File(['report'], 'inspection-report.pdf', { type: 'application/pdf' }),
        new File(['photo'], 'foundation.jpg', { type: 'image/jpeg' }),
      ],
    },
  })
  expect(screen.getByText('inspection-report.pdf')).toBeInTheDocument()
  expect(screen.getByText('foundation.jpg')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Add event' }))

  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'Add event' })).not.toBeInTheDocument()
  })
  expect(
    screen.getByRole('button', {
      name: /Tuesday, 10 March 2026, activity: Foundation inspection/,
    })
  ).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', {
      name: /Tuesday, 10 March 2026, activity: Foundation inspection/,
    })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Day' }))
  expect(screen.getByText('Event · INSPECTION · PLANNED')).toBeInTheDocument()
  expect(screen.getByText('FOUNDATION · low priority · through 11 Mar 2026')).toBeInTheDocument()
  expect(
    screen.getByText('Documents: inspection-report.pdf, foundation.jpg')
  ).toBeInTheDocument()
})

test('double-clicking an active calendar day opens the event form for that date', () => {
  renderProgress(project)

  const calendarDay = screen.getByRole('button', { name: /Sunday, 15 March 2026/ })
  expect(calendarDay).toHaveAttribute('title', 'Double-click to add an event')

  fireEvent.doubleClick(calendarDay)

  expect(screen.getByRole('heading', { name: 'Add event' })).toBeInTheDocument()
  expect(screen.getByLabelText(/Start date/)).toHaveValue('2026-03-15')
  expect(screen.getByLabelText(/End date/)).toHaveValue('2026-03-15')
})

test('prevents selecting event dates outside the project progress window', () => {
  renderProgress(project)
  fireEvent.click(screen.getByRole('button', { name: 'Add Events' }))
  const startDateInput = screen.getByLabelText(/Start date/)
  const endDateInput = screen.getByLabelText(/End date/)

  fireEvent.change(startDateInput, { target: { value: '2026-02-28' } })
  fireEvent.change(endDateInput, { target: { value: '2026-05-01' } })

  expect(startDateInput).toBeInvalid()
  expect(endDateInput).toBeInvalid()
})

test('hides event controls and disables calendar double-click without ADD_EVENTS', () => {
  renderProgress(project, { canAddEvents: false })

  expect(screen.queryByRole('button', { name: 'Add Events' })).not.toBeInTheDocument()
  const calendarDay = screen.getByRole('button', { name: /Sunday, 15 March 2026/ })
  expect(calendarDay).not.toHaveAttribute('title')

  fireEvent.doubleClick(calendarDay)

  expect(screen.queryByRole('heading', { name: 'Add event' })).not.toBeInTheDocument()
})

test('hides the monthly activity card and its detail double-click without VIEW_PROGRESS_CARD', () => {
  renderProgress(project, {
    canViewProgressCard: false,
    events: [{
      id: 'event-1',
      title: 'Foundation inspection',
      event_type: 'INSPECTION',
      start_date: '2026-03-10',
    }],
  })

  expect(
    screen.queryByRole('complementary', { name: 'Activity this month' })
  ).not.toBeInTheDocument()
  const calendarDay = screen.getByRole('button', { name: /Sunday, 15 March 2026/ })
  expect(calendarDay.closest('.mt-4.grid')).toHaveClass('grid-cols-1')
  expect(calendarDay.closest('.mt-4.grid')).not.toHaveClass(
    'xl:grid-cols-[minmax(0,1fr)_19rem]'
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('submits event details to the backend and displays the saved event', async () => {
  const savedEvent = {
    id: 'event-1',
    title: 'Saved inspection',
    event_type: 'INSPECTION',
    event_status: 'PLANNED',
    project_phase: 'FOUNDATION',
    start_date: '2026-03-10',
    end_date: '2026-03-11',
    priority: 'LOW',
  }
  mockCreateProjectEvent.mockReturnValueOnce({
    unwrap: () => Promise.resolve({ event: savedEvent }),
  })

  render(
    <MemoryRouter>
      <ProjectProgressPage
        project={project}
        projectId="project-1"
        canAddEvents
        canViewProgressCard
      />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: 'Add Events' }))
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: savedEvent.title },
  })
  fireEvent.change(screen.getByLabelText(/Type/), {
    target: { value: 'INSPECTION' },
  })
  fireEvent.change(screen.getByLabelText(/Project phase/), {
    target: { value: 'FOUNDATION' },
  })
  fireEvent.change(screen.getByLabelText(/Start date/), {
    target: { value: '2026-03-10' },
  })
  fireEvent.change(screen.getByLabelText(/End date/), {
    target: { value: '2026-03-11' },
  })
  fireEvent.change(screen.getByLabelText(/Status/), {
    target: { value: 'PLANNED' },
  })
  const eventFile = new File(['inspection report'], 'inspection.pdf', {
    type: 'application/pdf',
  })
  fireEvent.change(screen.getByLabelText(/Documents/), {
    target: { files: [eventFile] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add event' }))

  await waitFor(() => expect(mockCreateProjectEvent).toHaveBeenCalled())
  expect(
    await screen.findByRole('button', {
      name: /Tuesday, 10 March 2026, activity: Saved inspection/,
    })
  ).toBeInTheDocument()
  expect(mockCreateProjectEvent).toHaveBeenCalledWith({
    projectId: 'project-1',
    title: savedEvent.title,
    description: '',
    event_type: 'INSPECTION',
    event_status: 'PLANNED',
    project_phase: 'FOUNDATION',
    start_date: '2026-03-10',
    end_date: '2026-03-11',
    priority: 'LOW',
    files: [eventFile],
  })
})

test('keeps the event form open and shows an error when saving fails', async () => {
  mockCreateProjectEvent.mockReturnValueOnce({
    unwrap: () => Promise.reject({ data: { error: 'Project not found' } }),
  })

  render(
    <MemoryRouter>
      <ProjectProgressPage
        project={project}
        projectId="project-1"
        canAddEvents
        canViewProgressCard
      />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: 'Add Events' }))
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: 'Failed inspection' },
  })
  fireEvent.change(screen.getByLabelText(/Type/), {
    target: { value: 'INSPECTION' },
  })
  fireEvent.change(screen.getByLabelText(/Project phase/), {
    target: { value: 'FOUNDATION' },
  })
  fireEvent.change(screen.getByLabelText(/Start date/), {
    target: { value: '2026-03-10' },
  })
  fireEvent.change(screen.getByLabelText(/End date/), {
    target: { value: '2026-03-11' },
  })
  fireEvent.change(screen.getByLabelText(/Status/), {
    target: { value: 'PLANNED' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add event' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Project not found')
  expect(screen.getByRole('heading', { name: 'Add event' })).toBeInTheDocument()
})
