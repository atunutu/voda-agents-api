const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
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

// helper to get a token via login
async function login() {
  const res = await request(app)
    .post('/auth/login')
    .send({ phone: PHONE, password: PASS });
  return res.body.accessToken;
}

describe('Customers', () => {
  it('creates a customer successfully', async () => {
    const token = await login();

    const res = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Doe',
        dob: '1990-01-01',
        region: 'Dar es Salaam',
        district: 'Kinondoni',
        ward: 'Masaki',
        nida: '12345678901234567890'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('rejects invalid NIDA length/format', async () => {
    const token = await login();
    const bad1 = await request(app)
        .post('/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Bad Nida',
            dob: '1990-01-01',
            region: 'Dar',
            district: 'Ilala',
            ward: 'Upanga',
            nida: '1234567890' // only 10 digits
        });
    expect(bad1.status).toBe(400);
    expect(bad1.body.details).toContain('nida must be exactly 20 digits');

    const bad2 = await request(app)
        .post('/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Bad Nida 2',
            dob: '1990-01-01',
            region: 'Dar',
            district: 'Ilala',
            ward: 'Upanga',
            nida: '12345ABC901234567890' // non-digits
        });
    expect(bad2.status).toBe(400);
    expect(bad2.body.details).toContain('nida must be exactly 20 digits');
  });


  it('rejects duplicate NIDA', async () => {
    const token = await login();

    const first = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Citizen',
        dob: '1985-05-05',
        region: 'Dar es Salaam',
        district: 'Ilala',
        ward: 'Upanga',
        nida: '12345678901234567870'
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Another Person',
        dob: '1980-02-02',
        region: 'Dar es Salaam',
        district: 'Temeke',
        ward: 'Kurasini',
        nida: '12345678901234567870' // duplicate
      });

    expect(second.status).toBe(409);
  });

  it('lists recent registrations with pagination and search', async () => {
    const token = await login();

    // create a couple
    await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Alpha Smith',
        dob: '1991-03-03',
        region: 'Dar',
        district: 'Ilala',
        ward: 'Upanga',
        nida: '12345678901234567892'
      });

    await request(app)
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Beta Johnson',
        dob: '1992-04-04',
        region: 'Dar',
        district: 'Kinondoni',
        ward: 'Masaki',
        nida: '12345678901234567893'
      });

    const res = await request(app)
      .get('/customers/agents/me/registrations?page=1&pageSize=1&search=beta')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].name.toLowerCase()).toContain('beta');

    const all = await request(app)
      .get('/customers/agents/me/registrations?page=1&pageSize=1')
      .set('Authorization', `Bearer ${token}`);

    expect(all.status).toBe(200);
    expect(all.body.total).toBeGreaterThanOrEqual(2); 
  });
});
