const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const registerUser = async ({ firstName, lastName, email, mobile, password, role }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO "daybook-dev-db".users (first_name, last_name, email, username, mobile_number, password_hash, role) VALUES ($1, $2, $3, $3, $4, $5, $6) RETURNING id, first_name, last_name, email, username, mobile_number, role',
    [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), mobile.trim(), passwordHash, role]
  );

  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await query(
    'SELECT id, first_name, last_name, email, mobile_number, role, created_at, username FROM "daybook-dev-db".users WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
};

const getUsers = async () => {
  const result = await query(
    'SELECT id, first_name, last_name, email, mobile_number, role, created_at, username FROM "daybook-dev-db".users',
    []
  );

  return result.rows;
};

module.exports = { registerUser, getUserById, getUsers };
