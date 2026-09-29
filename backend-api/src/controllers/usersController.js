const { query } = require('../config/db');

const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID; expected a UUID' });
  }

  try {
    const result = await query(
      'SELECT * FROM "daybook-dev-db".users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const getUsers = async (req, res) => {

  try {
    const result = await query(
      'SELECT * FROM "daybook-dev-db".users',
      []
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getUserById, getUsers };
    