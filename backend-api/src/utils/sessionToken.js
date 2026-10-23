const SESSION_COOKIE_NAME = 'daybook_session';

const getSessionToken = (req) => {
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  return sessionCookie ? sessionCookie.slice(SESSION_COOKIE_NAME.length + 1) : '';
};

module.exports = { getSessionToken };
