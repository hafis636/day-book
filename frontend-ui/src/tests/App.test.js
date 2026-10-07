import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../app/App';
import Login from '../pages/login';

const mockCheckUserContact = jest.fn();
const mockValidateOtp = jest.fn();
const mockGetCurrentSession = jest.fn();
const mockLogout = jest.fn();

jest.mock('../redux/services/users/usersApi', () => ({
  useLazyConfirmUserQuery: () => [mockCheckUserContact, { isFetching: false }],
  useValidateOtpMutation: () => [mockValidateOtp, { isLoading: false }],
  useGetCurrentSessionQuery: () => mockGetCurrentSession(),
  useLogoutMutation: () => [mockLogout, { isLoading: false }],
}));

beforeEach(() => {
  mockCheckUserContact.mockReset();
  mockCheckUserContact.mockReturnValue({
    unwrap: () => Promise.resolve({ exists: true }),
  });
  mockValidateOtp.mockReset();
  mockValidateOtp.mockReturnValue({
    unwrap: () => Promise.resolve({ valid: true }),
  });
  mockGetCurrentSession.mockReturnValue({
    data: undefined,
    isLoading: false,
    refetch: jest.fn(),
  });
  mockLogout.mockReset();
  mockLogout.mockReturnValue({
    unwrap: () => Promise.resolve({ success: true }),
  });
});

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={<p role="status">OTP validated successfully.</p>}
        />
      </Routes>
    </MemoryRouter>
  );

test('renders the login route', () => {
  renderLogin();
  const heading = screen.getByRole('heading', { name: /login/i });
  expect(heading).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^login$/i })).toBeDisabled();
});

test('enables password login only after username and password are entered', () => {
  renderLogin();

  const loginButton = screen.getByRole('button', { name: /^login$/i });
  const usernameInput = screen.getByPlaceholderText(/enter username/i);
  const passwordInput = screen.getByPlaceholderText(/enter password/i);

  userEvent.type(usernameInput, 'user@example.com');
  expect(loginButton).toBeDisabled();

  userEvent.type(passwordInput, 'password');
  expect(loginButton).toBeEnabled();

  userEvent.clear(usernameInput);
  expect(loginButton).toBeDisabled();
});

test('redirects the base URL to login when there is no session', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
});

test('redirects the base URL to the dashboard when a session exists', () => {
  mockGetCurrentSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        role: 'editor',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  });
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getByRole('heading', { name: /welcome, taylor day/i })).toBeInTheDocument();
  expect(screen.getByText('taylor@example.com')).toBeInTheDocument();
});

test('redirects unauthenticated dashboard visits to login', () => {
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.queryByText(/checking your session/i)).not.toBeInTheDocument();
});

test('redirects to login after logout without bouncing back to the dashboard', async () => {
  mockGetCurrentSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        role: 'editor',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  });
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  userEvent.click(screen.getByRole('button', { name: /taylor day/i }));
  userEvent.click(await screen.findByRole('menuitem', { name: /log out/i }));

  expect(await screen.findByRole('heading', { name: /^login$/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /welcome, taylor day/i })).not.toBeInTheDocument();
});

test('checks a valid contact before showing the OTP fields', async () => {
  renderLogin();

  userEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  const contactInput = screen.getByLabelText(/phone or email/i);
  const generateButton = screen.getByRole('button', { name: /generate otp/i });

  expect(generateButton).toBeDisabled();
  userEvent.type(contactInput, 'not-a-contact');
  expect(generateButton).toBeDisabled();

  userEvent.clear(contactInput);
  userEvent.type(contactInput, 'person@example.com');
  expect(generateButton).toBeEnabled();
  userEvent.click(generateButton);

  expect(mockCheckUserContact).toHaveBeenCalledWith('person@example.com');
  const otpInputs = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      screen.findByRole('textbox', { name: `OTP digit ${index + 1}` })
    )
  );
  fireEvent.change(otpInputs[0], { target: { value: '1' } });
  fireEvent.change(otpInputs[1], { target: { value: '2' } });

  expect(otpInputs[0]).toHaveValue('1');
  expect(otpInputs[1]).toHaveValue('2');
  expect(screen.getByText(/person@example.com/i)).toBeInTheDocument();
});

test('shows an error and stays on the contact form when no account exists', async () => {
  mockCheckUserContact.mockReturnValue({
    unwrap: () => Promise.resolve({ exists: false }),
  });
  renderLogin();

  userEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  userEvent.type(screen.getByLabelText(/phone or email/i), 'person@example.com');
  userEvent.click(screen.getByRole('button', { name: /generate otp/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/no account found/i);
  expect(screen.getByLabelText(/phone or email/i)).toBeInTheDocument();
});

test('validates the OTP after all six digits are entered and shows success', async () => {
  renderLogin();

  userEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  userEvent.type(screen.getByLabelText(/phone or email/i), 'person@example.com');
  userEvent.click(screen.getByRole('button', { name: /generate otp/i }));

  const otpInputs = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      screen.findByRole('textbox', { name: `OTP digit ${index + 1}` })
    )
  );
  otpInputs.forEach((input, index) => {
    fireEvent.change(input, { target: { value: String(index + 1) } });
  });

  expect(mockValidateOtp).toHaveBeenCalledWith({
    contact: 'person@example.com',
    otp: '123456',
  });
  expect(await screen.findByRole('status')).toHaveTextContent(/otp validated successfully/i);
});

test('shows an error when the OTP is rejected', async () => {
  mockValidateOtp.mockReturnValue({
    unwrap: () => Promise.resolve({ valid: false }),
  });
  renderLogin();

  userEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  userEvent.type(screen.getByLabelText(/phone or email/i), 'person@example.com');
  userEvent.click(screen.getByRole('button', { name: /generate otp/i }));

  const otpInputs = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      screen.findByRole('textbox', { name: `OTP digit ${index + 1}` })
    )
  );
  otpInputs.forEach((input, index) => {
    fireEvent.change(input, { target: { value: String(index + 1) } });
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired otp/i);
});

test('enables OTP generation for a 10-digit phone number', () => {
  renderLogin();

  userEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  userEvent.type(screen.getByLabelText(/phone or email/i), '1234567890');

  expect(screen.getByRole('button', { name: /generate otp/i })).toBeEnabled();
});
