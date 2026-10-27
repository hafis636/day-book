const requireNonAdmin = (req, res, next) => {
  const role = String(req.authenticatedUser?.role || '').trim().toLowerCase();
  if (role === 'admin') {
    return res.status(403).json({ error: 'Access to plans is not allowed for admin users' });
  }

  return next();
};

module.exports = requireNonAdmin;
