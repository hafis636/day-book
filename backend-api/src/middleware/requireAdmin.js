const requireAdmin = (req, res, next) => {
  const role = String(req.authenticatedUser?.role || '').trim().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required' });
  }

  return next();
};

module.exports = requireAdmin;
