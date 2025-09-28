// Simple JWT auth middleware.
// Looks for Authorization: Bearer <token> and verifies it.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' '); // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // Attach user payload to req for next handlers
    req.user = { id: payload.sub, phone: payload.phone };

    // If valid continue to next route handler
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
