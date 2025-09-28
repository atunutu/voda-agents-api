// Agent routes: profile and, later, recent registrations.
// For this branch only profile is done

const express = require('express');
const { agents } = require('../data/agents');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * (b) Get logged-in Agent profile
 * Auth: Bearer <accessToken>
 * Response: id, name, phone, location (region, district, ward), status
 */
router.get('/me', requireAuth, (req, res) => {
//find agent in db, if not found return error
  const agent = agents.find(a => a.id === req.user.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Only return non-sensitive fields
  const { id, name, phone, region, district, ward, status } = agent;
  return res.json({ id, name, phone, region, district, ward, status });
});

module.exports = router;
