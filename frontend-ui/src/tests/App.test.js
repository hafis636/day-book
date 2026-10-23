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
const mockCreateProject = jest.fn();
const mockGetProjects = jest.fn();
const mockGetProject = jest.fn();
const mockUpdateProject = jest.fn();

jest.mock('../redux/services/users/usersApi', () => ({
  useLazyConfirmUserQuery: () => [mockCheckUserContact, { isFetching: false }],
  useValidateOtpMutation: () => [mockValidateOtp, { isLoading: false }],
  useLoginUserMutation: () => [mockLoginUser, { isLoading: false }],
  useGetRolesQuery: () => mockGetRoles(),
  useRegisterUserMutation: () => [mockRegisterUser, { isLoading: false }],
  useGetCurrentSessionQuery: () => mockGetCurrentSession(),
  useLogoutMutation: () => [mockLogout, { isLoading: false }],
  useCreateProjectMutation: () => [mockCreateProject, { isLoading: false }],
  useGetProjectsQuery: () => mockGetProjects(),
  useGetProjectQuery: () => mockGetProject(),
  useUpdateProjectMutation: () => [mockUpdateProject, { isLoading: false }],
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
  mockCreateProject.mockReset();
  mockCreateProject.mockReturnValue({
    unwrap: () => Promise.resolve({ project: { id: 'project-1' } }),
  });
  mockGetProjects.mockReturnValue({
    data: { projects: [] },
    isLoading: false,
    isError: false,
  });
  mockGetProject.mockReturnValue({
    data: {
      project: {
        id: 'project-1',
        name: 'harbor house',
        description: 'A waterfront home',
        project_type: 'Residential House',
        status: 'Planning',
        start_date: '2026-01-02',
        expected_completion_date: '2026-12-15',
        actual_completion_date: null,
        address: '1 Harbor Road',
        project_info: 'Phase one',
        cover_image: 'https://example.com/harbor-house.jpg',
        images: [
          {
            image_url: 'https://example.com/harbor-house.jpg',
            title: 'Harbor cover',
            is_cover: true,
          },
          {
            image_url: 'https://example.com/harbor-detail.jpg',
            title: 'Harbor detail',
            is_cover: false,
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
  });
  mockUpdateProject.mockReturnValue({
    unwrap: () => Promise.resolve({ project: { id: 'project-1' } }),
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

test('shows a centered loading indicator while the session is loading', () => {
  mockGetCurrentSession.mockReturnValue({
    data: undefined,
    isLoading: true,
    refetch: jest.fn(),
  });
  window.history.pushState({}, '', '/add-projects');
  render(<App />);

  expect(screen.getByRole('status', { name: /loading session/i })).toBeInTheDocument();
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

test('renders the protected engineer add-projects route', () => {
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
  window.history.pushState({}, '', '/add-projects');
  render(<App />);

  expect(screen.getByRole('heading', { name: /add projects/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /taylor day/i })).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  expect(screen.getByRole('navigation', { name: 'engineer-left-menu' })).toBeVisible();
  expect(screen.getByRole('button', { name: /projects/i })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Add Projects' })).toHaveAttribute('href', '/add-projects');
  expect(screen.getByRole('link', { name: 'Manage Projects' })).toHaveAttribute('href', '/manage-projects');
  userEvent.click(screen.getByRole('link', { name: 'Manage Projects' }));
  expect(screen.getByRole('heading', { name: 'Manage Projects' })).toBeInTheDocument();
});

test('loads and displays the current user projects on the manage projects page', () => {
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
  mockGetProjects.mockReturnValue({
    data: {
      projects: [
        {
          id: 'project-1',
          name: 'harbor house',
          status: 'Planning',
          project_type: 'Residential House',
          cover_image: 'https://example.com/harbor-house.jpg',
        },
        {
          id: 'project-2',
          name: 'Garden Apartment',
          status: 'Ongoing',
          project_type: 'Apartment',
          cover_image: 'https://example.com/apartment-first-image.jpg',
        },
        {
          id: 'project-3',
          name: 'Office Renovation',
          status: 'In discussion',
          project_type: 'Office',
          cover_image: null,
        },
      ],
    },
    isLoading: false,
    isError: false,
  });
  window.history.pushState({}, '', '/manage-projects');
  render(<App />);

  expect(mockGetProjects).toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Harbor House' })).toBeInTheDocument();
  expect(screen.getAllByText('Planning')).toHaveLength(2);
  expect(screen.getAllByText('In Discussion')).toHaveLength(2);
  expect(screen.getAllByText('Residential House')).toHaveLength(2);
  expect(screen.getByRole('img', { name: 'Harbor House cover' })).toHaveAttribute(
    'src',
    'https://example.com/harbor-house.jpg'
  );
  expect(screen.getByRole('img', { name: 'Garden Apartment cover' })).toHaveAttribute(
    'src',
    'https://example.com/apartment-first-image.jpg'
  );
  expect(screen.getByRole('img', { name: 'Office Renovation cover' })).toHaveAttribute(
    'src',
    '/default-cover.jpg'
  );
  expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();

  const statusSelect = screen.getByRole('combobox', { name: 'Status' });
  const projectTypeSelect = screen.getByRole('combobox', {
    name: 'Project Type',
  });
  expect(within(statusSelect).getByRole('option', { name: 'Status' })).toBeInTheDocument();
  expect(
    within(projectTypeSelect).getByRole('option', { name: 'Project Type' })
  ).toBeInTheDocument();

  userEvent.selectOptions(statusSelect, 'Ongoing');
  expect(within(statusSelect).getByRole('option', { name: 'All' })).toBeInTheDocument();
  userEvent.selectOptions(statusSelect, '');
  expect(
    within(statusSelect).getByRole('option', { name: 'Status' })
  ).toBeInTheDocument();
  userEvent.selectOptions(statusSelect, 'Ongoing');
  expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Garden Apartment' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Harbor House' })).not.toBeInTheDocument();

  userEvent.selectOptions(
    projectTypeSelect,
    'Apartment'
  );
  expect(within(projectTypeSelect).getByRole('option', { name: 'All' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Garden Apartment' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Office Renovation' })).not.toBeInTheDocument();

  userEvent.selectOptions(
    projectTypeSelect,
    'Office'
  );
  expect(screen.getByText(/no projects match the selected filters/i)).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(statusSelect).toHaveValue('');
  expect(projectTypeSelect).toHaveValue('');
  expect(
    within(statusSelect).getByRole('option', { name: 'Status' })
  ).toBeInTheDocument();
  expect(
    within(projectTypeSelect).getByRole('option', { name: 'Project Type' })
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Office Renovation' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Harbor House' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Garden Apartment' })).toBeInTheDocument();
  expect(
    screen.queryByText(/no projects match the selected filters/i)
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('link', { name: 'Edit Harbor House' }));
  expect(screen.getByRole('heading', { name: 'Edit Project' })).toBeInTheDocument();
  expect(screen.getByLabelText(/^Project Name/)).toHaveValue('harbor house');
  expect(screen.getByLabelText(/^Project Type/)).toHaveValue('Residential House');
  expect(screen.getByLabelText('Start Date')).toHaveValue('2026-01-02');
  expect(screen.getByRole('img', { name: 'Current cover' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Harbor detail' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Cover Image/), {
    target: { files: [new File(['cover'], 'new-cover.jpg', { type: 'image/jpeg' })] },
  });
  expect(screen.getByRole('button', { name: 'Remove Harbor detail' })).toHaveAttribute(
    'title',
    'Remove'
  );
  userEvent.click(screen.getByRole('button', { name: 'Remove Harbor detail' }));
  expect(screen.queryByRole('img', { name: 'Harbor detail' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^Project Name/), {
    target: { value: 'Updated Harbor House' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(mockUpdateProject).toHaveBeenCalledWith({
    id: 'project-1',
    formData: expect.any(FormData),
  });
  const updateFormData = mockUpdateProject.mock.calls[0][0].formData;
  expect(updateFormData.get('name')).toBe('Updated Harbor House');
  expect(updateFormData.get('project_type')).toBe('Residential House');
  expect(updateFormData.get('status')).toBe('Planning');
  expect(updateFormData.get('coverImage')).toBeInstanceOf(File);
  expect(updateFormData.get('removeImageUrls')).toBe(
    JSON.stringify(['https://example.com/harbor-detail.jpg'])
  );
});

test('shows an unauthorized page when an admin visits add-project', () => {
  mockGetCurrentSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        first_name: 'Taylor',
        last_name: 'Day',
        email: 'taylor@example.com',
        role: 'admin',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  });
  window.history.pushState({}, '', '/add-project');
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /you don’t have permission to view this page/i })
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /return to dashboard/i })).toHaveAttribute(
    'href',
    '/dashboard'
  );
  expect(screen.queryByRole('heading', { name: /add projects/i })).not.toBeInTheDocument();
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
