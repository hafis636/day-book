const requirePermission = (permissionKey) => (req, res, next) => {
  if (req.authenticatedUser?.permissions?.[permissionKey] !== true) {
    return res.status(403).json({ error: 'You do not have permission to perform this action' });
  }

  return next();
};

module.exports = requirePermission;
