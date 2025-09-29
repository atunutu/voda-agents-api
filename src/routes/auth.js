// Auth routes: login (issue access token) and logout (no-op for now).

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');          
const prisma = require('../db/prisma');

const router = express.Router();

// Helper to sign a short-lived access token
function signAccessToken(agent) {
  // Token subject is the agent id; include phone for convenience
  const secret = process.env.JWT_ACCESS_SECRET || 'test-only-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  //generate a unique id token 
  const jti = randomUUID(); 
  return jwt.sign(
    { sub: agent.id, phone: agent.phone, jti }, 
    secret,
    { expiresIn });
}

/**
 * Agent login
 * Body: { phone: string, password: string }
 * Success: { accessToken: string }
 */
router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};

  // returns error if phone or password is empty
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }

  try {
    const agent = await prisma.agent.findUnique({ where: { phone } });

    //return error if agent does not exist or inactive
    if (!agent) 
        return res.status(401).json({ error: 'Invalid credentials' });
    if (agent.status !== 'ACTIVE') 
        return res.status(403).json({ error: 'Agent not active' });

    const ok = await bcrypt.compare(password, agent.password);

    //return error if passwords do not match
    if (!ok) 
        return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken(agent);
    return res.json({ accessToken });
  }catch (e) {
    // avoid leaking internals
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Agent logout
 * Reads the current Bearer token, records its jti in the RevokedToken table
 * so it can’t be used again.
 */
router.post('/logout', async (req, res) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) 
    return res.status(401).json({ error: 'Missing Authorization token' });
  
  try {
    const secret = process.env.JWT_ACCESS_SECRET || 'test-only-secret';
    const decoded = jwt.verify(token, secret); // safe; already verified earlier

    // if no jti, nothing to revoke (older tokens); just return 204
    if (!decoded.jti) 
        return res.status(204).send();

    // Convert JWT exp (seconds since epoch) to JS Date
    const expiresAt = new Date(decoded.exp * 1000);

    // Upsert in case of duplicate calls
    await prisma.revokedToken.upsert({
      where: { jti: decoded.jti },
      update: { expiresAt },
      create: { jti: decoded.jti, expiresAt }
    });

    return res.status(204).send();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
