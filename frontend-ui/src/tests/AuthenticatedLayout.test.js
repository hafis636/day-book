import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from '../app/AuthenticatedLayout'

jest.mock('../redux/services/users/usersApi', () => ({
  useGetCurrentSessionQuery: () => ({
    data: { user: { first_name: 'Test', role: 'engineers', permissions: [] } },
  }),
  useLogoutMutation: () => [jest.fn(), { isLoading: false }],
}))

jest.mock('../menus/LeftMenu', () => {
  const React = require('react')
  const LeftMenuToggle = ({ open, onToggle }) =>
    React.createElement('button', { 'aria-expanded': open, onClick: onToggle }, 'Menu')
  return {
    __esModule: true,
    default: () => null,
    LeftMenuToggle,
  }
})

jest.mock('../menus/TopMenu', () => () => null)

test('closes the expanded left menu when navigating to a project', () => {
  render(
    <MemoryRouter initialEntries={['/manage-projects']}>
      <AuthenticatedLayout>
        <Routes>
          <Route
            path="/manage-projects"
            element={<Link to="/manage-projects/project-1">Open project</Link>}
          />
          <Route
            path="/manage-projects/:projectId"
            element={<h1>Project</h1>}
          />
        </Routes>
      </AuthenticatedLayout>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'true'
  )

  fireEvent.click(screen.getByRole('link', { name: 'Open project' }))

  expect(screen.getByRole('heading', { name: 'Project' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'false'
  )
})
