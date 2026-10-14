const mongoose = require('mongoose');
const crypto = require('crypto');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let order;
let token;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { name: 'feedback-rs', count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  process.env.NODE_ENV = 'test';
  await require('../src/config/db').connectDB();
  app = require('../src/app');
  token = crypto.randomBytes(32).toString('hex');
  const Order = require('../src/models/Order');
  order = await Order.create({
    orderCode: 'NGP-20261009-ABC123',
    customerName: 'Feedback Customer',
    status: 'completed',
    kitchenStatus: 'served',
    feedbackTokenHash: crypto.createHash('sha256').update(token).digest('hex')
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

test('feedback endpoint requires an unguessable matching token', async () => {
  await request(app).get(`/api/feedback/${order.orderCode}?token=${'0'.repeat(64)}`).expect(403);
});

test('customer can submit feedback and see the updated rating distribution', async () => {
  await request(app).put(`/api/feedback/${order.orderCode}`).send({ token, rating: 5, comment: 'Enak!' }).expect(201);
  const result = await request(app).get(`/api/feedback/${order.orderCode}?token=${token}`).expect(200);
  expect(result.body.data.feedback.rating).toBe(5);
  expect(result.body.data.feedback.comment).toBe('Enak!');
  expect(result.body.data.ratingSummary.average).toBe(5);
  expect(result.body.data.ratingSummary.distribution.find((item) => item.rating === 5).count).toBe(1);
});

test('feedback cannot be submitted before the order is completed', async () => {
  order.status = 'pending';
  await order.save();
  await request(app).put(`/api/feedback/${order.orderCode}`).send({ token, rating: 4, comment: '' }).expect(400);
});
