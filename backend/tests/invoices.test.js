const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;
let orderCode;

const testPassword = 'TestPass123!';

async function setupEnvAndApp() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { name: 'rs0', count: 1 }
  });
  if (typeof replSet.waitUntilRunning === 'function') {
    await replSet.waitUntilRunning();
  }

  process.env.MONGODB_URI = replSet.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-minimum-32-chars';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  delete process.env.CORS_ORIGINS;

  const { connectDB } = require('../src/config/db');
  await connectDB();
  app = require('../src/app');
}

beforeAll(async () => {
  await setupEnvAndApp();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
});

describe('Invoice API', () => {
  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'admin@example.com', password: testPassword })
      .expect(201);

    const admin = await require('../src/models/Admin').findOne({ email: 'admin@example.com' });
    admin.isVerified = true;
    await admin.save();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: testPassword })
      .expect(200);
    adminToken = loginRes.body.data.token;
  });

  beforeEach(async () => {
    const menuRes = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Goreng',
        description: 'Enak',
        price: 15000,
        ingredients: []
      })
      .expect(201);

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        channel: 'online',
        items: [{ menuId: menuRes.body.data._id, quantity: 2 }],
        customerName: 'Budi',
        customerPhone: '081234567890',
      })
      .expect(201);
    orderCode = orderRes.body.data.orderCode;

    await request(app)
      .patch(`/api/orders/${orderRes.body.data._id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid', paymentMethod: 'cash' })
      .expect(200);
  });

  it('GET /api/invoices/order/:orderCode returns PDF', async () => {
    const res = await request(app)
      .get(`/api/invoices/order/${orderCode}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(orderCode);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/invoices/preview/order/:orderCode returns base64 JSON', async () => {
    const res = await request(app)
      .get(`/api/invoices/preview/order/${orderCode}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dataUrl).toContain('data:application/pdf;base64,');
    expect(res.body.data.orderCode).toBe(orderCode);
  });

  it('GET /api/invoices/admin/orders/:id returns PDF with auth', async () => {
    const trackRes = await request(app)
      .get(`/api/orders/track/${orderCode}`)
      .expect(200);
    const id = trackRes.body.data._id;

    const res = await request(app)
      .get(`/api/invoices/admin/orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(orderCode);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/invoices/admin/orders/:id rejects without auth', async () => {
    const trackRes = await request(app)
      .get(`/api/orders/track/${orderCode}`)
      .expect(200);
    const id = trackRes.body.data._id;

    const res = await request(app)
      .get(`/api/invoices/admin/orders/${id}`);

    expect(res.status).toBe(401);
  });

  it('GET /api/invoices/order/:orderCode returns 404 for unknown code', async () => {
    const res = await request(app)
      .get('/api/invoices/order/NGP-20260101-000001');
    expect(res.status).toBe(404);
  });
});