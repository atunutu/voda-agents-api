const request = require('supertest');
const app = require('../src/app');
const { DEMO_PASSWORD } = require('../src/data/agents');

describe('Auth', () => {
  it('logs in with valid phone/password and returns a token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ phone: '255700000001', password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ phone: '255700000001', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
