const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const registerUser = async ({ firstName, lastName, email, mobile, password, roleId }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `WITH inserted_user AS (
       INSERT INTO "daybook-dev-db".users
         (first_name, last_name, email, username, mobile_number, password_hash, role_id)
       VALUES ($1, $2, $3, $3, $4, $5, $6)
       RETURNING id
     )
     SELECT u.id, u.first_name, u.last_name, u.email, u.username,
            u.mobile_number, r.name AS role
     FROM inserted_user AS created
     INNER JOIN "daybook-dev-db".users AS u ON u.id = created.id
     INNER JOIN "daybook-dev-db".roles AS r ON r.id = u.role_id`,
    [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), mobile.trim(), passwordHash, roleId]
  );

  return result.rows[0];
};

const authenticateUser = async (username, password) => {
  const result = await query(
    `SELECT id, password_hash
     FROM "daybook-dev-db".users
     WHERE LOWER(username) = $1 OR LOWER(email) = $1
     LIMIT 1`,
    [username.trim().toLowerCase()]
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return user.id;
};

const getRoles = async () => {
  const result = await query(
    'SELECT id, name FROM "daybook-dev-db".roles ORDER BY name',
    []
  );

  return result.rows;
};

const roleIdExists = async (roleId) => {
  const result = await query(
    'SELECT EXISTS (SELECT 1 FROM "daybook-dev-db".roles WHERE id = $1) AS exists',
    [roleId]
  );

  return result.rows[0].exists;
};

const getUserById = async (id) => {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile_number,
            r.name AS role, u.created_at, u.username
     FROM "daybook-dev-db".users AS u
     INNER JOIN "daybook-dev-db".roles AS r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

const getUsers = async () => {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile_number,
            r.name AS role, u.created_at, u.username
     FROM "daybook-dev-db".users AS u
     INNER JOIN "daybook-dev-db".roles AS r ON r.id = u.role_id`,
    []
  );

  return result.rows;
};

module.exports = {
  registerUser,
  authenticateUser,
  getRoles,
  roleIdExists,
  getUserById,
  getUsers,
};
