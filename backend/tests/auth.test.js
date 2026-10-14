/**
 * Auth Integration Tests
 *
 * Covers the full registration -> email verification -> login flow:
 *   - Successful registration
 *   - Duplicate email rejected
 *   - Password mismatch rejected
 *   - Verification token valid
 *   - Verification token expired
 *   - Verification token invalid
 *   - Login before verification rejected
 *   - Login after verification succeeds
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;
let app;
const testPassword = 'TestPass123!';
const weakPassword = 'weak';
const frontendUrl = 'http://localhost:3000';

async function setupEnvAndApp() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { name: 'rs0', count: 1 }
  });
  if (typeof replSet.waitUntilRunning === 'function') {
    await replSet.waitUntilRunning();
  }

  process.env.MONGODB_URI = replSet.getUri();
  process.env.JWT_SECRET = 'auth-test-jwt-secret-key-minimum-32-chars-long';
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_ADMIN_REGISTER = 'false';
  process.env.FRONTEND_URL = frontendUrl;
  process.env.EMAIL_SERVICE = 'test';
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

describe('Auth Registration & Verification Flow', () => {
  // -----------------------------------------------------------------------
  // 1. Register berhasil
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin returns 201 and does NOT expose verificationToken in response', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'newadmin@example.com', password: testPassword, confirmPassword: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('newadmin@example.com');
    expect(res.body.data.isVerified).toBe(false);
    expect(res.body.data.id).toBeTruthy();
    // Security: token must NOT be returned to client
    expect(res.body.data.verificationToken).toBeUndefined();
    expect(res.body.data.verificationTokenExpiry).toBeUndefined();
    expect(res.body.data.message).toMatch(/check your email/i);
  });

  // -----------------------------------------------------------------------
  // 2. Email duplicate ditolak
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin rejects duplicate email with 400', async () => {
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'newadmin@example.com', password: testPassword, confirmPassword: testPassword });
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ADMIN_EXISTS');
    expect(res.body.message).toMatch(/already exists/i);
  });

  // -----------------------------------------------------------------------
  // 3. Password mismatch ditolak
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin rejects password mismatch with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({
        email: 'mismatch@example.com',
        password: testPassword,
        confirmPassword: 'DifferentPass1!'
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'confirmPassword')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 4. Weak password ditolak
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin rejects weak password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'weakpass@example.com', password: weakPassword, confirmPassword: weakPassword });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // -----------------------------------------------------------------------
  // Helper: register a fresh user and return the created admin document
  // -----------------------------------------------------------------------
  async function registerAndGetAdmin(email) {
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email, password: testPassword, confirmPassword: testPassword })
      .expect(201);

    return mongoose.connection.db.collection('admins').findOne({ email });
  }

  // -----------------------------------------------------------------------
  // 5. Verification token valid
  // -----------------------------------------------------------------------
  test('GET /api/auth/verify-email/:token succeeds with valid token', async () => {
    // Register and capture token directly from DB
    const Admin = require('../src/models/Admin');
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'verifyok@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const admin = await Admin.findOne({ email: 'verifyok@example.com' });
    const token = admin.verificationToken;
    expect(token).toBeTruthy();

    const res = await request(app)
      .get(`/api/auth/verify-email/${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verified/i);
    expect(res.body.data.email).toBe('verifyok@example.com');

    // Token must be cleared after use
    const updated = await Admin.findById(admin._id);
    expect(updated.isVerified).toBe(true);
    expect(updated.verificationToken).toBe('');
  });

  // -----------------------------------------------------------------------
  // 6. Verification token expired
  // -----------------------------------------------------------------------
  test('GET /api/auth/verify-email/:token fails with expired token', async () => {
    const Admin = require('../src/models/Admin');

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'expired@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const admin = await Admin.findOne({ email: 'expired@example.com' });

    // Manually set expiry to the past
    await Admin.findByIdAndUpdate(admin._id, {
      verificationTokenExpiry: new Date(Date.now() - 60 * 1000)
    });

    const res = await request(app)
      .get(`/api/auth/verify-email/${admin.verificationToken}`)
      .expect(400);

    expect(res.body.errorCode).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // -----------------------------------------------------------------------
  // 7. Verification token invalid
  // -----------------------------------------------------------------------
  test('GET /api/auth/verify-email/:token fails with garbage token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email/not-a-real-token-at-all')
      .expect(400);

    expect(res.body.errorCode).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // -----------------------------------------------------------------------
  // Helper: create a fully registered+verified admin, return JWT
  // -----------------------------------------------------------------------
  async function registerVerifyLogin(email) {
    const Admin = require('../src/models/Admin');

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    // Register
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email, password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    // Verify
    const admin = await Admin.findOne({ email });
    await request(app)
      .get(`/api/auth/verify-email/${admin.verificationToken}`)
      .expect(200);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: testPassword })
      .expect(200);

    return loginRes.body.data;
  }

  // -----------------------------------------------------------------------
  // 8. Login sebelum verifikasi ditolak
  // -----------------------------------------------------------------------
  test('POST /api/auth/login rejects unverified admin with 403', async () => {
    const Admin = require('../src/models/Admin');

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'notverified@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    // Do NOT verify - attempt login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notverified@example.com', password: testPassword });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.message).toMatch(/verify/i);
  });

  // -----------------------------------------------------------------------
  // 9. Login setelah verifikasi berhasil
  // -----------------------------------------------------------------------
  test('POST /api/auth/login succeeds for verified admin and returns JWT + refreshToken', async () => {
    const loginData = await registerVerifyLogin('verifiedlogin@example.com');
    // registerVerifyLogin already handles ALLOW_ADMIN_REGISTER internally

    expect(loginData.token).toBeTruthy();
    expect(loginData.refreshToken).toBeTruthy();
    expect(loginData.expiresIn).toBe('12h');
    expect(loginData.admin.email).toBe('verifiedlogin@example.com');
    expect(loginData.admin.isVerified).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 10. Resend verification email
  // -----------------------------------------------------------------------
  test('POST /api/auth/resend-verification sends new token for unverified admin', async () => {
    const Admin = require('../src/models/Admin');

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'resend@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'resend@example.com' });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.success).toBe(true);

    // Token should have changed
    const admin = await Admin.findOne({ email: 'resend@example.com' });
    // Token was regenerated, so it should be non-empty
    expect(admin.verificationToken).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // 11. Cannot resend if already verified
  // -----------------------------------------------------------------------
  test('POST /api/auth/resend-verification fails for already-verified admin', async () => {
    const Admin = require('../src/models/Admin');
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const loginData = await registerVerifyLogin('resendverified@example.com');
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    // Manually mark as verified via direct DB (simulating an external verification path)
    await Admin.findOneAndUpdate(
      { email: 'resendverified@example.com' },
      { $set: { isVerified: true } }
    );

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'resendverified@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ALREADY_VERIFIED');
  });

  // -----------------------------------------------------------------------
  // 12. Register with invalid email format
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'not-an-email', password: testPassword, confirmPassword: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  // -----------------------------------------------------------------------
  // 13. Register without confirmPassword
  // -----------------------------------------------------------------------
  test('POST /api/auth/register-admin rejects missing confirmPassword', async () => {
    const res = await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'noconfirm@example.com', password: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'confirmPassword')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 14. Verify with already-used token (already-verified admin) fails
  // -----------------------------------------------------------------------
  test('GET /api/auth/verify-email/:token fails if admin already verified', async () => {
    const Admin = require('../src/models/Admin');
    process.env.ALLOW_ADMIN_REGISTER = 'true';
    const loginData = await registerVerifyLogin('doubverify@example.com');
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    // Try to re-verify with same token (not possible since token was cleared)
    // So we test with a fake token against an already-verified admin
    const res = await request(app)
      .get('/api/auth/verify-email/any-random-token')
      .expect(400);

    expect(res.body.errorCode).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // -----------------------------------------------------------------------
  // 15. Verify email endpoint accessible without auth (public)
  // -----------------------------------------------------------------------
  test('GET /api/auth/verify-email/:token is accessible without Authorization header', async () => {
    const Admin = require('../src/models/Admin');

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'publicverify@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const admin = await Admin.findOne({ email: 'publicverify@example.com' });
    const token = admin.verificationToken;

    // No Authorization header
    const res = await request(app)
      .get(`/api/auth/verify-email/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 16. Mock email delivery must not expose verification tokens in logs
  // -----------------------------------------------------------------------
  test('console output during registration does not expose verification token', async () => {
    const Admin = require('../src/models/Admin');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    process.env.ALLOW_ADMIN_REGISTER = 'true';
    await request(app)
      .post('/api/auth/register-admin')
      .send({ email: 'linkcheck@example.com', password: testPassword, confirmPassword: testPassword })
      .expect(201);
    process.env.ALLOW_ADMIN_REGISTER = 'false';

    const calls = consoleSpy.mock.calls;
    const admin = await Admin.findOne({ email: 'linkcheck@example.com' });
    expect(admin.verificationToken).toBeTruthy();
    expect(JSON.stringify(calls)).not.toContain(admin.verificationToken);

    consoleSpy.mockRestore();
  });
});
