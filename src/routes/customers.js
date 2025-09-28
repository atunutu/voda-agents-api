// Customer routes: registration + listing activity.
// Security: both routes require a valid JWT (requireAuth).

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { customers, uid } = require('../data/customers');

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
router.post('/', requireAuth, (req, res) => {
  const errors = validateCustomerBody(req.body || {});
  if (errors.length) {
    return res.status(400).json({ error: 'ValidationError', details: errors });
  }

  const { name, dob, region, district, ward, nida } = req.body;

  // Check duplicate NIDA (global uniqueness)
  const exists = customers.find(c => c.nida === nida);
  if (exists) {
    return res.status(409).json({ error: 'Customer with this NIDA already exists' });
  }

  // Parse date reliably
  const dobDate = new Date(dob);

  const newCustomer = {
    id: uid(),
    agentId: req.user.id, // from requireAuth
    name: name.trim(),
    dob: dobDate.toISOString(),
    region: region.trim(),
    district: district.trim(),
    ward: ward.trim(),
    nida: nida.trim(),
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  return res.status(201).json({ id: newCustomer.id });
});


module.exports = router;
