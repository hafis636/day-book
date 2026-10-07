const { createHash, randomBytes } = require('crypto');
const { query } = require('../config/db');

const SESSION_IDLE_DAYS = 1;

const createSession = async (userId) => {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO "daybook-dev-db".sessions
       (user_id, session_token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
};

const getSessionUser = async (token) => {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await query(
    `UPDATE "daybook-dev-db".sessions AS s
     SET last_used_at = NOW(),
         expires_at = NOW() + INTERVAL '1 day'
     FROM "daybook-dev-db".users AS u
     WHERE s.user_id = u.id
       AND s.session_token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     RETURNING u.id, u.first_name, u.last_name, u.email, u.username, u.role,
               s.expires_at`,
    [tokenHash]
  );

  if (!result.rows[0]) return null;

  const { expires_at: expiresAt, ...user } = result.rows[0];
  return { user, expiresAt };
};

const revokeSession = async (token) => {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await query(
    `UPDATE "daybook-dev-db".sessions
     SET revoked_at = NOW()
     WHERE session_token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash]
  );
};

module.exports = { createSession, getSessionUser, revokeSession };
