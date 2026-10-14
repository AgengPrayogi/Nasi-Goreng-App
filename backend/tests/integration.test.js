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
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'owner@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    expect(res.body.data.email).toBe('owner@example.com');
    
    // Verify email and login to get token
    const admin = await require('../src/models/Admin').findOne({ email: 'owner@example.com' });
    admin.isVerified = true;
    await admin.save();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: testPassword })
      .expect(200);
    adminToken = loginRes.body.data.token;
    process.env.ALLOW_ADMIN_REGISTER = 'false';
  });

  test('admin bootstrap: second register blocked without ALLOW_ADMIN_REGISTER', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'other@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(403);
    expect(res.body.errorCode).toBe('ADMIN_REGISTER_DISABLED');
  });

  test('admin bootstrap: second register allowed when ALLOW_ADMIN_REGISTER=true', async () => {
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'other@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    expect(res.body.data.email).toBe('other@example.com');
    process.env.ALLOW_ADMIN_REGISTER = 'false';
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

  test('ingredients support inspection scheduling and reminder check', async () => {
    const create = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cabai Rawit',
        unit: 'gram',
        currentStock: 400,
        minimumStock: 100,
        checkFrequency: 'daily',
        nextCheckAt: new Date(Date.now() - 60000).toISOString()
      })
      .expect(201);

    expect(create.body.data.checkFrequency).toBe('daily');
    expect(create.body.data.nextCheckAt).toBeTruthy();
    expect(create.body.data.stock).toBe(400);
    expect(create.body.data.minStock).toBe(100);

    const reminders = await request(app)
      .get('/api/ingredients/reminders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(reminders.body.data)).toBe(true);
    expect(reminders.body.data.some((item) => item._id === create.body.data._id)).toBe(true);
  });

  test('staff PIC role is supported and audit-safe', async () => {
    const res = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'pic@example.com',
        password: 'PicPass123!',
        name: 'PIC Shift',
        role: 'pic',
        phone: '081234567890'
      })
      .expect(201);

    expect(res.body.data.role).toBe('pic');
    expect(res.body.data.name).toBe('PIC Shift');
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

    const recipeMenu = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Goreng Diet',
        description: 'Versi porsi yang distandarisasi',
        price: 22000,
        ingredients: [{ ingredient: ingredientId, quantity: 50 }],
        recipe: {
          version: 'v2',
          notes: 'Standar porsi normal dan double',
          portionSizes: [
            { label: 'normal', multiplier: 1, ingredients: [{ ingredient: ingredientId, quantity: 50 }] },
            { label: 'double', multiplier: 2, ingredients: [{ ingredient: ingredientId, quantity: 100 }] }
          ]
        }
      })
      .expect(201);

    expect(recipeMenu.body.data.recipe.version).toBe('v2');
    expect(recipeMenu.body.data.recipe.portionSizes).toHaveLength(2);

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

  test('orders: create (public) returns orderCode (dine-in)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'dine_in',
        customerName: 'Test Customer',
        customerPhone: '081234567890',
        items: [{ menuId, quantity: 1 }]
      })
      .expect(201);
    expect(res.body.data.orderCode).toBeTruthy();
    // Order code format: NGP-YYYYMMDD-XXXXXX
    expect(res.body.data.orderCode).toMatch(/^NGP-\d{8}-[A-F0-9]{6}$/);
    orderCode = res.body.data.orderCode;
    orderId = res.body.data._id;
  });

  test('walk-in order needs a name but no phone and can complete without a CRM profile', async () => {
    const created = await request(app).post('/api/orders').send({
      channel: 'dine_in',
      fulfillmentType: 'takeaway',
      customerName: 'Walk-in Guest',
      items: [{ menuId, quantity: 1 }]
    }).expect(201);
    expect(created.body.data.customerPhone).toBe('');
    expect(created.body.data.customerId).toBeUndefined();

    const id = created.body.data._id;
    await request(app).patch(`/api/orders/${id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app).patch(`/api/orders/${id}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'preparing' }).expect(200);
    await request(app).patch(`/api/orders/${id}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'ready' }).expect(200);
    const completed = await request(app).patch(`/api/orders/${id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(completed.body.data.status).toBe('completed');
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

  test('orders: edit is allowed before preparation and rejected once preparing', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        channel: 'online',
        items: [{ menuId, quantity: 1 }],
        customerName: 'Edit Test',
        customerPhone: '081234567890'
      })
      .expect(201);
    const id = created.body.data._id;

    const pendingEdit = await request(app)
      .patch(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ menuId, quantity: 2 }], notes: 'Less spicy' })
      .expect(200);
    expect(pendingEdit.body.data.totalAmount).toBe(50000);
    expect(pendingEdit.body.data.notes).toBe('Less spicy');

    const confirmed = await request(app)
      .patch(`/api/orders/${id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const etaBeforeEdit = new Date(confirmed.body.data.estimatedReadyAt).getTime();
    const queuedEdit = await request(app)
      .patch(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ menuId, quantity: 3 }] })
      .expect(200);
    expect(queuedEdit.body.data.totalAmount).toBe(75000);
    expect(new Date(queuedEdit.body.data.estimatedReadyAt).getTime()).toBeGreaterThan(etaBeforeEdit);

    await request(app)
      .patch(`/api/orders/${id}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'preparing' })
      .expect(200);
    const lockedEdit = await request(app)
      .patch(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Too late' })
      .expect(400);
    expect(lockedEdit.body.errorCode).toBe('ORDER_NOT_EDITABLE');
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

  test('orders: concurrent confirmations allocate distinct queue numbers', async () => {
    const createOrder = async (phone) => {
      const response = await request(app).post('/api/orders').send({
        channel: 'dine_in', customerName: 'Queue Test', customerPhone: phone,
        items: [{ menuId, quantity: 1 }]
      }).expect(201);
      return response.body.data._id;
    };
    const [firstId, secondId] = await Promise.all([
      createOrder('081200000101'), createOrder('081200000102')
    ]);
    const confirm = (id) => request(app).patch(`/api/orders/${id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    const [first, second] = await Promise.all([confirm(firstId), confirm(secondId)]);
    expect(first.body.data.queueDate).toBe(second.body.data.queueDate);
    expect(first.body.data.queueNumber).not.toBe(second.body.data.queueNumber);
  });

  test('orders: kitchen queue list', async () => {
    const res = await request(app)
      .get('/api/orders/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toBeDefined();
  });

  test('orders: kitchen status + payment + complete uses transaction', async () => {
    const skippedKitchenStatus = await request(app)
      .patch(`/api/orders/${orderId}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'ready' })
      .expect(400);
    expect(skippedKitchenStatus.body.errorCode).toBe('INVALID_KITCHEN_TRANSITION');

    await request(app)
      .patch(`/api/orders/${orderId}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'preparing' })
      .expect(200);

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

  test('orders: cannot complete before kitchen status is ready', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        channel: 'online',
        items: [{ menuId, quantity: 1 }],
        customerName: 'Not Ready Test',
        customerPhone: '081234567890'
      })
      .expect(201);

    await request(app)
      .patch(`/api/orders/${created.body.data._id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const response = await request(app)
      .patch(`/api/orders/${created.body.data._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(response.body.errorCode).toBe('ORDER_NOT_READY');
  });

  test('orders: REQUIRE_PAID_BEFORE_COMPLETE blocks until paid', async () => {
    if (process.env.REQUIRE_PAID_BEFORE_COMPLETE !== 'true') {
      console.log('    skipped (REQUIRE_PAID_BEFORE_COMPLETE not enabled)');
      return;
    }

    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'dine_in',
        customerName: 'Test Customer',
        customerPhone: '081234567890',
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
      .send({ kitchenStatus: 'preparing' })
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
    const Table = require('../src/models/Table');
    const table = await Table.create({ number: 'CANCEL-1', capacity: 2 });
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        channel: 'dine_in',
        fulfillmentType: 'dine_in',
        tableId: String(table._id),
        customerName: 'Test Customer',
        customerPhone: '081234567890',
        items: [{ menuId, quantity: 1 }]
      })
      .expect(201);
    const pendingOrderId = createRes.body.data._id;

    const cancelRes = await request(app)
      .patch(`/api/orders/${pendingOrderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
    const refreshedTable = await Table.findById(table._id).lean();
    expect(refreshedTable.status).toBe('cleaning');
    expect(refreshedTable.activeOrderId).toBeUndefined();
  });
});
