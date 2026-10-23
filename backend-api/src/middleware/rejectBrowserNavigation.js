const rejectBrowserNavigation = (req, res, next) => {
  const fetchMode = req.get('sec-fetch-mode');
  const fetchDestination = req.get('sec-fetch-dest');

  if (fetchMode === 'navigate' || fetchDestination === 'document') {
    return res.sendStatus(404);
  }

  return next();
};

module.exports = rejectBrowserNavigation;
