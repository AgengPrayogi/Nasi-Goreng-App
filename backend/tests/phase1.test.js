const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

// This test suite assumes the app is properly configured
// Tests cover basic Phase 1 functionality

describe('Staff Management API', () => {
  let adminToken;
  let staffId;
  const testStaff = {
    email: 'test.staff@test.com',
    password: 'TestPass@123456',
    name: 'Test Staff',
    phone: '08123456789',
    role: 'cashier'
  };

  beforeAll(async () => {
    // Login as admin to get token
    // Note: Assumes admin already exists in DB
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456'
      });

    adminToken = loginRes.body.data?.token;
  });

  describe('POST /api/staff', () => {
    it('should create new staff', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testStaff);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.email).toBe(testStaff.email);
      expect(res.body.data.role).toBe(testStaff.role);
      expect(res.body.data).not.toHaveProperty('passwordHash');

      staffId = res.body.data._id;
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testStaff,
          email: 'another.staff@test.com',
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without auth', async () => {
      const res = await request(app)
        .post('/api/staff')
        .send(testStaff);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/staff/login', () => {
    it('should login staff successfully', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({
          email: testStaff.email,
          password: testStaff.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.staff).toHaveProperty('email', testStaff.email);
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({
          email: testStaff.email,
          password: 'WrongPass@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/staff', () => {
    it('should list staff', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/staff?role=cashier')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(s => s.role === 'cashier')).toBe(true);
    });
  });

  describe('GET /api/staff/:id', () => {
    it('should get staff details', async () => {
      const res = await request(app)
        .get(`/api/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(staffId);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for invalid ID', async () => {
      const res = await request(app)
        .get(`/api/staff/invalid_id`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/staff/:id', () => {
    it('should update staff', async () => {
      const res = await request(app)
        .patch(`/api/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          phone: '08999999999'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.phone).toBe('08999999999');
    });
  });

  describe('DELETE /api/staff/:id', () => {
    it('should delete staff (soft delete)', async () => {
      const res = await request(app)
        .delete(`/api/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow deleted staff to login', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({
          email: testStaff.email,
          password: testStaff.password
        });

      expect(res.status).toBe(401);
    });
  });
});

describe('Customer CRM API', () => {
  let adminToken;
  let customerId;
  const testCustomer = {
    phone: '081234567890',
    name: 'Test Customer',
    email: 'customer@test.com'
  };

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456'
      });
    adminToken = loginRes.body.data?.token;
  });

  describe('GET /api/customers', () => {
    it('should list customers', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by tier', async () => {
      const res = await request(app)
        .get('/api/customers?tier=gold')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(c => c.tier === 'gold')).toBe(true);
    });
  });

  describe('GET /api/customers/analytics/top', () => {
    it('should get top customers', async () => {
      const res = await request(app)
        .get('/api/customers/analytics/top?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/customers/analytics/segments', () => {
    it('should get customer segments', async () => {
      const res = await request(app)
        .get('/api/customers/analytics/segments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/customers/analytics/repeat-rate', () => {
    it('should get repeat customer rate', async () => {
      const res = await request(app)
        .get('/api/customers/analytics/repeat-rate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('repeatRate');
      expect(res.body.data).toHaveProperty('totalCustomers');
    });
  });

  describe('GET /api/customers/analytics/churn-risk', () => {
    it('should get churn risk customers', async () => {
      const res = await request(app)
        .get('/api/customers/analytics/churn-risk?days=30&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

describe('Supplier Management API', () => {
  let adminToken;
  let supplierId;
  const testSupplier = {
    name: 'Test Supplier',
    contact: 'Supplier Contact',
    email: 'supplier@test.com',
    phone: '021-123456',
    leadTime: 2,
    paymentTerms: 'NET 30'
  };

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456'
      });
    adminToken = loginRes.body.data?.token;
  });

  describe('POST /api/suppliers', () => {
    it('should create supplier', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testSupplier);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testSupplier.name);
      expect(res.body.data.leadTime).toBe(testSupplier.leadTime);

      supplierId = res.body.data._id;
    });
  });

  describe('GET /api/suppliers', () => {
    it('should list suppliers', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should get supplier details', async () => {
      const res = await request(app)
        .get(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(supplierId);
    });
  });

  describe('PATCH /api/suppliers/:id', () => {
    it('should update supplier', async () => {
      const res = await request(app)
        .patch(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentTerms: 'NET 60' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentTerms).toBe('NET 60');
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('should delete supplier', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('Reconciliation API', () => {
  let adminToken;
  const testDate = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456'
      });
    adminToken = loginRes.body.data?.token;
  });

  describe('POST /api/reconciliation/close', () => {
    it('should close daily sales', async () => {
      const res = await request(app)
        .post('/api/reconciliation/close')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: testDate,
          actualTotal: 1000000,
          notes: 'Test close'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalOrders');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data.status).toBe('closed');
    });
  });

  describe('GET /api/reconciliation/:date', () => {
    it('should get daily reconciliation', async () => {
      const res = await request(app)
        .get(`/api/reconciliation/${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalOrders');
      }
    });
  });

  describe('GET /api/reconciliation/health/metrics', () => {
    it('should get health metrics', async () => {
      const from = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/reconciliation/health/metrics?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accuracy');
      expect(res.body.data).toHaveProperty('riskLevel');
    });
  });

  describe('GET /api/reconciliation/trend/data', () => {
    it('should get revenue trend', async () => {
      const from = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/reconciliation/trend/data?from=${from}&to=${to}&granularity=daily`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

describe('Authorization Tests', () => {
  describe('Require Admin Middleware', () => {
    it('should block non-admin from accessing staff endpoints', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should block requests without token', async () => {
      const res = await request(app)
        .get('/api/staff');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
