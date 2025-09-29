const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
const prisma = require('./_prisma');

const PHONE = '255700000001';
const PASS = 'Agent@123';

beforeAll(async () => {
  // Ensure a known agent exists for these tests
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
  // Clean and disconnect
  await prisma.customer.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.$disconnect();
});

describe('Auth', () => {
  it('logs in with valid phone/password and returns a token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ phone: PHONE, password: PASS });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ phone: PHONE, password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
