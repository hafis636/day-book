const LOGIN_VALIDATION = ({ username, password } = {}) => {
  if (
    typeof username !== 'string' ||
    !username.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return 'Username and password are required';
  }

  return null;
};

const REGISTER_VALIDATION = ({ firstName, lastName, email, mobile, password, roleId } = {}) => {
  if (![firstName, lastName, email, mobile, password].every((value) => typeof value === 'string' && value.trim())) {
    return 'All registration fields are required';
  }
  if (!/^\d+$/.test(String(roleId || ''))) {
    return 'A valid role is required';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address';
  }
  if (!/^\d{10}$/.test(mobile.trim())) {
    return 'Mobile number must contain exactly 10 digits';
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/.test(password)) {
    return 'Password must be at least 8 characters and include a letter, number, and special character';
  }

  return null;
};

module.exports = { LOGIN_VALIDATION, REGISTER_VALIDATION };
