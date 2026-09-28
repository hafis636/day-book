import { render, screen } from '@testing-library/react';
import App from '../app/App';

test('renders the login route', () => {
  window.history.pushState({}, '', '/login');
  render(<App />);
  const heading = screen.getByRole('heading', { name: /login/i });
  expect(heading).toBeInTheDocument();
});
