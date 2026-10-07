const usersService = require('../services/usersService');

const registerUser = async (req, res) => {
  const { firstName, lastName, email, mobile, password, role } = req.body || {};
  const validRoles = ['admin', 'shop owner', 'editor'];

  if (![firstName, lastName, email, mobile, password, role].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'All registration fields are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!/^\d{10}$/.test(mobile.trim())) {
    return res.status(400).json({ error: 'Mobile number must contain exactly 10 digits' });
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include a letter, number, and special character' });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  /*if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts can only be created by an administrator' });
  }*/

  try {
    const user = await usersService.registerUser({
      firstName,
      lastName,
      email,
      mobile,
      password,
      role,
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

module.exports = { registerUser, getUserById, getUsers };
    