# PHASE 1 Implementation Guide
## Quick-Start: Staff Management + CRM + Inventory

**Durasi Target:** 10-14 hari  
**Output:** Production-ready admin features untuk restoran

---

## 🎯 Goals Phase 1

- ✅ Track siapa (staff) yang aksi order
- ✅ Know who is customer (CRM tagging)
- ✅ Manage supplier & reordering workflow
- ✅ Simple discount system
- ✅ Daily reconciliation

---

## 📋 Implementation Checklist

### Week 1: Staff Management & Customer CRM

#### Day 1-2: Staff Model & Authentication

**Tasks:**
```
[ ] Create Staff model (backend/src/models/Staff.js)
    Fields: _id, email, password, name, phone, role, status, 
            joinDate, hireDate, active, createdAt
    
[ ] Extend auth.js middleware → verify role
    
[ ] Create staffController.js
    - POST /api/staff → register new staff
    - GET /api/staff → list staff (pagination)
    - PATCH /api/staff/:id → update staff
    - DELETE /api/staff/:id → soft delete
    
[ ] Create staffValidator.js (Joi schemas)
    
[ ] Seed 3 sample staff (admin, cashier, chef)
```

**Model Detail:**
```javascript
// backend/src/models/Staff.js
const staffSchema = new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // bcrypt hashed
  name: String,
  phone: String,
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'cashier', 'chef', 'waiter'],
    default: 'waiter'
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  joinDate: { type: Date, default: Date.now },
  lastLoginAt: Date,
  createdAt: { type: Date, default: Date.now }
});
```

---

#### Day 2-3: Add Staff Tracking to Orders

**Tasks:**
```
[ ] Modify Order model: add staffId fields
    - confirmedBy (staff who confirmed)
    - completedBy (staff who completed)
    - modifiedBy (staff who last modified)
    
[ ] Update orderController:
    - confirm endpoint → auto-save req.admin.id to confirmedBy
    - complete endpoint → auto-save to completedBy
    
[ ] Create /api/staff/:id/performance endpoint
    Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
    Returns: ordersConfirmed, ordersCompleted, avgPrepTime
```

**Order Model Changes:**
```javascript
// Add to Order schema
{
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  completedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  
  // existing fields remain...
}
```

---

#### Day 4: Customer CRM Model

**Tasks:**
```
[ ] Create Customer model (backend/src/models/Customer.js)
    Auto-create from online orders
    
[ ] Create customerController.js
    - GET /api/customers → list with search/filter
    - GET /api/customers/:id → detail with order history
    - PATCH /api/customers/:id → update notes/tier
    - GET /api/customers/:id/orders → order history
    
[ ] Modify orderController:
    - POST create order → auto-create/link Customer if online
    
[ ] Create /api/analytics/customers/top endpoint
    Returns: top customers by spending
```

**Model:**
```javascript
// backend/src/models/Customer.js
const customerSchema = new Schema({
  phone: { type: String, unique: true, required: true },
  name: String,
  email: String,
  address: String,
  tier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold'],
    default: 'bronze'
  },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  lastOrderDate: Date,
  preferredItems: [{ type: Schema.Types.ObjectId, ref: 'Menu' }],
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

#### Day 5: Update Order Creation Logic

**Tasks:**
```
[ ] Modify POST /api/orders logic:
    - If channel === 'online' and customerPhone provided:
      * Find or create Customer doc
      * Link Customer._id to Order.customerId
      * Update Customer.totalOrders, totalSpent
      
[ ] Auto-calculate tier on customer.save():
    - bronze: < 5 orders
    - silver: 5-20 orders
    - gold: > 20 orders
    
[ ] Test: create order → verify customer auto-created
```

---

### Week 2: Inventory + Discounts + Reconciliation

#### Day 6: Supplier & Purchase Order

**Tasks:**
```
[ ] Create Supplier model
    Fields: name, contact, email, phone, leadTime, address
    
[ ] Create PurchaseOrder model
    Fields: supplierId, items[], status, orderDate, expectedDate, 
            receivedDate, totalCost, notes, receivedBy
    
[ ] Create purchaseOrderController.js
    - POST /api/purchase-orders → create PO
    - GET /api/purchase-orders → list with filter
    - PATCH /api/purchase-orders/:id/receive → mark received
    
[ ] Create supplier routes
    - POST/GET/PATCH/DELETE /api/suppliers
    
[ ] Modify Ingredient:
    - Add lastRestockDate, lastRestockQty, supplier reference
```

**Models:**
```javascript
// backend/src/models/Supplier.js
const supplierSchema = new Schema({
  name: { type: String, unique: true, required: true },
  contact: String,
  email: String,
  phone: String,
  leadTime: { type: Number, default: 1 }, // days
  address: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// backend/src/models/PurchaseOrder.js
const poSchema = new Schema({
  poNumber: { type: String, unique: true }, // auto-generate
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [{
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
    quantity: Number,
    unit: String,
    unitPrice: Number,
    subtotal: Number
  }],
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'received', 'cancelled'],
    default: 'pending'
  },
  totalCost: Number,
  orderDate: { type: Date, default: Date.now },
  expectedDate: Date,
  receivedDate: Date,
  receivedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  notes: String
});
```

---

#### Day 7: Discount & Promotion System

**Tasks:**
```
[ ] Create Promotion model
    Types: percentage, fixed amount, buy-x-get-discount
    
[ ] Create PromoCode model
    Fields: code, promotionId, maxUse, usedCount, validFrom, validTo
    
[ ] Modify Order.items schema:
    - Add appliedPromo, discountAmount, discountPercentage
    
[ ] Create promotionController.js
    - POST /api/promotions → create
    - GET /api/promotions → list active
    - POST /api/promo-codes → generate code
    - GET /api/promo-codes/:code/validate → check validity
    
[ ] Modify POST /api/orders:
    - Accept optional promoCode parameter
    - Validate & apply discount
    - Update totalAmount after discount
    
[ ] Create /api/analytics/promotions/performance endpoint
    Returns: promo usage, conversion rate, ROI
```

**Models:**
```javascript
// backend/src/models/Promotion.js
const promoSchema = new Schema({
  name: String,
  description: String,
  type: { 
    type: String, 
    enum: ['percentage', 'fixed', 'buyxgety'],
    required: true
  },
  discountValue: Number, // percentage or amount
  applicableTo: {
    type: String,
    enum: ['all', 'menu', 'category'],
    default: 'all'
  },
  applicableMenuIds: [{ type: Schema.Types.ObjectId, ref: 'Menu' }],
  minimumOrderValue: { type: Number, default: 0 },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// backend/src/models/PromoCode.js
const promoCodeSchema = new Schema({
  code: { type: String, unique: true, required: true },
  promotionId: { type: Schema.Types.ObjectId, ref: 'Promotion', required: true },
  maxUse: { type: Number, default: -1 }, // -1 = unlimited
  usedCount: { type: Number, default: 0 },
  validFrom: Date,
  validTo: Date,
  createdAt: { type: Date, default: Date.now }
});
```

---

#### Day 8: Daily Reconciliation

**Tasks:**
```
[ ] Create DailyReconciliation model
    
[ ] Create reconciliationController.js
    - POST /api/reconciliation/close-day → generate daily report
    - GET /api/reconciliation/reports → list by date
    - GET /api/reconciliation/:date → view specific report
    
[ ] Logic for close-day:
    * Get all orders completed on that date
    * Group by payment method
    * Sum totals, compare expected vs actual
    * Calculate discrepancies
    * Mark orders as reconciled
    
[ ] Add /api/reconciliation/compare
    Compare today vs yesterday, vs week avg, vs month avg
```

**Model:**
```javascript
// backend/src/models/DailyReconciliation.js
const reconcilSchema = new Schema({
  date: { type: Date, required: true, unique: true },
  totalOrders: Number,
  totalRevenue: Number,
  paymentBreakdown: {
    cash: Number,
    transfer: Number,
    qris: Number
  },
  discountApplied: Number,
  expectedTotal: Number,
  actualTotal: Number,
  discrepancy: Number,
  notes: String,
  closedBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  closedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
```

---

#### Day 9-10: Frontend Implementation

**Tasks:**
```
[ ] Create AdminStaff.jsx page
    - List staff dengan table
    - Add/edit/delete staff dialog
    - View staff performance metrics
    
[ ] Create CustomerManagement.jsx page
    - List customers dengan tier badge
    - View customer history
    - Send promo to customer
    
[ ] Update DashboardPage.jsx:
    - Show who confirmed/completed each order
    - Show top customers widget
    - Show low stock with reorder button
    
[ ] Create InventoryManagement.jsx page
    - Supplier list & management
    - Purchase order creation/tracking
    - Reorder suggestions (auto-show items below minimum)
    
[ ] Create PromotionManagement.jsx page
    - Create/edit promotion
    - Generate promo codes
    - View promotion performance
    
[ ] Create DailyReconciliation.jsx page
    - View today's reconciliation
    - Generate/close day report
    - Compare period analytics
```

---

#### Day 11: Integration & Testing

**Tasks:**
```
[ ] Update backend/tests/integration.test.js:
    - Test staff CRUD operations
    - Test customer auto-creation
    - Test order with promo code
    - Test daily reconciliation logic
    
[ ] Manual QA:
    - Create staff, login as different roles
    - Create online order → verify customer created
    - Apply promo code → verify discount applied
    - Confirm/complete orders → verify staff tracking
    - Close day → verify reconciliation generated
    
[ ] Update API.md documentation with new endpoints
```

---

## 📝 Environment Variables (Phase 1)

Add to `.env`:
```
# Staff/Security
SALT_ROUNDS=10

# Reconciliation
RECONCILIATION_AUTO_CLOSE=false  # if true, auto-close at midnight

# Promotions
MAX_PROMO_DISCOUNT_PERCENT=50

# CRM
AUTO_TIER_THRESHOLDS=5,20  # bronze/silver/gold at 5 and 20 orders
```

---

## 🗄️ Database Schema Changes Summary

**New Collections:**
- Staff
- Customer
- Supplier
- PurchaseOrder
- Promotion
- PromoCode
- DailyReconciliation

**Modified Collections:**
- Order (add staffId fields, customerId, applied promo fields)
- Ingredient (add supplier ref, cost price)

**Estimated Data Size:** 
- Assuming 1000 orders/month: ~100MB additional storage

---

## 🎨 Frontend Components To Create

```
src/pages/
├─ AdminStaffPage.jsx (manage staff)
├─ CustomerManagementPage.jsx (CRM)
├─ InventoryManagementPage.jsx (suppliers + PO)
├─ PromotionManagementPage.jsx (discounts)
└─ ReconciliationPage.jsx (daily close)

src/components/
├─ StaffTable.jsx
├─ CustomerList.jsx
├─ PurchaseOrderForm.jsx
├─ PromotionForm.jsx
├─ ReconciliationSummary.jsx
└─ PerformanceChart.jsx
```

---

## ⚠️ Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Data migration (add fields to Order) | Use migration script, test on copy first |
| Role-based access control (RBAC) | Implement before production, test all roles |
| Customer privacy (phone storage) | Use encryption, comply with privacy law |
| Promotion abuse (duplicate codes) | Validate code uniqueness, set max use limit |
| Reconciliation discrepancies | Manual review process, audit trail |

---

## 📊 Success Metrics

After Phase 1 implementation:

```
✅ 100% of orders linked to staff
✅ 80%+ of customers tagged automatically
✅ 100% of restock requests tracked
✅ <5% unpaid orders
✅ Daily reconciliation fully automated
✅ All admin functions accessible via UI
✅ Zero critical bugs in production
```

---

## 🔗 Related Documentation

- [ENHANCEMENT_ROADMAP.md](./ENHANCEMENT_ROADMAP.md) - Full features roadmap
- [backend/docs/API.md](./backend/docs/API.md) - API documentation
- [backend/docs/FRONTEND_PLAN.md](./backend/docs/FRONTEND_PLAN.md) - Frontend architecture

---

**Status:** Ready for Development  
**Estimated Timeline:** 10-14 days for small team  
**Next:** Review & approve, then start Day 1 tasks
