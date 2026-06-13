const request = require('supertest');
const app = require('../src/index');

// Mock the database so tests don't need a real PostgreSQL
jest.mock('../src/db/connection', () => ({
  query: jest.fn(),
}));

// Mock mailer so tests don't send real emails
jest.mock('../src/middleware/mailer', () => ({
  notifyNewOrder: jest.fn().mockResolvedValue(true),
  notifyContact:  jest.fn().mockResolvedValue(true),
}));

const db = require('../src/db/connection');

// ── HEALTH CHECK ──────────────────────────────────
describe('GET /api/health', () => {
  it('returns healthy status', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('Deba Technologies API');
  });

  it('returns unhealthy when DB is down', async () => {
    db.query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
  });
});

// ── ORDERS ────────────────────────────────────────
describe('POST /api/orders', () => {
  const validOrder = {
    client_name: 'Test Client',
    client_email: 'test@example.com',
    client_country: 'India',
    service_type: 'IT Support & Helpdesk',
    project_description: 'I need help setting up a network for my small office of 10 users.',
    hourly_rate_inr: 150,
  };

  it('✅ creates order with valid data', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, order_id: 'DT-20260613-AB123', created_at: new Date() }]
    });
    const res = await request(app).post('/api/orders').send(validOrder);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order_id).toMatch(/^DT-/);
  });

  it('❌ rejects rate below ₹80', async () => {
    const res = await request(app).post('/api/orders').send({ ...validOrder, hourly_rate_inr: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/80/);
  });

  it('❌ rejects rate of exactly ₹79', async () => {
    const res = await request(app).post('/api/orders').send({ ...validOrder, hourly_rate_inr: 79 });
    expect(res.status).toBe(400);
  });

  it('✅ accepts rate of exactly ₹80 (minimum)', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 2, order_id: 'DT-20260613-CD456', created_at: new Date() }]
    });
    const res = await request(app).post('/api/orders').send({ ...validOrder, hourly_rate_inr: 80 });
    expect(res.status).toBe(201);
  });

  it('❌ rejects missing client name', async () => {
    const { client_name, ...noName } = validOrder;
    const res = await request(app).post('/api/orders').send(noName);
    expect(res.status).toBe(400);
  });

  it('❌ rejects invalid email', async () => {
    const res = await request(app).post('/api/orders').send({ ...validOrder, client_email: 'notanemail' });
    expect(res.status).toBe(400);
  });

  it('❌ rejects description too short', async () => {
    const res = await request(app).post('/api/orders').send({ ...validOrder, project_description: 'Too short' });
    expect(res.status).toBe(400);
  });

  it('❌ rejects missing service type', async () => {
    const { service_type, ...noService } = validOrder;
    const res = await request(app).post('/api/orders').send(noService);
    expect(res.status).toBe(400);
  });
});

// ── ORDER STATUS ──────────────────────────────────
describe('GET /api/orders/status/:orderId', () => {
  it('✅ returns order for valid ID', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ order_id: 'DT-20260613-AB123', service_type: 'IT Support', status: 'new', created_at: new Date() }]
    });
    const res = await request(app).get('/api/orders/status/DT-20260613-AB123');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('new');
  });

  it('❌ rejects invalid order ID format', async () => {
    const res = await request(app).get('/api/orders/status/INVALID-ID');
    expect(res.status).toBe(400);
  });

  it('❌ returns 404 for unknown order', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/orders/status/DT-20260613-XXXXX');
    expect(res.status).toBe(404);
  });
});

// ── CONTACT ───────────────────────────────────────
describe('POST /api/contact', () => {
  it('✅ saves contact message', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/contact').send({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I would like to know more about your services.'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ rejects message too short', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'John', email: 'john@example.com', message: 'Hi'
    });
    expect(res.status).toBe(400);
  });
});

// ── 404 ───────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
