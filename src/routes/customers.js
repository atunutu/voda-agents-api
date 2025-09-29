// Customer routes: registration + listing activity.
// Security: both routes require a valid JWT (requireAuth).

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../db/prisma');

const router = express.Router();

/**
 * Very small validation helper for this branch.
 * We keep it readable; later we can replace with a real validation lib if needed.
 */
function validateCustomerBody(body) {
  const errors = [];

  function nonEmptyStr(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  // name
  if (!nonEmptyStr(body.name)) errors.push('name is required');

  // dob: accept YYYY-MM-DD or ISO string; must be a valid date in the past
  if (!nonEmptyStr(body.dob)) {
    errors.push('dob is required');
  } else {
    const d = new Date(body.dob);
    if (Number.isNaN(d.getTime())) errors.push('dob must be a valid date (YYYY-MM-DD)');
    else if (d > new Date()) errors.push('dob cannot be in the future');
  }

  // region/district/ward
  if (!nonEmptyStr(body.region)) errors.push('region is required');
  if (!nonEmptyStr(body.district)) errors.push('district is required');
  if (!nonEmptyStr(body.ward)) errors.push('ward is required');

 // nida: must be exactly 20 digits (0-9)
  if (!nonEmptyStr(body.nida)) {
    errors.push('nida is required');
  } else if (!/^\d{20}$/.test(body.nida)) {
    errors.push('nida must be exactly 20 digits');
  }

  return errors;
}

/**
 * (c) Register customer
 * Body: { name, dob, region, district, ward, nida }
 * Rules:
 *  - Must be authenticated (token)
 *  - NIDA must be unique (globally) for this simple demo
 */
router.post('/', requireAuth, async (req, res) => {
  const errors = validateCustomerBody(req.body || {});
  if (errors.length) {
    return res.status(400).json({ error: 'ValidationError', details: errors });
  }

  const { name, dob, region, district, ward, nida } = req.body;

    try {
    // Enforce unique NIDA 
    const exists = await prisma.customer.findUnique({ where: { nida } });
    if (exists) return res.status(409).json({ error: 'Customer with this NIDA already exists' });

    const created = await prisma.customer.create({
      data: {
        name: name.trim(),
        dob: new Date(dob),
        region: region.trim(),
        district: district.trim(),
        ward: ward.trim(),
        nida: nida.trim(),
        agentId: req.user.id
      },
      select: { id: true }
    });

    return res.status(201).json(created);
  } catch (e) {
    return res.status(500).json({ error: 'Create customer failed' });
  }
});

/**
 * (d) Agent recent registrations (paginated + searchable)
 * GET /agents/me/registrations?page=1&pageSize=10&search=smith
 *
 * Search across: name, nida, region, district, ward (case-insensitive contains)
 */
router.get('/agents/me/registrations', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  // Filter to current agent and enforce optional search filter
  const where = {
    agentId: req.user.id,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nida: { contains: search, mode: 'insensitive' } },
            { region: { contains: search, mode: 'insensitive' } },
            { district: { contains: search, mode: 'insensitive' } },
            { ward: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.customer.count({ where })
  ]);

  return res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
});

module.exports = router;
