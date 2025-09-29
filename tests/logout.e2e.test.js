const prisma  = require('./_prisma');
const request = require('supertest');
const app     = require('../src/app');
const bcrypt  = require('bcryptjs');

const PHONE = '255700000001';
const PASS  = 'Agent@123';

beforeEach(async () => {
  // ensure clean slate re: revocations & customers for this phone
  await prisma.revokedToken.deleteMany({});
  await prisma.customer.deleteMany({});
  // upsert agent so it always exists for the test
  const hash = await bcrypt.hash(PASS, 10);
  await prisma.agent.upsert({
    where: { phone: PHONE },
    update: { password: hash, status: 'ACTIVE' },
    create: {
      name: 'Jane Agent',
      phone: PHONE,
      password: hash,
      region: 'Dar es Salaam',
      district: 'Ilala',
      ward: 'Upanga',
      status: 'ACTIVE'
    }
  });
});

afterAll(async () => {
  await prisma.revokedToken.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.$disconnect();
});

async function login() {
  const res = await request(app).post('/auth/login').send({ phone: PHONE, password: PASS });
  if (res.status !== 200) {
    // helps if something goes wrong
    // eslint-disable-next-line no-console
    console.error('LOGIN FAILED', res.status, res.body);
  }
  expect(res.status).toBe(200);
  return res.body.accessToken;
}

describe('Logout', () => {
  it('revokes the current token and prevents further use', async () => {
    const token = await login();

    // Token works before logout
    const before = await request(app).get('/agents/me').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    // Logout
    const out = await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(out.status).toBe(204);

    // Retry a couple times in case the revocation row isn't visible for a tick
    let after;
    for (let i = 0; i < 3; i++) {
      after = await request(app).get('/agents/me').set('Authorization', `Bearer ${token}`);
      if (after.status !== 200) break; // 401 or 403 is what we want
      await new Promise(r => setTimeout(r, 25)); // 25–50ms is plenty
    }
    expect(after.status).toBe(401);
    expect(after.body.error).toMatch(/revoked/i);
  });

  it('new login still works after old token is revoked', async () => {
    const token = await login();
    const res = await request(app).get('/agents/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
