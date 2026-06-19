# Phase 1 Quick Start Guide
## Running & Testing the Implementation

**Last Updated:** 2026-06-18

---

## 🚀 Quick Start (5 minutes)

### 1. Ensure MongoDB is Running

**Option A: Docker (Recommended)**
```bash
# From repo root
docker compose up -d mongodb
```

**Option B: Local MongoDB**
```bash
# Make sure MongoDB is running on localhost:27017
mongod --replSet rs0
```

### 2. Setup Backend Environment

```bash
cd backend

# Copy env if not exists
# IMPORTANT: Set MONGODB_URI with replica set
export MONGODB_URI="mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true"
export JWT_SECRET="your-secret-key-here"
export NODE_ENV="development"
```

### 3. Seed Test Data

```bash
# From backend directory
npm run seed:phase1

# Or manually:
MONGODB_URI="mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0" node scripts/seed-phase1.js
```

**Output should show:**
```
✓ Created 5 staff members
✓ Created 5 customers
✓ Created 2 suppliers
✓ Created 2 promotions
✓ Created 10 promo codes

🔐 Test Credentials:
  Admin:   admin@nasigoreng.local / Admin@123456
  Kasir:   kasir1@nasigoreng.local / Kasir@123456
  Chef:    chef1@nasigoreng.local / Chef@123456
```

### 4. Start Backend Server

```bash
# From backend directory
npm run dev

# Should see:
# Server listening on port 5000
# Connected to MongoDB
```

### 5. Test API (in another terminal)

```bash
# Test health
curl http://localhost:5000/api/health

# Staff login
RESPONSE=$(curl -s -X POST http://localhost:5000/api/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nasigoreng.local","password":"Admin@123456"}')

# Extract token
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test with token
curl http://localhost:5000/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Test Scenarios

### Scenario 1: Staff Login & View Customers

```bash
# 1. Login as admin
curl -X POST http://localhost:5000/api/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nasigoreng.local",
    "password": "Admin@123456"
  }'

# Response: Get token from data.token

# 2. List all customers
curl http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get specific customer
curl http://localhost:5000/api/customers/:customer_id \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get customer analytics
curl http://localhost:5000/api/customers/analytics/top?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scenario 2: Create Staff Member

```bash
curl -X POST http://localhost:5000/api/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "newstaff@email.com",
    "password": "SecurePass@123",
    "name": "New Staff",
    "phone": "08999999999",
    "role": "cashier"
  }'
```

### Scenario 3: Supplier & Purchase Order

```bash
# 1. Create supplier
curl -X POST http://localhost:5000/api/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "New Supplier",
    "contact": "Supplier Contact",
    "email": "supplier@email.com",
    "leadTime": 2
  }'

# Get supplier ID from response

# 2. Get ingredients for PO
curl http://localhost:5000/api/ingredients \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get ingredient ID from response

# 3. Create purchase order
curl -X POST http://localhost:5000/api/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplierId": "SUPPLIER_ID",
    "items": [
      {
        "ingredientId": "INGREDIENT_ID",
        "quantity": 50,
        "unit": "kg",
        "unitPrice": 50000
      }
    ],
    "notes": "Urgent order"
  }'

# Get PO ID from response

# 4. Receive PO (updates stock)
curl -X PATCH "http://localhost:5000/api/purchase-orders/PO_ID/receive" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scenario 4: Promotions & Promo Codes

```bash
# 1. Create promotion (via promotionService - not yet exposed in controller)
# This would need to be implemented in promotionController

# 2. Use promo code on order
# When creating order, include promoCode:
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "online",
    "customerName": "Test Customer",
    "customerPhone": "08123456789",
    "items": [
      {
        "menu": "MENU_ID",
        "quantity": 2,
        "priceAtOrder": 25000
      }
    ],
    "promoCode": "DIS1"
  }'
```

---

## 🧪 Automated Testing

### Jest Tests (if configured)

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=staff

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Manual Test Checklist

```
Staff Management:
  [ ] Create staff with all roles
  [ ] Login as different staff
  [ ] Get staff list and details
  [ ] Update staff information
  [ ] Get staff performance metrics

Customer CRM:
  [ ] List customers
  [ ] View customer details
  [ ] Get customer order history
  [ ] Get top customers
  [ ] Check customer segments
  [ ] Get repeat customer rate

Suppliers:
  [ ] Create supplier
  [ ] List suppliers
  [ ] Update supplier
  [ ] Delete supplier

Purchase Orders:
  [ ] Create PO
  [ ] List pending POs
  [ ] Receive PO (verify stock update)
  [ ] Cancel PO
  [ ] Get overdue POs

Promotions:
  [ ] Create promotion (manual test for now)
  [ ] Validate promo code
  [ ] Apply promo to order
  [ ] Check discount calculation

Order Integration:
  [ ] Create order with customer phone
  [ ] Verify customer auto-tagged
  [ ] Create order with promo code
  [ ] Verify discount applied
  [ ] Confirm order tracks staff
  [ ] Complete order updates customer stats
```

---

## 🔍 Debugging

### View MongoDB Data

```bash
# Connect to mongo
mongosh

# Use database
use nasi_goreng_polonia

# View collections
show collections

# Count documents
db.staffs.countDocuments()
db.customers.countDocuments()

# Find sample documents
db.staffs.findOne()
db.customers.findOne()
db.purchaseorders.findOne()

# Query specific staff
db.staffs.find({ email: "admin@nasigoreng.local" })
```

### Check Server Logs

```bash
# If running with npm run dev, logs appear in terminal
# Look for errors when testing endpoints

# Check for authentication errors
# "UNAUTHORIZED", "INVALID_TOKEN", "STAFF_INACTIVE"
```

### Test Invalid Requests

```bash
# Missing required field
curl -X POST http://localhost:5000/api/staff \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com"}'

# Invalid email format
curl -X POST http://localhost:5000/api/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "invalid-email",
    "password": "Weak123",
    "name": "Test"
  }'

# Wrong authentication
curl http://localhost:5000/api/staff \
  -H "Authorization: Bearer wrong-token"
```

---

## 📊 API Endpoint Reference

See `PHASE1_API_REFERENCE.md` for complete endpoint documentation.

### Quick Command Reference

```bash
# Set token for easy reuse
TOKEN="your-jwt-token-here"

# Staff endpoints
curl http://localhost:5000/api/staff -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/staff/:id -H "Authorization: Bearer $TOKEN"

# Customer endpoints
curl http://localhost:5000/api/customers -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/customers/analytics/top -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/customers/analytics/segments -H "Authorization: Bearer $TOKEN"

# Supplier endpoints
curl http://localhost:5000/api/suppliers -H "Authorization: Bearer $TOKEN"

# Purchase Order endpoints
curl http://localhost:5000/api/purchase-orders -H "Authorization: Bearer $TOKEN"
curl "http://localhost:5000/api/purchase-orders/analytics/pending" -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Common Issues & Fixes

### Issue: MongoDB Connection Failed

**Solution:**
```bash
# Check MongoDB is running
mongosh
# If it fails, start MongoDB:
docker compose up -d mongodb
# or
mongod --replSet rs0
```

### Issue: JWT_SECRET not set

**Solution:**
```bash
export JWT_SECRET="your-secret-key-change-in-production"
npm run dev
```

### Issue: MONGODB_URI not with replica set

**Solution:**
```bash
# Must include replica set for transactions to work
export MONGODB_URI="mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true"
```

### Issue: Seed script fails

**Solution:**
```bash
# Make sure MongoDB is running
# Make sure MONGODB_URI is set correctly
# Check if collections already exist, you might need to drop them:

mongosh
use nasi_goreng_polonia
db.staffs.deleteMany({})
db.customers.deleteMany({})
# Then re-run seed script
```

### Issue: Password too weak error

**Solution:**
```bash
# Password must have:
# - Min 8 characters
# - At least one uppercase letter
# - At least one lowercase letter
# - At least one number
# - At least one special character (@$!%*?&)

# Example: Admin@123456  ✓
# Example: admin123       ✗ (no uppercase, no special char)
```

---

## 📝 Next Steps After Testing

1. ✅ **Verify all endpoints work**
   - Use test scenarios above
   - Check error responses
   - Validate data in MongoDB

2. 🔄 **Prepare frontend integration**
   - Share `PHASE1_API_REFERENCE.md` with frontend team
   - Prepare sample responses for UI mockup
   - Discuss authentication token handling

3. 📋 **Create integration tests**
   - Test complete workflows
   - Test edge cases
   - Test error scenarios

4. 🚀 **Deploy to staging**
   - Test on staging environment
   - Verify database migrations
   - Performance testing

---

## 🎯 Success Indicators

✅ All endpoints return 200/201 on valid requests  
✅ Proper 400/401/404 on invalid requests  
✅ Staff can login and get token  
✅ Customers can be listed with filters  
✅ Purchase orders can be created and received  
✅ Stock updates when PO received  
✅ Promo codes validate correctly  
✅ Audit logs track all actions  
✅ Customer tier auto-calculates  

---

## 📞 Support

For issues or questions:
1. Check `PHASE1_IMPLEMENTATION_PROGRESS.md` for architecture details
2. Check `PHASE1_API_REFERENCE.md` for endpoint specifications
3. Review code in `src/services/` and `src/controllers/`
4. Check MongoDB data consistency

---

**Ready to proceed with Phase 1 frontend development!** 🎉
