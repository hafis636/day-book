import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../app/App';
import Login from '../pages/login';
import Register from '../pages/register';
import { menuConfig } from '../menus/menu_config';

const mockCheckUserContact = jest.fn();
const mockValidateOtp = jest.fn();
const mockGetCurrentSession = jest.fn();
const mockLogout = jest.fn();
const mockLoginUser = jest.fn();
const mockGetRoles = jest.fn();
const mockRegisterUser = jest.fn();

jest.mock('../redux/services/users/usersApi', () => ({
  useLazyConfirmUserQuery: () => [mockCheckUserContact, { isFetching: false }],
  useValidateOtpMutation: () => [mockValidateOtp, { isLoading: false }],
  useLoginUserMutation: () => [mockLoginUser, { isLoading: false }],
  useGetRolesQuery: () => mockGetRoles(),
  useRegisterUserMutation: () => [mockRegisterUser, { isLoading: false }],
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
  mockLoginUser.mockReset();
  mockLoginUser.mockReturnValue({
    unwrap: () => Promise.resolve({ valid: true }),
  });
  mockRegisterUser.mockReset();
  mockRegisterUser.mockReturnValue({
    unwrap: () => Promise.resolve({ user: { id: 'user-1' } }),
  });
  mockGetRoles.mockReturnValue({
    data: [
      { id: 1, name: 'admin' },
      { id: 2, name: 'shop owner' },
      { id: 3, name: 'editor' },
    ],
    isLoading: false,
    isError: false,
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

test('loads registration role options from the roles API', () => {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByRole('option', { name: 'Admin' })).toHaveValue('1');
  expect(screen.getByRole('option', { name: 'Shop Owner' })).toHaveValue('2');
  expect(screen.getByRole('option', { name: 'Editor' })).toHaveValue('3');
});

test('keeps the role dropdown disabled while roles are loading or unavailable', () => {
  mockGetRoles.mockReturnValue({
    data: [],
    isLoading: true,
    isError: false,
  });
  const { rerender } = render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  const roleDropdown = screen.getByLabelText(/^role/i);
  expect(roleDropdown).toBeDisabled();
  expect(screen.queryByText(/loading roles/i)).not.toBeInTheDocument();

  mockGetRoles.mockReturnValue({
    data: [],
    isLoading: false,
    isError: true,
  });
  rerender(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/^role/i)).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent(/unable to load roles/i);
});

test('uses cached role options when a background refresh is loading or fails', () => {
  mockGetRoles.mockReturnValue({
    data: [{ id: 2, name: 'shop owner' }],
    isLoading: false,
    isFetching: true,
    isError: false,
  });
  const { rerender } = render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/^role/i)).toBeEnabled();
  expect(screen.getByRole('option', { name: 'Shop Owner' })).toHaveValue('2');

  mockGetRoles.mockReturnValue({
    data: [{ id: 2, name: 'shop owner' }],
    isLoading: false,
    isFetching: false,
    isError: true,
  });
  rerender(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/^role/i)).toBeEnabled();
  expect(screen.getByRole('option', { name: 'Shop Owner' })).toHaveValue('2');
  expect(screen.getByRole('alert')).toHaveTextContent(/unable to load roles/i);
});

test('submits the selected role ID during registration', async () => {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Casey' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'casey@example.com' } });
  fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '1234567890' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password1!' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1!' } });
  fireEvent.change(screen.getByLabelText(/^role/i), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: /create account|register/i }));

  expect(mockRegisterUser).toHaveBeenCalledWith({
    firstName: 'Casey',
    lastName: 'User',
    email: 'casey@example.com',
    mobile: '1234567890',
    password: 'Password1!',
    roleId: '2',
  });
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

test('submits username and password to the login API', async () => {
  renderLogin();

  userEvent.type(screen.getByPlaceholderText(/enter username/i), ' person@example.com ');
  userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
  userEvent.click(screen.getByRole('button', { name: /^login$/i }));

  expect(mockLoginUser).toHaveBeenCalledWith({
    username: 'person@example.com',
    password: 'password123',
  });
  expect(await screen.findByRole('status')).toHaveTextContent(/otp validated successfully/i);
});

test('shows an error when password login credentials are rejected', async () => {
  mockLoginUser.mockReturnValue({
    unwrap: () => Promise.reject({
      data: { error: 'Invalid username or password' },
    }),
  });
  renderLogin();

  userEvent.type(screen.getByPlaceholderText(/enter username/i), 'person@example.com');
  userEvent.type(screen.getByPlaceholderText(/enter password/i), 'wrong-password');
  userEvent.click(screen.getByRole('button', { name: /^login$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid username or password/i);
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

test('opens role-specific left and top menus on the dashboard', () => {
  mockGetCurrentSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        role: 'engineer',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  });
  window.history.pushState({}, '', '/dashboard');

  const originalEngineerConfig = menuConfig.engineer;
  menuConfig.engineer = {
    left: [{ label: 'Work logs', path: '/dashboard' }],
    top: [{ label: 'Help', path: '/about' }],
  };

  try {
    render(<App />);

    const leftMenuToggle = screen.getByRole('button', { name: /open navigation menu/i });
    expect(leftMenuToggle).toHaveAttribute('aria-controls', 'engineer-left-menu');
    userEvent.click(leftMenuToggle);
    expect(screen.getByRole('navigation', { name: 'engineer-left-menu' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Work logs' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /taylor day/i }));
    const topMenu = screen.getByRole('menu');
    expect(topMenu).toHaveAttribute('id', 'engineer-top-menu');
    expect(within(topMenu).getByRole('menuitem', { name: 'Help' })).toHaveAttribute('href', '/about');
  } finally {
    if (originalEngineerConfig) {
      menuConfig.engineer = originalEngineerConfig;
    } else {
      delete menuConfig.engineer;
    }
  }
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
  const accountMenu = await screen.findByRole('menu');
  expect(within(accountMenu).getByText('editor')).toBeInTheDocument();
  expect(within(accountMenu).getByRole('separator')).toBeInTheDocument();
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
