import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectWorkspaceLayout from '../pages/users/builders/ProjectWorkspaceLayout'

let mockSession

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => ({ data: mockSession }),
}))

const renderWorkspace = () =>
  render(
    <MemoryRouter>
      <ProjectWorkspaceLayout projectId="project-1">
        <div>Project content</div>
      </ProjectWorkspaceLayout>
    </MemoryRouter>
  )

beforeEach(() => {
  mockSession = undefined
})

test('shows the project menu only when PROJECT_RIGHT_MENU is enabled', () => {
  mockSession = { user: { permissions: { PROJECT_RIGHT_MENU: true } } }
  const { rerender } = renderWorkspace()

  expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument()

  mockSession = { user: { permissions: { PROJECT_RIGHT_MENU: false } } }
  rerender(
    <MemoryRouter>
      <ProjectWorkspaceLayout projectId="project-1">
        <div>Project content</div>
      </ProjectWorkspaceLayout>
    </MemoryRouter>
  )

  expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  expect(screen.getByText('Project content')).toBeInTheDocument()
})

test('hides the project menu while the session permissions are unavailable', () => {
  renderWorkspace()

  expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
})

test('labels the expenditure route as Expenses without changing its path', () => {
  mockSession = { user: { permissions: { PROJECT_RIGHT_MENU: true } } }
  renderWorkspace()

  expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute(
    'href',
    '/manage-projects/project-1/expenditure'
  )
})
