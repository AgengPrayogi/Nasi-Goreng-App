const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
let adminToken;
let smallTableId;
let largeTableId;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { name: 'reservation-rs', count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  process.env.JWT_SECRET = 'reservation-test-jwt-secret-key-minimum-32-chars';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'true';
  process.env.EMAIL_SERVICE = 'mock';
  const { connectDB } = require('../src/config/db');
  await connectDB();
  app = require('../src/app');

  await request(app)
    .post('/api/auth/register-admin')
    .send({ email: 'reservations@example.com', password: 'TestPass123!', confirmPassword: 'TestPass123!' })
    .expect(201);
  const admin = await require('../src/models/Admin').findOne({ email: 'reservations@example.com' });
  admin.isVerified = true;
  await admin.save();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'reservations@example.com', password: 'TestPass123!' })
    .expect(200);
  adminToken = login.body.data.token;

  smallTableId = (await request(app)
    .post('/api/tables')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ number: 'R1', capacity: 2 })
    .expect(201)).body.data._id;
  largeTableId = (await request(app)
    .post('/api/tables')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ number: 'R2', capacity: 4 })
    .expect(201)).body.data._id;
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (replSet) await replSet.stop();
});

describe('Reservation API', () => {
  const futureStart = (offsetHours = 24) => {
    const slot = Math.ceil((Date.now() + offsetHours * 60 * 60 * 1000) / (15 * 60 * 1000)) * 15 * 60 * 1000;
    return new Date(slot).toISOString();
  };
  const reservationBody = (startAt, partySize = 3) => ({
    customerName: 'Test Guest',
    customerPhone: '081234567890',
    partySize,
    startAt
  });

  test('public availability filters active tables by capacity', async () => {
    const response = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt: futureStart(), partySize: 3 })
      .expect((result) => {
        if (result.status !== 200) throw new Error(JSON.stringify(result.body));
      });

    expect(response.body.data.map((table) => table._id)).toContain(largeTableId);
    expect(response.body.data.map((table) => table._id)).not.toContain(smallTableId);
  });

  test('reservation requests reject times outside 15-minute intervals', async () => {
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    startAt.setUTCMinutes(Math.floor(startAt.getUTCMinutes() / 15) * 15 + 1, 0, 0);
    await request(app)
      .post('/api/reservations')
      .send(reservationBody(startAt.toISOString()))
      .expect(400);
  });

  test('customer can request a reservation and PIC can confirm it with a table', async () => {
    const startAt = futureStart(48);
    const created = await request(app)
      .post('/api/reservations')
      .send(reservationBody(startAt))
      .expect(201);

    expect(created.body.data.status).toBe('pending');
    expect(created.body.data.tableId).toBeUndefined();
    expect(created.body.data.reservationCode).toMatch(/^RSV-[A-F0-9]{32}$/);

    await request(app)
      .get(`/api/reservations/track/${created.body.data.reservationCode}`)
      .query({ customerPhone: '089999999999' })
      .expect(404);
    const tracked = await request(app)
      .get(`/api/reservations/track/${created.body.data.reservationCode}`)
      .query({ customerPhone: '081234567890' })
      .expect(200);
    expect(tracked.body.data.status).toBe('pending');

    const list = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'pending' })
      .expect(200);
    expect(list.body.data.some((item) => item._id === created.body.data._id)).toBe(true);

    const confirmed = await request(app)
      .patch(`/api/reservations/${created.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed', tableId: largeTableId })
      .expect(200);
    expect(confirmed.body.data.status).toBe('confirmed');
    expect(confirmed.body.data.tableId.number).toBe('R2');
    const confirmedStatus = await request(app)
      .get(`/api/reservations/track/${created.body.data.reservationCode}`)
      .query({ customerPhone: '081234567890' })
      .expect(200);
    expect(confirmedStatus.body.data.status).toBe('confirmed');
  });

  test('PIC cannot confirm overlapping reservations on the same table', async () => {
    const startAt = futureStart(72);
    const first = await request(app).post('/api/reservations').send(reservationBody(startAt)).expect(201);
    const second = await request(app).post('/api/reservations').send(reservationBody(startAt)).expect(201);

    const confirm = (reservationId) => request(app)
      .patch(`/api/reservations/${reservationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed', tableId: largeTableId });
    const results = await Promise.all([confirm(first.body.data._id), confirm(second.body.data._id)]);
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    const conflict = results.find((result) => result.status === 409);
    expect(conflict?.body.errorCode).toBe('RESERVATION_SLOT_UNAVAILABLE');
  });

  test('reservation transitions are restricted and public users cannot list bookings', async () => {
    const created = await request(app)
      .post('/api/reservations')
      .send(reservationBody(futureStart(96)))
      .expect(201);

    await request(app)
      .patch(`/api/reservations/${created.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' })
      .expect(400);

    await request(app).get('/api/reservations').expect(401);
  });

  test('customer can cancel a confirmed reservation and release its time slot', async () => {
    const startAt = futureStart(120);
    const created = await request(app)
      .post('/api/reservations')
      .send(reservationBody(startAt))
      .expect(201);
    await request(app)
      .patch(`/api/reservations/${created.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed', tableId: largeTableId })
      .expect(200);

    const cancelled = await request(app)
      .post(`/api/reservations/cancel/${created.body.data.reservationCode}`)
      .send({ customerPhone: '081234567890' })
      .expect(200);
    expect(cancelled.body.data.status).toBe('cancelled');

    const available = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt, partySize: 3 })
      .expect(200);
    expect(available.body.data.map((table) => table._id)).toContain(largeTableId);
  });

  test('confirmed reservations are hidden from walk-in table selection and order allocation', async () => {
    const startAt = futureStart(1);
    const created = await request(app)
      .post('/api/reservations')
      .send(reservationBody(startAt))
      .expect(201);
    await request(app)
      .patch(`/api/reservations/${created.body.data._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed', tableId: largeTableId })
      .expect(200);

    const walkInTables = await request(app).get('/api/tables/available').expect(200);
    expect(walkInTables.body.data.map((table) => table._id)).not.toContain(largeTableId);

    const reservationService = require('../src/services/reservationService');
    await expect(reservationService.assertWalkInTableAvailable(largeTableId)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'TABLE_RESERVED_FOR_RESERVATION'
    });
  });
});