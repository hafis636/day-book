const { pool } = require('../config/db');
const { createHmac, randomInt, timingSafeEqual } = require('crypto');

const OTP_EXPIRY_MINUTES = 5;

const confirmUserContact = async (contact) => {
  const serverSecret = process.env.OTP_SERVER_SECRET;
  if (!serverSecret) {
    throw new Error('OTP_SERVER_SECRET is not configured');
  }

  const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
  console.log("otp generated ",otp)
  const otpHash = createHmac('sha256', serverSecret).update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `SELECT id
       FROM "daybook-dev-db".users
       WHERE LOWER(email) = $1 OR mobile_number = $2
       LIMIT 1
       FOR UPDATE`,
      [contact.toLowerCase(), contact]
    );

    if (userResult.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }

    const userId = userResult.rows[0].id;
    await client.query(
      `UPDATE "daybook-dev-db".otp_verifications
       SET used_at = NOW()
       WHERE user_id = $1
         AND purpose = 'login'
         AND used_at IS NULL`,
      [userId]
    );
    await client.query(
      `INSERT INTO "daybook-dev-db".otp_verifications
         (user_id, otp_hash, purpose, expires_at)
       VALUES ($1, $2, 'login', $3)`,
      [userId, otpHash, expiresAt]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const validateOtp = async (contact, otp) => {
  const serverSecret = process.env.OTP_SERVER_SECRET;
  if (!serverSecret) {
    throw new Error('OTP_SERVER_SECRET is not configured');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT u.id AS user_id, ov.ctid::text AS row_ctid, ov.otp_hash, ov.expires_at,
              ov.attempts, ov.max_attempts
       FROM "daybook-dev-db".users AS u
       INNER JOIN "daybook-dev-db".otp_verifications AS ov ON ov.user_id = u.id
       WHERE (LOWER(u.email) = $1 OR u.mobile_number = $2)
         AND ov.purpose = 'login'
         AND ov.used_at IS NULL
       ORDER BY ov.created_at DESC
       LIMIT 1
       FOR UPDATE OF ov`,
      [contact.toLowerCase(), contact]
    );

    const verification = result.rows[0];
    if (
      !verification ||
      new Date(verification.expires_at) <= new Date() ||
      verification.attempts >= verification.max_attempts
    ) {
      await client.query('COMMIT');
      return { valid: false };
    }

    const submittedHash = createHmac('sha256', serverSecret).update(otp).digest();
    const storedHash = Buffer.from(verification.otp_hash, 'hex');
    const matches =
      storedHash.length === submittedHash.length &&
      timingSafeEqual(storedHash, submittedHash);

    if (matches) {
      await client.query(
        `UPDATE "daybook-dev-db".otp_verifications
         SET used_at = NOW()
         WHERE ctid = $1::tid`,
        [verification.row_ctid]
      );
      await client.query('COMMIT');
      return { valid: true, userId: verification.user_id };
    }

    await client.query(
      `UPDATE "daybook-dev-db".otp_verifications
       SET attempts = attempts + 1
       WHERE ctid = $1::tid`,
      [verification.row_ctid]
    );
    await client.query('COMMIT');
    return { valid: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { confirmUserContact, validateOtp };
