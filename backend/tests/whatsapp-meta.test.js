const crypto = require('crypto');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;
let originalFetch;

const testPassword = 'TestPass123!';
const webhookPayload = (changes) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'waba-1', changes: [{ field: 'messages', value: changes }] }]
});
const signPayload = (body, secret) => `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')}`;

async function setupEnvAndApp() {
  replSet = await MongoMemoryReplSet.create({ replSet: { name: 'rs0', count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  process.env.JWT_SECRET = 'whatsapp-meta-test-jwt-secret-minimum-32';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  process.env.WHATSAPP_ENABLED = 'true';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-number-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
  process.env.WHATSAPP_APP_SECRET = 'test-meta-app-secret';
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v25.0';
  process.env.WHATSAPP_WORKER_INTERVAL_MS = '60000';
  process.env.N8N_WHATSAPP_WEBHOOK_URL = 'https://n8n.example.test/webhook/whatsapp-events';
  process.env.N8N_WHATSAPP_WEBHOOK_TOKEN = 'n8n-webhook-test-secret-minimum-32-characters';
  process.env.N8N_WHATSAPP_API_KEY = 'n8n-api-test-secret-minimum-32-characters';
  delete process.env.CORS_ORIGINS;

  const { connectDB } = require('../src/config/db');
  await connectDB();
  app = require('../src/app');
  await request(app).post('/api/auth/register-admin').send({
    email: 'owner@example.com',
    password: testPassword,
    confirmPassword: testPassword
  }).expect(201);
  const admin = await require('../src/models/Admin').findOne({ email: 'owner@example.com' });
  admin.isVerified = true;
  await admin.save();
  const login = await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: testPassword }).expect(200);
  adminToken = login.body.data.token;
  process.env.ALLOW_ADMIN_REGISTER = 'false';

  const WhatsAppMessage = require('../src/models/WhatsAppMessage');
  const WhatsAppWebhookEvent = require('../src/models/WhatsAppWebhookEvent');
  const WhatsAppAutomationEvent = require('../src/models/WhatsAppAutomationEvent');
  await WhatsAppMessage.createCollection();
  await WhatsAppWebhookEvent.createCollection();
  await WhatsAppAutomationEvent.createCollection();
  await WhatsAppMessage.collection.createIndex({ idempotencyKey: 1 }, { unique: true });
  await WhatsAppMessage.collection.createIndex({ wamid: 1 }, { unique: true, sparse: true });
  await WhatsAppWebhookEvent.collection.createIndex({ eventKey: 1 }, { unique: true });
  await WhatsAppAutomationEvent.collection.createIndex({ eventId: 1 }, { unique: true });
}

beforeAll(async () => {
  originalFetch = global.fetch;
  await setupEnvAndApp();
});

afterAll(async () => {
  global.fetch = originalFetch;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (replSet) await replSet.stop();
});

describe('Meta Cloud API integration', () => {
  test('checkout records separate consent and order confirmation queues a utility template', async () => {
    const Menu = require('../src/models/Menu');
    const Customer = require('../src/models/Customer');
    const WhatsAppMessage = require('../src/models/WhatsAppMessage');
    const menu = await Menu.create({ name: 'Nasi Uji', price: 25000 });
    const orderService = require('../src/services/orderService');

    const order = await orderService.createOrder({
      items: [{ menuId: menu._id, quantity: 1 }],
      channel: 'online',
      fulfillmentType: 'takeaway',
      customerName: 'Ayu Checkout',
      customerPhone: '08120000011',
      whatsappConsent: { utility: true, marketing: false }
    });
    const customer = await Customer.findById(order.customerId);
    expect(customer.whatsappConsent.utility.enabled).toBe(true);
    expect(customer.whatsappConsent.marketing.enabled).toBe(false);

    await orderService.confirmOrder(order._id);
    const message = await WhatsAppMessage.findOne({ customer: customer._id, source: 'order.confirmed' });
    expect(message.status).toBe('queued');
    expect(message.category).toBe('utility');
  });

  test('queue endpoint reads stored utility consent, not an optIn field supplied by caller', async () => {
    const Customer = require('../src/models/Customer');
    const optedIn = await Customer.create({
      name: 'Ayu',
      phone: '08120000001',
      whatsappConsent: {
        utility: { enabled: true, source: 'order_checkout', textVersion: 'wa-v1', consentedAt: new Date() },
        marketing: { enabled: false }
      }
    });
    const notOptedIn = await Customer.create({ name: 'Budi', phone: '08120000002' });

    const accepted = await request(app)
      .post('/api/whatsapp/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: optedIn._id, templateKey: 'order_confirmed', variables: { customer_name: 'Ayu', order_code: 'NGP-1' }, source: 'order.confirmed', sourceId: 'order-1' })
      .expect(202);
    expect(accepted.body.data.status).toBe('queued');

    const denied = await request(app)
      .post('/api/whatsapp/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: notOptedIn._id, templateKey: 'order_confirmed', variables: { customer_name: 'Budi', order_code: 'NGP-2' }, source: 'order.confirmed', sourceId: 'order-2', optIn: true })
      .expect(400);
    expect(denied.body.errorCode).toBe('OPT_IN_REQUIRED');
    await require('../src/models/WhatsAppMessage').deleteOne({ _id: accepted.body.data.id });
  });

  test('n8n can only queue a consent-checked allowlisted message with its machine key', async () => {
    const Customer = require('../src/models/Customer');
    const customer = await Customer.create({
      name: 'N8n Customer',
      phone: '08120000012',
      whatsappConsent: {
        utility: { enabled: true, source: 'order_checkout', textVersion: 'wa-v1', consentedAt: new Date() },
        marketing: { enabled: false }
      }
    });
    const body = {
      customerId: String(customer._id),
      templateKey: 'order_confirmed',
      variables: { customer_name: 'N8n Customer', order_code: 'NGP-N8N-1' },
      source: 'n8n.order.confirmed',
      sourceId: 'n8n-order-1'
    };

    await request(app).post('/api/whatsapp/automation/messages').send(body).expect(401);
    const response = await request(app)
      .post('/api/whatsapp/automation/messages')
      .set('X-N8N-API-Key', process.env.N8N_WHATSAPP_API_KEY)
      .send(body)
      .expect(202);
    expect(response.body.data.status).toBe('queued');

    await request(app)
      .post('/api/whatsapp/automation/messages')
      .set('X-N8N-API-Key', process.env.N8N_WHATSAPP_API_KEY)
      .send({ ...body, templateKey: 'unapproved_template', sourceId: 'n8n-order-2' })
      .expect(400);
  });

  test('verified inbound messages enter the durable n8n outbox and are delivered with event auth', async () => {
    const WhatsAppAutomationEvent = require('../src/models/WhatsAppAutomationEvent');
    const body = webhookPayload({
      metadata: { phone_number_id: 'test-phone-number-id' },
      contacts: [{ wa_id: '628120000013', profile: { name: 'Incoming Customer' } }],
      messages: [{ id: 'wamid.inbound-n8n-1', from: '628120000013', timestamp: '1700000000', type: 'text', text: { body: 'Halo' } }]
    });
    await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', signPayload(body, process.env.WHATSAPP_APP_SECRET))
      .send(body)
      .expect(200);

    const queued = await WhatsAppAutomationEvent.findOne({ eventId: 'wamid.inbound-n8n-1:inbound' });
    expect(queued.status).toBe('queued');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const { processAutomationEventBatch } = require('../src/services/whatsappWorker');
    expect(await processAutomationEventBatch()).toBeGreaterThanOrEqual(1);
    expect(global.fetch).toHaveBeenCalledWith(
      process.env.N8N_WHATSAPP_WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-NGP-Webhook-Token': process.env.N8N_WHATSAPP_WEBHOOK_TOKEN,
          'X-NGP-Event-ID': 'wamid.inbound-n8n-1:inbound'
        })
      })
    );
    expect((await WhatsAppAutomationEvent.findById(queued._id)).status).toBe('delivered');

    const failed = await WhatsAppAutomationEvent.create({
      eventId: 'wamid.inbound-n8n-failed:inbound',
      eventType: 'inbound_message',
      payload: { eventType: 'inbound_message', text: 'private message content' },
      status: 'failed',
      attempts: 8,
      lastError: 'n8n unavailable'
    });
    const listed = await request(app)
      .get('/api/whatsapp/automation/events?status=failed')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data.events[0].payload).toBeUndefined();
    const retried = await request(app)
      .patch(`/api/whatsapp/automation/events/${failed._id}/retry`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(retried.body.data.status).toBe('queued');
    expect(retried.body.data.attempts).toBe(0);
  });

  test('worker sends an allowlisted template and webhook advances its delivery status', async () => {
    const Customer = require('../src/models/Customer');
    const WhatsAppMessage = require('../src/models/WhatsAppMessage');
    await WhatsAppMessage.updateMany({ status: 'queued' }, { $set: { status: 'failed' } });
    const customer = await Customer.create({
      name: 'Citra',
      phone: '08120000003',
      whatsappConsent: {
        utility: { enabled: true, source: 'order_checkout', textVersion: 'wa-v1', consentedAt: new Date() }
      }
    });
    const queued = await request(app)
      .post('/api/whatsapp/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer._id, templateKey: 'order_confirmed', variables: { customer_name: 'Citra', order_code: 'NGP-3' }, source: 'order.confirmed', sourceId: 'order-3' })
      .expect(202);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.test-3' }] })
    });
    const { processOutboxBatch } = require('../src/services/whatsappWorker');
    await processOutboxBatch();

    const sent = await WhatsAppMessage.findById(queued.body.data.id);
    if (sent.status !== 'sent') throw new Error(`${sent.lastErrorCode}: ${sent.lastError}`);
    expect(sent.status).toBe('sent');
    expect(sent.wamid).toBe('wamid.test-3');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-phone-number-id/messages'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).to).toBe('628120000003');

    const webhookBody = webhookPayload({
      metadata: { phone_number_id: 'test-phone-number-id' },
      statuses: [{ id: 'wamid.test-3', status: 'delivered', timestamp: String(Math.floor(Date.now() / 1000)) }]
    });
    await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', signPayload(webhookBody, process.env.WHATSAPP_APP_SECRET))
      .send(webhookBody)
      .expect(200);

    const delivered = await WhatsAppMessage.findById(queued.body.data.id);
    expect(delivered.status).toBe('delivered');
    expect(delivered.deliveredAt).toBeTruthy();
  });

  test('webhook rejects invalid signatures and STOP revokes both consent categories', async () => {
    const Customer = require('../src/models/Customer');
    const customer = await Customer.create({
      name: 'Dewi',
      phone: '08120000004',
      whatsappConsent: {
        utility: { enabled: true, source: 'order_checkout', textVersion: 'wa-v1', consentedAt: new Date() },
        marketing: { enabled: true, source: 'order_checkout', textVersion: 'wa-v1', consentedAt: new Date() }
      }
    });

    const body = webhookPayload({
      metadata: { phone_number_id: 'test-phone-number-id' },
      messages: [{ id: 'wamid.inbound-4', from: '628120000004', type: 'text', text: { body: 'STOP' } }]
    });
    await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', 'sha256=invalid')
      .send(body)
      .expect(401);
    await request(app)
      .post('/api/whatsapp/webhook')
      .set('X-Hub-Signature-256', signPayload(body, process.env.WHATSAPP_APP_SECRET))
      .send(body)
      .expect(200);

    const optedOut = await Customer.findById(customer._id);
    expect(optedOut.whatsappConsent.utility.enabled).toBe(false);
    expect(optedOut.whatsappConsent.marketing.enabled).toBe(false);
  });
});
