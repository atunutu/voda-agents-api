// Agent routes: profile and, later, recent registrations.
// For this branch only profile is done
const prisma = require('../db/prisma');
const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * (b) Get logged-in Agent profile
 * Auth: Bearer <accessToken>
 * Response: id, name, phone, location (region, district, ward), status
 */
router.get('/me', requireAuth, async (req, res) => {
  //find agent in db, if not found return error
  try {
    const agent = await prisma.agent.findUnique({
      where: { phone: req.user.phone },
      select: { id: true, name: true, phone: true, region: true, district: true, ward: true, status: true }
    });
    if (!agent) 
      return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (e) {
      next(e); // let the central error handler print it
  }
});

module.exports = router;
