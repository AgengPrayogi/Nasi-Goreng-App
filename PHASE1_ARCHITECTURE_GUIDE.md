# Phase 1 Code Architecture & Conventions
## Developer Guide for Extending Phase 1

**Last Updated:** 2026-06-18

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── models/              # Mongoose schemas
│   │   ├── Staff.js         (NEW - Role-based staff)
│   │   ├── Customer.js      (NEW - CRM)
│   │   ├── Supplier.js      (NEW - Supplier management)
│   │   ├── PurchaseOrder.js (NEW - PO workflow)
│   │   ├── Promotion.js     (NEW - Promo campaigns)
│   │   ├── PromoCode.js     (NEW - Promo codes)
│   │   ├── DailyReconciliation.js (NEW - Daily sales)
│   │   ├── AuditLog.js      (EXISTING - Action logging)
│   │   ├── Order.js         (ENHANCED - Added staff/customer/discount fields)
│   │   └── ... (other models)
│   │
│   ├── services/            # Business logic
│   │   ├── staffService.js      (NEW)
│   │   ├── customerService.js   (NEW)
│   │   ├── supplierService.js   (NEW)
│   │   ├── purchaseOrderService.js (NEW)
│   │   ├── promotionService.js  (NEW)
│   │   ├── authService.js       (ENHANCED - staff support)
│   │   ├── orderService.js      (NEEDS ENHANCEMENT - customer tagging, promo apply)
│   │   └── ... (other services)
│   │
│   ├── controllers/         # HTTP handlers
│   │   ├── staffController.js           (NEW)
│   │   ├── customerController.js        (NEW)
│   │   ├── supplierController.js        (NEW)
│   │   ├── purchaseOrderController.js   (NEW)
│   │   ├── orderController.js           (NEEDS ENHANCEMENT)
│   │   └── ... (other controllers)
│   │
│   ├── routes/              # Express routers
│   │   ├── staff.js             (NEW)
│   │   ├── customers.js         (NEW)
│   │   ├── suppliers.js         (NEW)
│   │   ├── purchaseOrders.js    (NEW)
│   │   ├── index.js             (UPDATED - added new routes)
│   │   └── ... (other routes)
│   │
│   ├── validators/          # Joi schemas
│   │   ├── staffValidator.js    (NEW)
│   │   └── ... (other validators)
│   │
│   ├── middlewares/
│   │   ├── auth.js          (authenticate, requireAdmin, getClientIp)
│   │   ├── errorHandler.js  (normalized error responses)
│   │   └── ... (other middlewares)
│   │
│   ├── errors/
│   │   ├── AppError.js      (Custom error classes)
│   │   └── ... (other errors)
│   │
│   └── config/
│       └── ... (database, app config)
│
├── scripts/
│   ├── seed-phase1.js       (NEW - Test data seeding)
│   └── ... (other scripts)
│
└── package.json
```

---

## 🏗️ Architectural Patterns

### 1. Model-Service-Controller-Routes Pattern

Every Phase 1 feature follows this structure:

```
CustomerModel (schema, indexes, virtuals)
         ↓
CustomerService (business logic, validation, db operations)
         ↓
CustomerController (HTTP handling, request parsing)
         ↓
CustomerRoutes (endpoint definitions, middleware)
```

**Example: Create a Customer**

```
POST /api/customers
    ↓
customerController.createCustomerHandler()
    ↓
customerService.createCustomer(data)
    ↓
Customer.create() [Mongoose]
    ↓
Response: { success: true, data: {...} }
```

### 2. Error Handling Pattern

```javascript
// Create custom error
throw new AppError('CUSTOMER_NOT_FOUND', 404, 'Customer tidak ditemukan');

// Caught by errorHandler middleware
// Normalized response:
{
  success: false,
  code: 'CUSTOMER_NOT_FOUND',
  message: 'Customer tidak ditemukan',
  statusCode: 404
}
```

### 3. Input Validation Pattern

```javascript
// Define schema in validators/staffValidator.js
const createStaffSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().regex(/regex/).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'manager', 'cashier').required()
});

// Validate in controller
const { error, value } = createStaffSchema.validate(req.body);
if (error) throw new AppError('VALIDATION_ERROR', 400, error.message);

// Use validated data
const staff = await staffService.createStaff(value);
```

### 4. Authentication & Authorization Pattern

```javascript
// Middleware chain in routes
router.post('/', authenticate, requireAdmin, createStaffHandler);

// authenticate middleware:
// - Extracts JWT from Authorization header
// - Verifies signature
// - Sets req.user = { sub, email, role, type }

// requireAdmin middleware:
// - Checks req.user.role === 'admin'
// - Throws 403 if not admin

// In controller:
const adminId = req.user.sub;  // Staff ID from JWT
const adminName = req.user.email;
const ipAddress = getClientIp(req);
```

### 5. Audit Logging Pattern

```javascript
// In service when modifying data
await AuditLog.create({
  adminId: adminId,
  adminName: adminName,
  action: 'UPDATE_CUSTOMER',
  resourceType: 'Customer',
  resourceId: customerId,
  changes: {
    name: { old: oldData.name, new: newData.name }
  },
  ipAddress: ipAddress,
  timestamp: new Date()
});
```

### 6. Aggregation Pipeline Pattern (Analytics)

```javascript
// Example: Get top customers by spending
const topCustomers = await Order.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(from), $lte: new Date(to) },
      status: 'completed'
    }
  },
  {
    $group: {
      _id: '$customerId',
      totalSpent: { $sum: '$amountAfterDiscount' },
      orderCount: { $sum: 1 },
      avgOrder: { $avg: '$amountAfterDiscount' }
    }
  },
  {
    $sort: { totalSpent: -1 }
  },
  {
    $limit: limit
  },
  {
    $lookup: {
      from: 'customers',
      localField: '_id',
      foreignField: '_id',
      as: 'customerData'
    }
  },
  {
    $unwind: '$customerData'
  },
  {
    $project: {
      _id: 1,
      totalSpent: 1,
      orderCount: 1,
      avgOrder: 1,
      name: '$customerData.name',
      tier: '$customerData.tier'
    }
  }
]);
```

---

## 🔑 Key Conventions

### 1. Response Format

**Success:**
```json
{
  "success": true,
  "data": { /* actual data */ },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Error:**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "statusCode": 400
}
```

### 2. Naming Conventions

- **Models:** PascalCase singular (Staff, Customer, Order)
- **Services:** camelCase + 'Service' (staffService, customerService)
- **Controllers:** camelCase + 'Controller' (staffController)
- **Routes:** kebab-case plural (/api/staff, /api/customers)
- **Fields:** camelCase (firstName, lastLoginAt)
- **Constants:** UPPER_SNAKE_CASE (JWT_EXPIRY, ADMIN_ROLE)

### 3. Middleware Chain Order

```javascript
// Always follow this order:
router.post(
  '/path',
  authenticate,      // Verify JWT token
  requireAdmin,      // Check role/permissions
  validateInput,     // Validate request body
  handlerFunction    // Main logic
);
```

### 4. Service Function Signatures

```javascript
// Pattern: descriptive name with full context

// Create operations
async createStaff(data, adminId, adminName, ipAddress)

// Read operations (simple, no audit context needed)
async getStaffById(staffId)

// Update operations (with audit context)
async updateStaff(staffId, data, adminId, adminName, ipAddress)

// Delete operations (soft delete pattern)
async deleteStaff(staffId, adminId, adminName, ipAddress)

// Analytics operations
async getTopCustomers(limit, from, to)
```

### 5. Pagination Pattern

```javascript
// Query: GET /api/customers?page=1&limit=20&role=admin

// In controller:
const { page = 1, limit = 20, ...filters } = req.query;

// In service:
const skip = (page - 1) * limit;
const [data, total] = await Promise.all([
  Model.find(filters).skip(skip).limit(limit),
  Model.countDocuments(filters)
]);

// Response:
{
  data: [...],
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    total: total,
    pages: Math.ceil(total / limit)
  }
}
```

### 6. Date Handling

```javascript
// Always use ISO 8601 format
const from = new Date(req.query.from); // '2024-01-01'
const to = new Date(req.query.to);     // '2024-01-31'

// Query with date ranges
$match: {
  createdAt: { $gte: from, $lte: to }
}

// Response in ISO format
{
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

---

## 🔐 Security Patterns

### 1. Password Hashing

```javascript
// In model pre-save hook or service
const bcrypt = require('bcrypt');

// Hash on save
staff.passwordHash = await bcrypt.hash(password, 10);

// Verify on login
const isValid = await bcrypt.compare(inputPassword, storedPasswordHash);
```

### 2. JWT Token

```javascript
// Create token
const token = jwt.sign(
  {
    sub: staffId,
    email: email,
    role: role,
    type: 'staff'
  },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// decoded = { sub, email, role, type, iat, exp }
```

### 3. Admin-Only Endpoints

```javascript
// Always use requireAdmin middleware
router.delete('/:id', authenticate, requireAdmin, deleteHandler);

// Don't allow staff to delete staff (except admin)
// Don't allow customers to see all customers

// In controller, verify ownership when needed
if (req.user.role !== 'admin' && req.user.sub !== resourceOwnerId) {
  throw new AppError('FORBIDDEN', 403, 'Anda tidak memiliki akses');
}
```

---

## 📦 Dependencies Used in Phase 1

```javascript
// Already in package.json:
- express              // Web framework
- mongoose             // ODM for MongoDB
- joi                  // Input validation
- jwt                  // JWT tokens
- bcrypt               // Password hashing
- dotenv               // Environment variables
- cors                 // CORS middleware

// For Frontend (React) - Need to add:
- recharts             // Charts
- react-table          // Data tables
- date-fns             // Date utilities
- react-hook-form      // Form handling
```

---

## 🧩 How to Add a New Feature (e.g., DailyReconciliation)

### Step 1: Create Model
```javascript
// File: src/models/DailyReconciliation.js
const schema = new Schema({
  date: { type: Date, unique: true, required: true },
  totalOrders: Number,
  totalRevenue: Number,
  // ... other fields
});

module.exports = mongoose.model('DailyReconciliation', schema);
```

### Step 2: Create Service
```javascript
// File: src/services/dailyReconciliationService.js
const DailyReconciliation = require('../models/DailyReconciliation');

module.exports = {
  async closeDay(date, staffId) {
    // Get orders for date
    // Calculate totals
    // Create DailyReconciliation doc
    // Log audit entry
    return dailyRec;
  },
  
  async getDailyReconciliation(date) {
    return DailyReconciliation.findOne({ date: ... });
  }
};
```

### Step 3: Create Controller
```javascript
// File: src/controllers/dailyReconciliationController.js
const dailyRecService = require('../services/dailyReconciliationService');

module.exports = {
  async closeDayHandler(req, res, next) {
    try {
      const { date } = req.body;
      const result = await dailyRecService.closeDay(date, req.user.sub);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
};
```

### Step 4: Create Routes
```javascript
// File: src/routes/dailyReconciliation.js
const router = express.Router();
const { closeDayHandler, getDayHandler } = require('../controllers/dailyReconciliationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

router.post('/', authenticate, requireAdmin, closeDayHandler);
router.get('/:date', authenticate, requireAdmin, getDayHandler);

module.exports = router;
```

### Step 5: Add to routes/index.js
```javascript
const dailyRecRoutes = require('./dailyReconciliation');
router.use('/daily-reconciliation', dailyRecRoutes);
```

### Step 6: Add to Documentation
```markdown
# Daily Reconciliation API

## Close Daily Sales
POST /api/daily-reconciliation

...
```

---

## 🧪 Testing Patterns

### Unit Test Example

```javascript
// File: tests/services/staffService.test.js
const staffService = require('../../src/services/staffService');

describe('Staff Service', () => {
  describe('createStaff', () => {
    it('should create staff with valid data', async () => {
      const data = {
        email: 'test@email.com',
        password: 'SecurePass@123',
        name: 'Test Staff',
        role: 'cashier'
      };
      
      const result = await staffService.createStaff(data, 'adminId', 'admin@email', '127.0.0.1');
      
      expect(result).toHaveProperty('_id');
      expect(result.email).toBe('test@email.com');
      expect(result.role).toBe('cashier');
    });
    
    it('should throw error if email already exists', async () => {
      // Arrange - create first staff
      // Act - try to create duplicate
      // Assert - expect error
    });
  });
});
```

### Integration Test Example

```javascript
// File: tests/api/staff.test.js
describe('Staff API', () => {
  let token;
  
  beforeAll(async () => {
    // Login to get token
    const res = await request(app)
      .post('/api/staff/login')
      .send({ email: 'admin@...', password: '...' });
    token = res.body.data.token;
  });
  
  describe('GET /api/staff', () => {
    it('should return list of staff', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
```

---

## 🔄 Common Tasks

### Task 1: Add a new field to Customer model

```javascript
// In src/models/Customer.js
schema.add({
  companyName: String,
  taxId: String,
  discountCode: String
});

// Update customerValidator.js
const updateCustomerSchema = Joi.object({
  // ... existing fields
  companyName: Joi.string().optional(),
  taxId: Joi.string().optional(),
  discountCode: Joi.string().uppercase().optional()
});

// Test it
curl -X PATCH http://localhost:5000/api/customers/123 \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"companyName":"PT Test","taxId":"123456789"}'
```

### Task 2: Add filtering to list endpoint

```javascript
// In customerService.js - getAllCustomers function
async getAllCustomers(filters = {}, page = 1, limit = 20) {
  const query = {};
  
  // Add filters
  if (filters.tier) query.tier = filters.tier;
  if (filters.search) {
    query.$or = [
      { name: new RegExp(filters.search, 'i') },
      { phone: new RegExp(filters.search, 'i') }
    ];
  }
  if (filters.minSpent) query.totalSpent = { $gte: filters.minSpent };
  
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Customer.find(query).skip(skip).limit(limit),
    Customer.countDocuments(query)
  ]);
  
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// Test it
curl "http://localhost:5000/api/customers?tier=gold&minSpent=1000000&search=john" \
  -H "Authorization: Bearer $TOKEN"
```

### Task 3: Add analytics endpoint

```javascript
// In customerService.js
async getCustomersByTierAndPeriod(from, to) {
  return await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(from), $lte: new Date(to) },
        status: 'completed'
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    {
      $unwind: '$customer'
    },
    {
      $group: {
        _id: '$customer.tier',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amountAfterDiscount' },
        avgOrderValue: { $avg: '$amountAfterDiscount' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
}

// In customerController.js
async getCustomersByTierAndPeriodHandler(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await customerService.getCustomersByTierAndPeriod(from, to);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// In routes/customers.js
router.get('/analytics/by-tier-period', authenticate, requireAdmin, getCustomersByTierAndPeriodHandler);
```

---

## 📚 Reference Documents

- **API Reference:** `PHASE1_API_REFERENCE.md`
- **Quick Start:** `PHASE1_QUICK_START.md`
- **Completion Report:** `PHASE1_COMPLETION_REPORT.md`
- **Implementation Progress:** `/memories/repo/PHASE1_IMPLEMENTATION_PROGRESS.md`

---

## 🎓 Learning Resources

### Mongoose Patterns
- [Mongoose Schemas](https://mongoosejs.com/docs/guide.html)
- [Mongoose Indexes](https://mongoosejs.com/docs/api/schema.html#Schema.prototype.index())
- [Mongoose Aggregation](https://mongoosejs.com/docs/api/aggregate.html)

### Express Best Practices
- Middleware order matters
- Always use async/await with try-catch
- Validate input before using

### JWT Authentication
- Always verify JWT signature
- Check token expiration
- Include user context in request object

### MongoDB
- Use replica sets for transactions
- Create appropriate indexes
- Use aggregation pipelines for analytics

---

## ✅ Checklist for Adding New Feature

- [ ] Create model with proper schema & indexes
- [ ] Create service with business logic
- [ ] Create controller with HTTP handlers
- [ ] Create validator with Joi schemas
- [ ] Create routes with auth middleware
- [ ] Add routes to routes/index.js
- [ ] Add tests
- [ ] Add to API documentation
- [ ] Test with curl/Postman
- [ ] Add to seed script if needed

---

**This architecture is designed for**:
- ✅ Easy feature addition
- ✅ Clear separation of concerns
- ✅ Consistent error handling
- ✅ Built-in audit trail
- ✅ Scalable to Phase 2+ analytics

**Follow these patterns consistently for Phase 2 and beyond!** 🚀
