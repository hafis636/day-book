const {
  createSession,
  getSessionUser,
  revokeSession,
} = require('../services/sessionService');

const SESSION_COOKIE_NAME = 'daybook_session';
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
};

const getSessionToken = (req) => {
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  return sessionCookie ? sessionCookie.slice(SESSION_COOKIE_NAME.length + 1) : '';
};

const createSessionForAuthenticatedUser = async (req, res) => {
  try {
    const session = await createSession(req.authenticatedUserId);
    res.cookie(SESSION_COOKIE_NAME, session.token, {
      ...sessionCookieOptions,
      expires: session.expiresAt,
    });

    return res.json({ valid: true });
  } catch (error) {
    console.error('Failed to create session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
};

const getCurrentSession = async (req, res) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const session = await getSessionUser(token);
    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.cookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions,
      expires: session.expiresAt,
    });
    return res.json({ user: session.user });
  } catch (error) {
    console.error('Failed to load session:', error);
    return res.status(500).json({ error: 'Failed to load session' });
  }
};

const logout = async (req, res) => {
  const token = getSessionToken(req);

  try {
    if (token) {
      await revokeSession(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke session:', error);
    return res.status(500).json({ error: 'Failed to log out' });
  }
};

module.exports = { createSessionForAuthenticatedUser, getCurrentSession, logout };
