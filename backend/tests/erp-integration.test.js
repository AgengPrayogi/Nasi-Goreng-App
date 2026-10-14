const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');

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
  process.env.JWT_SECRET = 'erp-integration-jwt-secret-key-minimum-32-chars';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  delete process.env.CORS_ORIGINS;

  const { connectDB } = require('../src/config/db');
  await connectDB();
  app = require('../src/app');

  const registerRes = await request(app)
    .post('/api/auth/register-admin')
    .send({ email: 'owner@example.com', password: testPassword, confirmPassword: testPassword });

  if (registerRes.status !== 201) {
    throw new Error('Failed to bootstrap admin');
  }

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

describe('ERP integration', () => {
  test('receiving a purchase order creates stock movement and finance expense exactly once', async () => {
    const ingredient = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cabai',
        unit: 'gram',
        currentStock: 10,
        minimumStock: 2,
        costPerUnit: 20000
      })
      .expect(201);

    const supplier = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supplier Cabai',
        contact: 'Pak Aji',
        phone: '08111111111',
        address: 'Bandung'
      })
      .expect(201);

    const po = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplier.body.data._id,
        items: [{ ingredientId: ingredient.body.data._id, quantity: 20, unitPrice: 20000 }],
        expectedDate: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Restok cabai'
      })
      .expect(201);

    const purchaseOrderService = require('../src/services/purchaseOrderService');
    const stockMovementModel = require('../src/models/StockMovement');
    const financeModel = require('../src/models/Finance');

    const firstReceipt = await purchaseOrderService.receivePurchaseOrder(po.body.data._id, 'staff-id');
    const secondReceipt = await purchaseOrderService.receivePurchaseOrder(po.body.data._id, 'staff-id');

    expect(firstReceipt.status).toBe('received');
    expect(secondReceipt.status).toBe('received');
    expect(await stockMovementModel.countDocuments({ reason: 'restock', ingredient: ingredient.body.data._id })).toBeGreaterThan(0);
    expect(await financeModel.countDocuments({ reference: `PO-${po.body.data._id}` })).toBe(1);
  });

  test('completing a paid order records a single income ledger entry without double counting', async () => {
    const ingredient = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Beras',
        unit: 'gram',
        currentStock: 100,
        minimumStock: 10,
        costPerUnit: 5000
      })
      .expect(201);

    const menu = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Kotak',
        price: 30000,
        description: 'Nasi kotak untuk paket',
        ingredients: [{ ingredient: ingredient.body.data._id, quantity: 1 }],
        isAvailable: true
      })
      .expect(201);

    const customer = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ayu', phone: '08120000003', email: 'ayu@example.com' })
      .expect(201);

    const order = await require('../src/models/Order').create({
      orderCode: 'NGP-00000005-ABCDEF',
      channel: 'online',
      fulfillmentType: 'takeaway',
      customerId: customer.body.data._id,
      customerName: 'Ayu',
      customerPhone: '08120000003',
      items: [{ menu: menu.body.data._id, quantity: 2, priceAtOrder: 30000 }],
      totalAmount: 60000,
      amountAfterDiscount: 60000,
      status: 'confirmed',
      paymentStatus: 'paid',
      kitchenStatus: 'ready',
      paymentMethod: 'qris_static',
      paymentReference: 'qris-001'
    });

    const orderService = require('../src/services/orderService');
    const financeModel = require('../src/models/Finance');

    await orderService.completeOrder(order._id);
    await orderService.completeOrder(order._id);

    expect(await financeModel.countDocuments({ reference: `ORDER-${order._id.toString()}` })).toBe(1);
    expect(await financeModel.countDocuments({ type: 'income', category: 'order_payment', relatedOrder: order._id })).toBe(1);
  });
});
