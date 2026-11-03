import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopMenu from './TopMenu'

const renderTopMenu = () =>
  render(
    <MemoryRouter>
      <TopMenu
        role="default"
        roleName="Member"
        displayName="Alex Example"
        isLoading={false}
        onLogout={jest.fn()}
      />
      <button type="button">Outside</button>
    </MemoryRouter>
  )

test('closes the top menu when clicking outside it', () => {
  renderTopMenu()
  fireEvent.click(screen.getByRole('button', { name: /Alex Example/ }))
  expect(screen.getByRole('menu')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Outside' }))

  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

test('keeps the top menu open when clicking inside it', () => {
  renderTopMenu()
  fireEvent.click(screen.getByRole('button', { name: /Alex Example/ }))

  fireEvent.click(screen.getByRole('menu'))

  expect(screen.getByRole('menu')).toBeInTheDocument()
})
