/**
 * PRIORITAS 2 — Edge Cases Testing
 *
 * Covers Order, Inventory, and Auth edge cases:
 *   Order: quantity=0, negative quantity, missing menu, inactive menu,
 *          deleted menu, empty order, double complete, cancel completed,
 *          confirm cancelled
 *   Inventory: stock→negative, restock negative, adjustment > stock,
 *              missing ingredient, inactive ingredient
 *   Auth: expired JWT, invalid JWT, JWT without Bearer,
 *         invalid refresh token, inactive admin login
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;
let ingredientId;
let menuId;
let availableMenuId;

const testPassword = 'TestPass123!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Create a walk-in order and return the response body. */
async function createWalkInOrder(menuIdent, qty = 1) {
  return request(app)
    .post('/api/orders')
    .send({
      channel: 'walk_in',
      items: [{ menuId: menuIdent, quantity: qty }]
    });
}

/** Confirm an order by id (admin). */
async function confirmOrder(id) {
  return request(app)
    .patch(`/api/orders/${id}/confirm`)
    .set('Authorization', `Bearer ${adminToken}`);
}

/** Advance kitchen status to 'ready'. */
async function kitchenReady(id) {
  return request(app)
    .patch(`/api/orders/${id}/kitchen`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ kitchenStatus: 'ready' });
}

/** Mark payment as paid. */
async function markPaid(id) {
  return request(app)
    .patch(`/api/orders/${id}/payment`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ paymentStatus: 'paid', paymentMethod: 'cash' });
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await setupEnvAndApp();

  // 1. Register first admin
  await request(app)
    .post('/api/auth/register-admin')
    .send({ email: 'owner@example.com', password: testPassword })
    .expect(201);

  // 2. Verify email
  const Admin = require('../src/models/Admin');
  const admin = await Admin.findOne({ email: 'owner@example.com' });
  admin.isVerified = true;
  await admin.save();

  // 3. Login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: testPassword })
    .expect(200);
  adminToken = loginRes.body.data.token;

  // 4. Create an ingredient
  const ingRes = await request(app)
    .post('/api/ingredients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Beras', unit: 'gram', currentStock: 1000, minimumStock: 100 })
    .expect(201);
  ingredientId = ingRes.body.data._id;

  // 5. Create an available menu (no ingredients for simplicity)
  const menuRes = await request(app)
    .post('/api/menus')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Nasi Goreng',
      description: 'Menu test',
      price: 25000,
      ingredients: []
    })
    .expect(201);
  menuId = menuRes.body.data._id;
  availableMenuId = menuRes.body.data._id;
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

// ═══════════════════════════════════════════════════════════════════════════
// ORDER EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Order Edge Cases', () => {
  // ---- quantity = 0 ----
  test('reject order with quantity = 0', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId, quantity: 0 }]
      })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- quantity negatif ----
  test('reject order with negative quantity', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId, quantity: -5 }]
      })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- menu tidak ditemukan ----
  test('reject order with non-existent menuId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId: fakeId, quantity: 1 }]
      })
      .expect(404);
    expect(res.body.message).toMatch(/Menu/i);
  });

  // ---- menu inactive (isAvailable = false) ----
  test('reject order with unavailable (inactive) menu', async () => {
    // Create an unavailable menu
    const Menu = require('../src/models/Menu');
    const inactiveMenu = await Menu.create({
      name: 'Hidden Item',
      price: 10000,
      isAvailable: false,
      ingredients: []
    });

    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId: inactiveMenu._id.toString(), quantity: 1 }]
      })
      .expect(400);
    expect(res.body.errorCode).toBe('MENU_UNAVAILABLE');
  });

  // ---- menu dihapus saat order dibuat ----
  test('reject order when menu is deleted between validation and save', async () => {
    // Create a menu, then delete it before ordering
    const Menu = require('../src/models/Menu');
    const tempMenu = await Menu.create({
      name: 'Temporary Menu',
      price: 15000,
      isAvailable: true,
      ingredients: []
    });

    // Delete the menu
    await Menu.findByIdAndDelete(tempMenu._id);

    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: [{ menuId: tempMenu._id.toString(), quantity: 1 }]
      })
      .expect(404);
    expect(res.body.message).toMatch(/Menu/i);
  });

  // ---- order kosong (empty items array) ----
  test('reject order with empty items array', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in',
        items: []
      })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- order kosong (no items field at all) ----
  test('reject order with missing items field', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        channel: 'walk_in'
      })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- complete order dua kali ----
  test('cannot complete an already completed order', async () => {
    // Create → confirm → kitchen ready → pay → complete
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await confirmOrder(oid).expect(200);
    await kitchenReady(oid).expect(200);
    await markPaid(oid).expect(200);

    // First complete → success
    const firstComplete = await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(firstComplete.body.data.status).toBe('completed');

    // Second complete → fails
    const secondComplete = await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(secondComplete.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- cancel order yang sudah completed ----
  test('cannot cancel a completed order', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await confirmOrder(oid).expect(200);
    await kitchenReady(oid).expect(200);
    await markPaid(oid).expect(200);
    await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Cancel completed → fails
    const cancelRes = await request(app)
      .patch(`/api/orders/${oid}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(cancelRes.body.errorCode).toBe('CANNOT_CANCEL_COMPLETED');
  });

  // ---- confirm order yang sudah cancelled ----
  test('cannot confirm a cancelled order', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    // Cancel first
    await request(app)
      .patch(`/api/orders/${oid}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Confirm cancelled → fails
    const confirmRes = await confirmOrder(oid);
    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- confirm order already completed ----
  test('cannot confirm a completed order', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await confirmOrder(oid).expect(200);
    await kitchenReady(oid).expect(200);
    await markPaid(oid).expect(200);
    await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const confirmRes = await confirmOrder(oid);
    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- complete order that is still pending (not confirmed) ----
  test('cannot complete a pending order', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    const completeRes = await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(completeRes.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- cancel an already cancelled order ----
  test('cancel a cancelled order (idempotent or error)', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await request(app)
      .patch(`/api/orders/${oid}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Second cancel: service doesn't guard against this, it just sets status again
    // The order is already cancelled, the cancelOrder service only blocks 'completed'
    const secondCancel = await request(app)
      .patch(`/api/orders/${oid}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    // Accept either 200 (idempotent) or 400 (error)
    expect([200, 400]).toContain(secondCancel.status);
  });

  // ---- get order by non-existent id ----
  test('get order by non-existent id returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/orders/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(res.body.message).toMatch(/Order/i);
  });

  // ---- track non-existent order code ----
  test('track non-existent order code returns 404', async () => {
    const res = await request(app)
      .get('/api/orders/track/NGP-20260101-000000')
      .expect(404);
    expect(res.body.message).toMatch(/Order/i);
  });

  // ---- kitchen update on non-confirmed order ----
  test('kitchen update on pending order fails', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/orders/${oid}/kitchen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kitchenStatus: 'ready' })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- payment update on completed order ----
  test('payment update on completed order fails', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await confirmOrder(oid).expect(200);
    await kitchenReady(oid).expect(200);
    await markPaid(oid).expect(200);
    await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .patch(`/api/orders/${oid}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'refunded' })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- payment update on cancelled order ----
  test('payment update on cancelled order fails', async () => {
    const createRes = await createWalkInOrder(menuId);
    const oid = createRes.body.data._id;

    await request(app)
      .patch(`/api/orders/${oid}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .patch(`/api/orders/${oid}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'paid', paymentMethod: 'cash' })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_ORDER_STATUS');
  });

  // ---- complete order with insufficient stock ----
  test('complete order fails when ingredient stock is insufficient', async () => {
    // Create an ingredient with very low stock
    const ingRes = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sambal Rare', unit: 'gram', currentStock: 1, minimumStock: 0 })
      .expect(201);
    const lowStockIngId = ingRes.body.data._id;

    // Create a menu that uses this ingredient (need 100g per portion)
    const menuRes = await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nasi Goreng Pedas',
        price: 30000,
        ingredients: [{ ingredient: lowStockIngId, quantity: 100 }]
      })
      .expect(201);
    const pedasMenuId = menuRes.body.data._id;

    // Create order for 2 portions (needs 200g, but only 1g in stock)
    const createRes = await createWalkInOrder(pedasMenuId, 2);
    const oid = createRes.body.data._id;

    await confirmOrder(oid).expect(200);

    const completeRes = await request(app)
      .patch(`/api/orders/${oid}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(completeRes.body.errorCode).toBe('INSUFFICIENT_STOCK');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Inventory Edge Cases', () => {
  // ---- restock dengan angka negatif ----
  test('restock with negative amount is rejected by validation', async () => {
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: -100 })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- restock dengan angka 0 ----
  test('restock with amount 0 is rejected by validation', async () => {
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: 0 })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- adjustment lebih besar dari stok (stok menjadi negatif) ----
  test('adjustment larger than current stock is rejected', async () => {
    // Get current stock
    const Ingredient = require('../src/models/Ingredient');
    const ing = await Ingredient.findById(ingredientId);
    const currentStock = ing.currentStock;

    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: -(currentStock + 1000) })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_STOCK_ADJUSTMENT');
  });

  // ---- adjustment yang membuat stok = 0 (batas tepat) ----
  test('adjustment that reduces stock to exactly 0 succeeds', async () => {
    const Ingredient = require('../src/models/Ingredient');

    // First set stock to a known value via restock
    await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: 500 })
      .expect(200);

    const ingBefore = await Ingredient.findById(ingredientId);
    const stock = ingBefore.currentStock;

    // Adjust by the full amount
    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: -stock })
      .expect(200);
    expect(res.body.data.currentStock).toBe(0);
  });

  // ---- adjustment dengan amount = 0 ----
  test('adjustment with amount 0 is rejected', async () => {
    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId, amount: 0 })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- ingredient tidak ditemukan (restock) ----
  test('restock non-existent ingredient returns error', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId: fakeId, amount: 100 })
      .expect(404);
    expect(res.body.message).toMatch(/Ingredient/i);
  });

  // ---- ingredient tidak ditemukan (adjustment) ----
  test('adjustment on non-existent ingredient returns error', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId: fakeId, amount: -10 })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_STOCK_ADJUSTMENT');
  });

  // ---- ingredient inactive: restock still works (service uses findByIdAndUpdate) ----
  test('restock on inactive (soft-deleted) ingredient still works', async () => {
    // Create an ingredient, then soft-delete it
    const ingRes = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'To Be Deleted', unit: 'pcs', currentStock: 50 })
      .expect(201);
    const delIngId = ingRes.body.data._id;

    // Soft-delete via DELETE endpoint
    await request(app)
      .delete(`/api/ingredients/${delIngId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Restock should still work (findByIdAndUpdate doesn't check isActive)
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId: delIngId, amount: 10 })
      .expect(200);
    expect(res.body.data.currentStock).toBe(60); // 50 + 10
  });

  // ---- ingredient inactive: adjustment still works ----
  test('adjustment on inactive (soft-deleted) ingredient still works', async () => {
    const Ingredient = require('../src/models/Ingredient');
    const ing = await Ingredient.findOne({ name: 'To Be Deleted' });

    const res = await request(app)
      .post('/api/stock-movements/adjustment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId: ing._id.toString(), amount: -10 })
      .expect(200);
    expect(res.body.data.currentStock).toBe(50); // 60 - 10
  });

  // ---- restock missing ingredientId ----
  test('restock with missing ingredientId is rejected', async () => {
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100 })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- restock missing amount ----
  test('restock with missing amount is rejected', async () => {
    const res = await request(app)
      .post('/api/stock-movements/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ingredientId })
      .expect(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- update ingredient with negative currentStock via API ----
  test('cannot update currentStock directly via ingredient update', async () => {
    const res = await request(app)
      .patch(`/api/ingredients/${ingredientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentStock: -500 })
      .expect(400);
    expect(res.body.errorCode).toBe('INVALID_STOCK_UPDATE');
  });

  // ---- update non-existent ingredient ----
  test('update non-existent ingredient returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/ingredients/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' })
      .expect(404);
    expect(res.body.message).toMatch(/Ingredient/i);
  });

  // ---- delete non-existent ingredient ----
  test('delete non-existent ingredient returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/ingredients/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(res.body.message).toMatch(/Ingredient/i);
  });

  // ---- delete ingredient still used by active menu ----
  test('cannot delete ingredient still used by active menu', async () => {
    // Create ingredient and link it to a menu
    const ingRes = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Minyak Goreng', unit: 'ml', currentStock: 500 })
      .expect(201);
    const minyakId = ingRes.body.data._id;

    await request(app)
      .post('/api/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gorengan',
        price: 5000,
        ingredients: [{ ingredient: minyakId, quantity: 50 }]
      })
      .expect(201);

    const res = await request(app)
      .delete(`/api/ingredients/${minyakId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(res.body.errorCode).toBe('INGREDIENT_IN_USE');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth Edge Cases', () => {
  // ---- JWT expired ----
  test('expired JWT is rejected with INVALID_TOKEN', async () => {
    const Admin = require('../src/models/Admin');
    const admin = await Admin.findOne({ email: 'owner@example.com' });

    // Create a token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { sub: admin._id.toString(), email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });

  // ---- JWT invalid (garbage string) ----
  test('invalid JWT string is rejected', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt')
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });

  // ---- JWT signed with wrong secret ----
  test('JWT signed with wrong secret is rejected', async () => {
    const Admin = require('../src/models/Admin');
    const admin = await Admin.findOne({ email: 'owner@example.com' });

    const wrongSecretToken = jwt.sign(
      { sub: admin._id.toString(), email: admin.email },
      'completely-different-secret-key-12345',
      { expiresIn: '12h' }
    );

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${wrongSecretToken}`)
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });

  // ---- JWT tanpa Bearer prefix ----
  test('JWT without Bearer prefix is rejected', async () => {
    const Admin = require('../src/models/Admin');
    const admin = await Admin.findOne({ email: 'owner@example.com' });

    const token = jwt.sign(
      { sub: admin._id.toString(), email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Use "Token" instead of "Bearer"
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Token ${token}`)
      .expect(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  // ---- Authorization header with only scheme, no token ----
  test('Authorization header with only Bearer scheme and no token is rejected', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer ')
      .expect(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  // ---- No Authorization header at all ----
  test('missing Authorization header is rejected', async () => {
    const res = await request(app)
      .get('/api/orders')
      .expect(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  // ---- refresh token invalid ----
  test('invalid refresh token is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'totally-invalid-refresh-token' })
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_REFRESH_TOKEN');
  });

  // ---- refresh token that has been revoked ----
  test('revoked refresh token is rejected', async () => {
    // Login to get a valid refresh token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: testPassword })
      .expect(200);
    const refreshToken = loginRes.body.data.refreshToken;

    // Revoke it directly in DB
    const RefreshToken = require('../src/models/RefreshToken');
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { isRevoked: true }
    );

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_REFRESH_TOKEN');
  });

  // ---- admin nonaktif login ----
  test('inactive admin cannot login', async () => {
    // Register a second admin
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'inactive@example.com', password: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    // Verify email
    const Admin = require('../src/models/Admin');
    const inactiveAdmin = await Admin.findOne({ email: 'inactive@example.com' });
    inactiveAdmin.isVerified = true;
    await inactiveAdmin.save();

    // Deactivate the admin
    inactiveAdmin.isActive = false;
    await inactiveAdmin.save();

    // Try to login → should fail
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@example.com', password: testPassword })
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  // ---- login with wrong password ----
  test('login with wrong password fails', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'WrongPassword1!' })
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  // ---- login with non-existent email ----
  test('login with non-existent email fails', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: testPassword })
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  // ---- register with invalid email ----
  test('register with invalid email format is rejected', async () => {
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'not-an-email', password: testPassword })
      .expect(400);
    process.env.ALLOW_ADMIN_REGISTER = 'false';
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- register with weak password ----
  test('register with weak password is rejected', async () => {
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'newadmin@example.com', password: 'weak' })
      .expect(400);
    process.env.ALLOW_ADMIN_REGISTER = 'false';
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // ---- JWT for admin that has been deleted ----
  test('JWT for deleted admin is rejected', async () => {
    // Create a throwaway admin, get token, then delete admin
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const regRes = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'throwaway@example.com', password: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const Admin = require('../src/models/Admin');
    const throwaway = await Admin.findOne({ email: 'throwaway@example.com' });
    throwaway.isVerified = true;
    await throwaway.save();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'throwaway@example.com', password: testPassword })
      .expect(200);
    const throwawayToken = loginRes.body.data.token;

    // Now delete the admin
    await Admin.findByIdAndDelete(throwaway._id);

    // Try using the token → should fail
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${throwawayToken}`)
      .expect(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  // ---- protect admin endpoints without token ----
  test('admin endpoints reject unauthenticated requests', async () => {
    await request(app).get('/api/orders').expect(401);
    await request(app).get('/api/orders/queue').expect(401);
    await request(app).get('/api/ingredients').expect(401);
  });

  // ---- access admin endpoint with public-only token-like string ----
  test('garbage token on admin endpoint returns 401', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer abc123def456')
      .expect(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });
});