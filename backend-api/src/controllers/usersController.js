const usersService = require('../services/usersService');
const { LOGIN_VALIDATION, REGISTER_VALIDATION } = require('../validations/formValidations');

const loginUser = async (req, res, next) => {
  const { username, password } = req.body || {};
  const validationError = LOGIN_VALIDATION({ username, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const userId = await usersService.authenticateUser(username, password);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.authenticatedUserId = userId;
    return next();
  } catch (error) {
    console.error('Failed to authenticate user:', error);
    return res.status(500).json({ error: 'Failed to log in' });
  }
};

const registerUser = async (req, res) => {
  const { firstName, lastName, email, mobile, password, roleId } = req.body || {};
  const validationError = REGISTER_VALIDATION({ firstName, lastName, email, mobile, password, roleId });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  /*if (roleId === '1') {
    return res.status(403).json({ error: 'Admin accounts can only be created by an administrator' });
  }*/

  try {
    if (!(await usersService.roleIdExists(roleId))) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await usersService.registerUser({
      firstName,
      lastName,
      email,
      mobile,
      password,
      roleId,
    });
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Failed to register user:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await usersService.getRoles();
    return res.json(roles);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID; expected a UUID' });
  }

  try {
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const getUsers = async (req, res) => {

  try {
    const users = await usersService.getUsers();
    return res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { loginUser, registerUser, getRoles, getUserById, getUsers };
    