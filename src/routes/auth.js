// Auth routes: login (issue access token) and logout (no-op for now).

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { agents } = require('../data/agents');

const router = express.Router();

// Helper to sign a short-lived access token
function signAccessToken(agent) {
  // Token subject is the agent id; include phone for convenience
  return jwt.sign(
    { sub: agent.id, phone: agent.phone },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
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

  const agent = agents.find(a => a.phone === phone);

  //return error if input phone is not associated to any agent
  if (!agent) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check status of agent
  if (agent.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Agent not active' });
  }

  //returns error if password does not match
  const ok = await bcrypt.compare(password, agent.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = signAccessToken(agent);
  return res.json({ accessToken });
});

/**
 * Agent logout
 * Returns 204 to complete the flow for now.
 */
router.post('/logout', (_req, res) => {
  return res.status(204).send();
});

module.exports = router;
