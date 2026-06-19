# Phase 1 API Additions
## Staff Management, CRM, Inventory, Promotions

**Last Updated:** 2026-06-18

---

## 🔐 Staff Management

### Create Staff
**POST** `/api/staff`
```json
{
  "email": "staff@email.com",
  "password": "SecurePass@123",
  "name": "Staff Name",
  "phone": "08123456789",
  "role": "cashier",
  "notes": "Optional notes"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "email": "staff@email.com",
    "name": "Staff Name",
    "role": "cashier",
    "status": "active",
    "joinDate": "2026-06-18T..."
  }
}
```

### Staff Login
**POST** `/api/staff/login`
```json
{
  "email": "staff@email.com",
  "password": "SecurePass@123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "expiresIn": 43200,
    "staff": {
      "id": "...",
      "email": "staff@email.com",
      "name": "Staff Name",
      "role": "cashier"
    }
  }
}
```

### Get All Staff
**GET** `/api/staff?role=cashier&status=active&page=1&limit=20&search=john`

### Get Staff by ID
**GET** `/api/staff/:id`

### Update Staff
**PATCH** `/api/staff/:id`
```json
{
  "name": "New Name",
  "phone": "08987654321",
  "role": "manager",
  "status": "active"
}
```

### Delete Staff (Deactivate)
**DELETE** `/api/staff/:id`

### Get Staff Performance
**GET** `/api/staff/:id/performance?from=2024-01-01&to=2024-01-31`
**Response:**
```json
{
  "success": true,
  "data": {
    "confirmed": 45,
    "completed": 42,
    "revenue": 1250000
  }
}
```

---

## 👥 Customer CRM

### Get All Customers
**GET** `/api/customers?tier=gold&page=1&limit=20&search=john`

### Get Customer Details
**GET** `/api/customers/:id`

### Get Customer Order History
**GET** `/api/customers/:id/orders?limit=50`

### Get Customer Lifetime Value
**GET** `/api/customers/:id/lifetime-value`

### Update Customer
**PATCH** `/api/customers/:id`
```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "address": "New Address",
  "notes": "VIP Customer"
}
```

### Get Top Customers
**GET** `/api/customers/analytics/top?limit=20&from=2024-01-01&to=2024-01-31`

### Get Customer Segments
**GET** `/api/customers/analytics/segments`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "gold",
      "count": 12,
      "avgSpent": 75000,
      "totalSpent": 900000,
      "avgOrders": 18
    }
  ]
}
```

### Get Repeat Customer Rate
**GET** `/api/customers/analytics/repeat-rate?from=2024-01-01&to=2024-01-31`

### Get Churn Risk Customers
**GET** `/api/customers/analytics/churn-risk?days=30&limit=20`

---

## 🏢 Supplier Management

### Create Supplier
**POST** `/api/suppliers`
```json
{
  "name": "PT Supplier",
  "contact": "John Supplier",
  "email": "contact@supplier.com",
  "phone": "021-1234-5678",
  "address": "Jl. Supplier No 1",
  "leadTime": 2,
  "paymentTerms": "NET 30"
}
```

### Get All Suppliers
**GET** `/api/suppliers?isActive=true&page=1&limit=20&search=supplier`

### Get Supplier by ID
**GET** `/api/suppliers/:id`

### Update Supplier
**PATCH** `/api/suppliers/:id`

### Delete Supplier (Soft Delete)
**DELETE** `/api/suppliers/:id`

---

## 📦 Purchase Orders

### Create Purchase Order
**POST** `/api/purchase-orders`
```json
{
  "supplierId": "supplier_id",
  "expectedDate": "2024-01-25",
  "items": [
    {
      "ingredientId": "ingredient_id",
      "quantity": 50,
      "unit": "kg",
      "unitPrice": 50000
    }
  ],
  "notes": "Urgent delivery needed"
}
```

### Get All Purchase Orders
**GET** `/api/purchase-orders?status=pending&supplierId=..&page=1&limit=20`

### Get PO by ID
**GET** `/api/purchase-orders/:id`

### Update PO Status
**PATCH** `/api/purchase-orders/:id/status`
```json
{
  "status": "confirmed"
}
```
**Status values:** `pending`, `confirmed`, `received`, `cancelled`

### Receive Purchase Order (Mark as Received + Update Stock)
**PATCH** `/api/purchase-orders/:id/receive`

### Cancel Purchase Order
**PATCH** `/api/purchase-orders/:id/cancel`
```json
{
  "reason": "Supplier out of stock"
}
```

### Get Pending POs
**GET** `/api/purchase-orders/analytics/pending`

### Get Overdue POs
**GET** `/api/purchase-orders/analytics/overdue`

---

## 🎟️ Promotions & Promo Codes

### Create Promotion
**POST** `/api/promotions`
```json
{
  "name": "Summer Discount 20%",
  "description": "Special promotion for summer",
  "type": "percentage",
  "discountValue": 20,
  "applicableTo": "all",
  "minimumOrderValue": 50000,
  "maximumDiscount": 100000,
  "validFrom": "2024-01-01",
  "validTo": "2024-01-31",
  "notes": "Limited time"
}
```

### Get Active Promotions
**GET** `/api/promotions/active?limit=50`

### Generate Promo Codes
**POST** `/api/promotions/:id/generate-codes`
```json
{
  "count": 10,
  "prefix": "SUMMER"
}
```

### Validate Promo Code
**GET** `/api/promo-codes/validate/:code`

### Get Promotion Performance
**GET** `/api/promotions/:id/performance?from=2024-01-01&to=2024-01-31`

---

## 💰 Order Enhancements (Phase 1)

### Order now includes:

**New fields when creating order:**
```json
{
  "promoCode": "SUMMER20"
}
```

**New fields in order response:**
```json
{
  "confirmedBy": "staff_id",
  "completedBy": "staff_id",
  "modifiedBy": "staff_id",
  "customerId": "customer_id",
  "promoCodeUsed": "SUMMER20",
  "discountAmount": 100000,
  "discountPercentage": 20,
  "amountAfterDiscount": 400000
}
```

---

## 📋 Order Confirmation Updates

When confirming order (`PATCH /api/orders/:id/confirm`):
- `confirmedBy` is automatically set to current staff ID
- System auto-tags customer if phone provided and online channel

When completing order (`PATCH /api/orders/:id/complete`):
- `completedBy` is automatically set to current staff ID
- Customer stats (totalOrders, totalSpent, lastOrderDate) are updated
- Customer tier is recalculated

---

## 🔑 Authentication

All admin endpoints require:
```
Authorization: Bearer <jwt_token>
```

**Token obtained from:**
- `POST /api/auth/login` (for admin)
- `POST /api/staff/login` (for staff)

Token includes staff role and info for audit logging.

---

## 📊 Audit Logging

All staff actions are logged to `AuditLog` collection with:
- Admin/Staff ID and Name
- Action (create, update, delete, confirm, complete, etc.)
- Resource type and ID
- IP Address
- Timestamp
- Metadata (changes details)

**Query audit logs:**
```
GET /api/audit-logs?adminId=...&action=complete&from=2024-01-01&to=2024-01-31
```

---

## ✨ Data Migration Notes

Running Phase 1 on existing orders:
1. Old orders will have `confirmedBy`, `completedBy`, `modifiedBy` as `null`
2. Old orders will not have `customerId` unless manually set
3. Customer CRM will only track new online orders automatically
4. Staff tracking begins from update date

Optional migration scripts available in `scripts/` folder.

---

## 🧪 Testing Phase 1 Endpoints

### Quick Test Flow:

1. **Seed test data:**
   ```bash
   MONGODB_URI="..." node scripts/seed-phase1.js
   ```

2. **Staff login:**
   ```bash
   curl -X POST http://localhost:5000/api/staff/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@nasigoreng.local","password":"Admin@123456"}'
   ```

3. **Get token** from response, use in Authorization header

4. **Get customers:**
   ```bash
   curl http://localhost:5000/api/customers \
     -H "Authorization: Bearer <token>"
   ```

---

**See main API.md for Phase 0 endpoints (existing functionality)**
