const request = require('supertest');
const app = require('../src/app');
const { DEMO_PASSWORD } = require('../src/data/agents');

async function loginAndGetToken() {
  const res = await request(app)
    .post('/auth/login')
    .send({ phone: '255700000001', password: DEMO_PASSWORD });
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
