function getConfiguredAdminToken() {
  return process.env.ADMIN_API_TOKEN || process.env.ADMIN_TESTER_TOKEN || '';
}

function getRequestAdminToken(req) {
  return req.get('x-admin-token') || '';
}

function isAdminRequest(req) {
  const configuredToken = getConfiguredAdminToken();
  const requestToken = getRequestAdminToken(req);
  return Boolean(configuredToken && requestToken && requestToken === configuredToken);
}

function requireAdmin(req, res, next) {
  if (isAdminRequest(req)) {
    next();
    return;
  }

  res.status(401).json({ error: 'Admin token required.' });
}

module.exports = {
  isAdminRequest,
  requireAdmin
};
