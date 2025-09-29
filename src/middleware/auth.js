// Simple JWT auth middleware.
// Looks for Authorization: Bearer <token> and verifies it.

const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' '); // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || 'test-only-secret';
    const payload = jwt.verify(token, secret);

    // Check if this token’s jti is revoked
    if (payload.jti) {
      const revoked = await prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
      if (revoked) 
        return res.status(401).json({ error: 'Token revoked' });
    }
    // Attach user payload to req for next handlers
    req.user = { id: payload.sub, phone: payload.phone, jti: payload.jti };

    // If valid continue to next route handler
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
