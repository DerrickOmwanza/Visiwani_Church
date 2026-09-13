function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  // req.path is relative to wherever this middleware is mounted (e.g. just
  // "/" under app.use('/api/transactions', requireLogin, ...)), so it can't
  // be used to detect API requests here - req.originalUrl always keeps the
  // full path as the client requested it.
  if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Not logged in' });
  return res.redirect('/login.html');
}

module.exports = { requireLogin };
