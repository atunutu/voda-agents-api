// Auth routes: login (issue access token) and logout (no-op for now).

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { agents } = require('../data/agents');
const prisma = require('../db/prisma');

const router = express.Router();

// Helper to sign a short-lived access token
function signAccessToken(agent) {
  // Token subject is the agent id; include phone for convenience
  const secret = process.env.JWT_ACCESS_SECRET || 'test-only-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign({ sub: agent.id, phone: agent.phone }, secret, { expiresIn });
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
 * Returns 204 to complete the flow for now.
 */
router.post('/logout', (_req, res) => {
  return res.status(204).send();
});

module.exports = router;
