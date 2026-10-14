const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Customer = require('../src/models/Customer');
const CustomerTier = require('../src/models/CustomerTier');
const CustomerTierHistory = require('../src/models/CustomerTierHistory');
const Order = require('../src/models/Order');
const {
  evaluateCustomerTier,
  updateCustomerType
} = require('../src/services/customerService');

let replSet;

async function addOrder(customerId, amount, createdAt) {
  const order = new Order({
    orderCode: `NGP-20260920-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`,
    customerId,
    customerName: 'Tier Test',
    customerPhone: `08${customerId.toString().slice(-10)}`,
    items: [{ menu: new mongoose.Types.ObjectId(), quantity: 1, priceAtOrder: amount }],
    totalAmount: amount,
    amountAfterDiscount: amount,
    status: 'completed',
    kitchenStatus: 'served'
  });
  order.createdAt = createdAt;
  order.updatedAt = createdAt;
  await order.save({ timestamps: false });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { name: 'rs0', count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Customer tier rolling evaluation', () => {
  test('uses exact thresholds and requires both spend and order count', async () => {
    const customer = await Customer.create({ phone: '08100000001', name: 'Threshold' });
    const now = new Date();
    for (let index = 0; index < 12; index += 1) {
      await addOrder(customer._id, index === 0 ? 700000 - 11 : 1, now);
    }
    await evaluateCustomerTier(customer._id, { now, reason: 'test' });
    expect((await Customer.findById(customer._id)).tier).toBe('gold');

    const silverCustomer = await Customer.create({ phone: '08100000005', name: 'Silver' });
    for (let index = 0; index < 6; index += 1) {
      await addOrder(silverCustomer._id, 50000, now);
    }
    await evaluateCustomerTier(silverCustomer._id, { now, reason: 'test' });
    expect((await Customer.findById(silverCustomer._id)).tier).toBe('silver');
  });

  test('excludes orders older than 60 days', async () => {
    const customer = await Customer.create({ phone: '08100000002', name: 'Rolling' });
    const now = new Date('2026-09-20T00:00:00.000Z');
    await addOrder(customer._id, 700000, new Date('2026-07-19T00:00:00.000Z'));
    await evaluateCustomerTier(customer._id, { now, reason: 'test' });
    const result = await Customer.findById(customer._id);
    expect(result.periodOrders).toBe(0);
    expect(result.periodSpent).toBe(0);
    expect(result.tier).toBeNull();
  });

  test('requires two consecutive failed evaluations before downgrade', async () => {
    const customer = await Customer.create({ phone: '08100000003', name: 'Grace' });
    const now = new Date();
    for (let index = 0; index < 12; index += 1) await addOrder(customer._id, 60000, now);
    await evaluateCustomerTier(customer._id, { now, reason: 'test' });
    await Order.deleteMany({ customerId: customer._id });
    await evaluateCustomerTier(customer._id, { now, reason: 'test' });
    expect((await Customer.findById(customer._id)).tier).toBe('gold');
    await evaluateCustomerTier(customer._id, { now, reason: 'test' });
    expect((await Customer.findById(customer._id)).tier).toBeNull();
    expect(await CustomerTierHistory.countDocuments({ customerId: customer._id })).toBe(2);
  });

  test('corporate customers are excluded from regular tiers', async () => {
    const customer = await Customer.create({ phone: '08100000004', name: 'Corporate' });
    await updateCustomerType(customer._id, 'corporate');
    await addOrder(customer._id, 1000000, new Date());
    await evaluateCustomerTier(customer._id, { reason: 'test' });
    const result = await Customer.findById(customer._id);
    expect(result.customerType).toBe('corporate');
    expect(result.tier).toBe('corporate');
    expect(result.periodOrders).toBe(0);
  });
});