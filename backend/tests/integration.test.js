/**
 * Integration tests against a real in-memory MongoDB replica set (transactions supported).
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;
let ingredientId;
let menuId;
let orderId;
let orderCode;

// Use strong password that meets requirements: 8+ chars, uppercase, lowercase, number, special char
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
  process.env.ALLOW_ADMIN_REGISTER = 'false';
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

describe('Nasi Goreng Polonia API', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  test('admin bootstrap: first register succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'owner@example.com', password: testPassword })
      .expect(201);
    expect(res.body.data.email).toBe('owner@example.com');
  });

  test('admin bootstrap: second register blocked without ALLOW_ADMIN_REGISTER', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'other@example.com', password: testPassword })
      .expect(403);
    expect(res.body.errorCode).toBe('ADMIN_REGISTER_DISABLED');
  });

  test('admin bootstrap: second register allowed when ALLOW_ADMIN_REGISTER=true', async () => {
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'other@example.com', password: testPassword })
      .expect(201);
    expect(res.body.data.email).toBe('other@example.com');
    process.env.ALLOW_ADMIN_REGISTER = 'false';
  });

  test('POST /api/auth/login returns JWT', async () => {
    // Must verify email first
    const admin = await require('../src/models/Admin').findOne({ email: 'owner@example.com' });
    admin.isVerified = true;
    await admin.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: testPassword })
      .expect(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.admin.email).toBe('owner@example.com');
    adminToken = res.body.data.token;
  });

  test('ingredients CRUD + low stock', async () => {
    const create = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Beras',
        unit: 'gram',
        currentStock: 5000,
        minimumStock: 100
      })
      .expect(201);
    expect(create.body.data.name).toBe('Beras');
    ingredientId = create.body.data._id;

    const read = await request(app)
      .get(`/api/ingredients/${ingredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(read.body.data.name).toBe('Beras');

    const update = await request(app)
      .patch(`/api/ingredients/${ingredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minimumStock: 200 })
      .expect(200);
    expect(update.body.data.minimumStock).toBe(200);

    const list = await request(app)
      .get('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  test('menus: admin create + public list', async () => {
    const createMenu = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Goreng Spesial',
        description: 'Nasi goreng dengan telur dan ayam',
        price: 25000,
        ingredients: []
      })
      .expect(201);
    expect(createMenu.body.data.name).toBe('Nasi Goreng Spesial');
    menuId = createMenu.body.data._id;

    const listPublic = await request(app)
      .get('/api/menus')
      .expect(200);
    expect(listPublic.body.data.length).toBeGreaterThan(0);
  });

  test('orders: online requires customer fields', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'online',
        items: [{ menuId, quantity: 2 }]
      })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  test('orders: create (public) returns orderCode (walk-in)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId, quantity: 1 }]
      })
      .expect(201);
    expect(res.body.data.orderCode).toBeTruthy();
    // Order code format: NGP-YYYYMMDD-XXXXXX
    expect(res.body.data.orderCode).toMatch(/^NGP-\d{8}-[A-F0-9]{6}$/);
    orderCode = res.body.data.orderCode;
    orderId = res.body.data._id;
  });

  test('orders: create online with contact', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'online',
        items: [{ menuId, quantity: 2 }],
        customerName: 'Ageng',
        customerPhone: '081234567890'
      })
      .expect(201);
    expect(res.body.data.customerName).toBe('Ageng');
  });

  test('orders: public track by orderCode', async () => {
    const res = await request(app)
      .get(`/api/orders/track/${orderCode}`)
      .expect(200);
    expect(res.body.data.orderCode).toBe(orderCode);
  });

  test('orders: invalid track code returns validation error', async () => {
    const res = await request(app)
      .get('/api/orders/track/invalid')
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  test('orders: admin list filter by orderCode', async () => {
    const res = await request(app)
      .get(`/api/orders?orderCode=${orderCode}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].orderCode).toBe(orderCode);
  });

  test('orders: admin get by id', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data._id).toBe(orderId);
  });

  test('orders: confirm assigns queue + ETA + kitchen queued', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.kitchenStatus).toBe('queued');
    expect(res.body.data.queueNumber).toBeGreaterThan(0);
    expect(res.body.data.estimatedReadyAt).toBeTruthy();
  });

  test('orders: kitchen queue list', async () => {
    const res = await request(app)
      .get('/api/orders/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toBeDefined();
  });

  test('orders: kitchen status + payment + complete uses transaction', async () => {
    const updateKitchen = await request(app)
      .patch(`/api/orders/${orderId}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'ready' })
      .expect(200);
    expect(updateKitchen.body.data.kitchenStatus).toBe('ready');

    const updatePayment = await request(app)
      .patch(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid', paymentMethod: 'cash' })
      .expect(200);
    expect(updatePayment.body.data.paymentStatus).toBe('paid');

    const complete = await request(app)
      .patch(`/api/orders/${orderId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(complete.body.data.status).toBe('completed');
  });

  test('orders: REQUIRE_PAID_BEFORE_COMPLETE blocks until paid', async () => {
    if (process.env.REQUIRE_PAID_BEFORE_COMPLETE !== 'true') {
      console.log('    skipped (REQUIRE_PAID_BEFORE_COMPLETE not enabled)');
      return;
    }

    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId, quantity: 1 }]
      })
      .expect(201);
    const testOrderId = res.body.data._id;

    await request(app)
      .patch(`/api/orders/${testOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app)
      .patch(`/api/orders/${testOrderId}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'ready' })
      .expect(200);

    const completeUnpaid = await request(app)
      .patch(`/api/orders/${testOrderId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    await request(app)
      .patch(`/api/orders/${testOrderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid', paymentMethod: 'cash' })
      .expect(200);

    const completePaid = await request(app)
      .patch(`/api/orders/${testOrderId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(completePaid.body.data.status).toBe('completed');
  });

  test('reports: sales and top menus', async () => {
    const res = await request(app)
      .get('/api/reports/sales?period=daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toBeDefined();
  });

  test('stock movements: restock', async () => {
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredientId,
        amount: 1000
      })
      .expect(200);
    expect(res.body.data.currentStock).toBe(6000); // 5000 initial + 1000 restock
  });

  test('stock movements: adjustment', async () => {
    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredientId,
        amount: -50
      })
      .expect(200);
    expect(res.body.data.currentStock).toBe(5950); // 6000 - 50 adjustment
  });

  test('orders: cancel flow for pending order', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId, quantity: 1 }]
      })
      .expect(201);
    const pendingOrderId = createRes.body.data._id;

    const cancelRes = await request(app)
      .patch(`/api/orders/${pendingOrderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
  });
});