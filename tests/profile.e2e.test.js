const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcrypt');
const prisma = require('./_prisma');

const PHONE = '255700000001';
const PASS = 'Agent@123';

beforeAll(async () => {
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
  await prisma.customer.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.$disconnect();
});

async function loginAndGetToken() {
  const res = await request(app)
    .post('/auth/login')
    .send({ phone: PHONE, password: PASS});
  return res.body.accessToken;
}

describe('Agent profile', () => {
  it('returns profile for logged-in agent', async () => {
    const token = await loginAndGetToken();

    const res = await request(app)
      .get('/agents/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('phone', '255700000001');
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/agents/me');
    expect(res.status).toBe(401);
  });
});
