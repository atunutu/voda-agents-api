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
router.get('/me', requireAuth, async (req, res) => {
  //find agent in db, if not found return error
  const agentId = req.user.id;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, phone: true, region: true, district: true, ward: true, status: true }
  });

  if (!agent) 
    return res.status(404).json({ error: 'Agent not found' }); 
  // Only return non-sensitive fields
  return res.json(agent);
});

module.exports = router;
