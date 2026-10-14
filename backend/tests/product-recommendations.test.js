const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;

const testPassword = 'TestPass123!';

async function setupEnvAndApp() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { name: 'rs0', count: 1 }
  });
  if (typeof replSet.waitUntilRunning === 'function') {
    await replSet.waitUntilRunning();
  }

  process.env.MONGODB_URI = replSet.getUri();
  process.env.JWT_SECRET = 'product-rec-test-jwt-secret-key-minimum-32-chars';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  delete process.env.CORS_ORIGINS;

  const { connectDB } = require('../src/config/db');
  await connectDB();
  app = require('../src/app');

  const registerRes = await request(app)
    .post('/api/auth/register-admin')
    .send({ email: 'owner@example.com', password: testPassword, confirmPassword: testPassword });

  expect(registerRes.status).toBe(201);

  const admin = await require('../src/models/Admin').findOne({ email: 'owner@example.com' });
  admin.isVerified = true;
  await admin.save();

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: testPassword });

  adminToken = loginRes.body.data.token;
  process.env.ALLOW_ADMIN_REGISTER = 'false';
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

describe('Product review and recommendations', () => {
  test('customer can submit a verified review once per menu item after a completed order', async () => {
    const menu = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Goreng Spesial',
        price: 25000,
        description: 'Nasi goreng dengan telur dan ayam',
        ingredients: []
      })
      .expect(201);

    const customer = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Budi Santoso',
        phone: '08123456789',
        email: 'budi@example.com'
      })
      .expect(201);

    const order = await require('../src/models/Order').create({
      orderCode: 'NGP-00000001-ABCDEF',
      channel: 'online',
      fulfillmentType: 'takeaway',
      customerName: 'Budi Santoso',
      customerPhone: '08123456789',
      customerId: customer.body.data._id,
      status: 'completed',
      paymentStatus: 'paid',
      items: [{ menu: menu.body.data._id, quantity: 2, priceAtOrder: 25000 }],
      totalAmount: 50000
    });

    const reviewRes = await request(app)
      .post(`/api/menus/${menu.body.data._id}/reviews`)
      .send({
        customerId: customer.body.data._id,
        orderCode: order.orderCode,
        rating: 5,
        comment: 'Sangat enak dan cepat'
      })
      .expect(201);

    expect(reviewRes.body.data.rating).toBe(5);
    expect(reviewRes.body.data.comment).toBe('Sangat enak dan cepat');

    const duplicateRes = await request(app)
      .post(`/api/menus/${menu.body.data._id}/reviews`)
      .send({
        customerId: customer.body.data._id,
        orderCode: order.orderCode,
        rating: 4,
        comment: 'Coba lagi'
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.errorCode).toBe('DUPLICATE_MENU_REVIEW');
  });

  test('analytics recommends menu items using sales volume and review quality as the primary signal', async () => {
    const menuA = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ayam Bakar Polonia',
        price: 30000,
        description: 'Ayam bakar dengan sambal khas',
        ingredients: []
      })
      .expect(201);

    const menuB = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Mie Goreng Istimewa',
        price: 26000,
        description: 'Mie goreng dengan telur dan sayur',
        ingredients: []
      })
      .expect(201);

    const customer1 = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Citra', phone: '08120000001', email: 'citra@example.com' })
      .expect(201);

    const customer2 = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dewi', phone: '08120000002', email: 'dewi@example.com' })
      .expect(201);

    await require('../src/models/Order').create({
      orderCode: 'NGP-00000002-ABCDEF',
      customerId: customer1.body.data._id,
      customerName: 'Citra',
      customerPhone: '08120000001',
      status: 'completed',
      paymentStatus: 'paid',
      items: [{ menu: menuA.body.data._id, quantity: 3, priceAtOrder: 30000 }],
      totalAmount: 90000
    });

    await require('../src/models/Order').create({
      orderCode: 'NGP-00000003-ABCDEF',
      customerId: customer2.body.data._id,
      customerName: 'Dewi',
      customerPhone: '08120000002',
      status: 'completed',
      paymentStatus: 'paid',
      items: [{ menu: menuA.body.data._id, quantity: 2, priceAtOrder: 30000 }],
      totalAmount: 60000
    });

    await require('../src/models/Order').create({
      orderCode: 'NGP-00000004-ABCDEF',
      customerId: customer2.body.data._id,
      customerName: 'Dewi',
      customerPhone: '08120000002',
      status: 'completed',
      paymentStatus: 'paid',
      items: [{ menu: menuB.body.data._id, quantity: 1, priceAtOrder: 26000 }],
      totalAmount: 26000
    });

    await request(app)
      .post(`/api/menus/${menuA.body.data._id}/reviews`)
      .send({
        customerId: customer1.body.data._id,
        orderCode: 'NGP-00000002-ABCDEF',
        rating: 5,
        comment: 'Top banget'
      })
      .expect(201);

    await request(app)
      .post(`/api/menus/${menuA.body.data._id}/reviews`)
      .send({
        customerId: customer2.body.data._id,
        orderCode: 'NGP-00000003-ABCDEF',
        rating: 4,
        comment: 'Enak'
      })
      .expect(201);

    const recommendationRes = await request(app)
      .get('/api/analytics/product-recommendations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(recommendationRes.body.data)).toBe(true);
    expect(recommendationRes.body.data[0].menuName).toBe('Ayam Bakar Polonia');
    expect(recommendationRes.body.data[0].score).toBeGreaterThan(0);
  });
});
