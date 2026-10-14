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
  process.env.JWT_SECRET = 'whatsapp-test-jwt-secret-key-minimum-32-chars';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  delete process.env.CORS_ORIGINS;
  process.env.WHATSAPP_ENABLED = 'false';
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_ACCESS_TOKEN;

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

  const WhatsAppMessage = require('../src/models/WhatsAppMessage');
  await WhatsAppMessage.createCollection();
  await WhatsAppMessage.collection.createIndex({ idempotencyKey: 1 }, { unique: true });
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

describe('WhatsApp Business Cloud API', () => {
  test('rejects a send when the customer has no stored consent', async () => {
    const Customer = require('../src/models/Customer');
    const customer = await Customer.create({ name: 'No Consent', phone: '08120000001' });
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer._id,
        templateKey: 'order_confirmed',
        variables: { customer_name: 'No Consent', order_code: 'NGP-123' },
        source: 'order.confirmed',
        sourceId: 'order-no-consent'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('OPT_IN_REQUIRED');
  });

  test('persists an opted-in message in the outbox while delivery is disabled', async () => {
    const Customer = require('../src/models/Customer');
    const customer = await Customer.create({
      name: 'Opted In',
      phone: '08120000002',
      whatsappConsent: {
        utility: { enabled: true, source: 'customer_request', textVersion: 'wa-v1', consentedAt: new Date() }
      }
    });
    const res = await request(app)
      .post('/api/whatsapp/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer._id,
        templateKey: 'order_confirmed',
        variables: { customer_name: 'Opted In', order_code: 'NGP-124' },
        source: 'order.confirmed',
        sourceId: 'order-opted-in'
      });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('queued');
    expect(res.body.data.provider).toBe('meta_cloud_api');
    expect(await require('../src/models/WhatsAppMessage').countDocuments({ customer: customer._id })).toBe(1);
  });
});
