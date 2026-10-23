const { getSessionUser } = require('../services/sessionService');
const { getSessionToken } = require('../utils/sessionToken');

const requireAuthenticatedSession = async (req, res, next) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const session = await getSessionUser(token);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.authenticatedUser = session.user;
    return next();
  } catch (error) {
    console.error('Failed to authenticate project request:', error);
    return res.status(500).json({ error: 'Failed to authenticate request' });
  }
};

module.exports = requireAuthenticatedSession;
