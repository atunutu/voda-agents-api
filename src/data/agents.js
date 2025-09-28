// Minimal in-memory "database" of agents.
// NOTE: Later this will be replaced this with a real DB
const bcrypt = require('bcrypt');

// Pre-hash a reasonable demo password.
// In production we will store only the hash from a registration step.
const DEMO_PASSWORD = 'Agent@123';
const HASHED = bcrypt.hashSync(DEMO_PASSWORD, 10);

const agents = [
  {
    id: 'a1',
    name: 'Jane Agent',
    phone: '255700000001', // local sample format
    passwordHash: HASHED,
    region: 'Dar es Salaam',
    district: 'Ilala',
    ward: 'Upanga',
    status: 'ACTIVE'
  }
];

module.exports = {
  agents,
  DEMO_PASSWORD // exported only so you can test easily
};
