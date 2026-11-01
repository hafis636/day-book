const { pool, query } = require('../config/db');
const bcrypt = require('bcryptjs');

const registerUser = async ({ firstName, lastName, email, mobile, password, roleId }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const insertedUser = await client.query(
      `INSERT INTO "daybook-dev-db".users
         (first_name, last_name, email, username, mobile_number, password_hash, role_id)
       VALUES ($1, $2, $3, $3, $4, $5, $6)
       RETURNING id`,
      [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), mobile.trim(), passwordHash, roleId]
    );

    await client.query(
      `UPDATE "daybook-dev-db".users AS u
       SET user_plan = CASE
         WHEN UPPER(r.role_code) = 'ADMIN' THEN 'ADMIN'
         ELSE 'BASIC'
       END
       FROM "daybook-dev-db".roles AS r
       WHERE u.id = $1
         AND r.id = u.role_id`,
      [insertedUser.rows[0].id]
    );

    const result = await client.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.username,
              u.mobile_number, r.role_code AS role, r.role_name
       FROM "daybook-dev-db".users AS u
       INNER JOIN "daybook-dev-db".roles AS r ON r.id = u.role_id
       WHERE u.id = $1`,
      [insertedUser.rows[0].id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    'SELECT id, role_name, role_code FROM "daybook-dev-db".roles ORDER BY role_name',
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
            r.role_name, r.role_code AS role, u.created_at, u.username
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
            r.role_name, r.role_code AS role, u.created_at, u.username
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
