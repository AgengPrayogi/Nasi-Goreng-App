const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { name: 'rs0', count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  const { connectDB } = require('../src/config/db');
  await connectDB();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (replSet) await replSet.stop();
});

test('Customer stores separate WhatsApp utility and marketing consent', async () => {
  const Customer = require('../src/models/Customer');
  const customer = await Customer.create({
    name: 'Ayu',
    phone: '08120000001',
    whatsappConsent: {
      utility: {
        enabled: true,
        source: 'order_checkout',
        textVersion: 'wa-consent-v1',
        consentedAt: new Date()
      },
      marketing: { enabled: false }
    }
  });

  expect(customer.whatsappConsent.utility.enabled).toBe(true);
  expect(customer.whatsappConsent.marketing.enabled).toBe(false);
  expect(customer.whatsappConsent.utility.source).toBe('order_checkout');
});

test('WhatsApp outbox persists delivery state and enforces idempotency keys', async () => {
  const Customer = require('../src/models/Customer');
  const WhatsAppMessage = require('../src/models/WhatsAppMessage');
  await WhatsAppMessage.createCollection();
  await WhatsAppMessage.collection.createIndex({ idempotencyKey: 1 }, { unique: true });
  const customer = await Customer.create({ name: 'Budi', phone: '08120000002' });
  const payload = {
    customer: customer._id,
    recipient: '+6281200000002',
    category: 'utility',
    templateName: 'order_status',
    language: 'id',
    source: 'order.confirmed',
    sourceId: 'order-123',
    idempotencyKey: 'order-123:confirmed',
    consentSnapshot: {
      source: 'order_checkout',
      textVersion: 'wa-consent-v1',
      consentedAt: new Date()
    }
  };

  const message = await WhatsAppMessage.create(payload);
  expect(message.status).toBe('queued');
  expect(message.attempts).toBe(0);
  await expect(WhatsAppMessage.create(payload)).rejects.toMatchObject({ code: 11000 });
});