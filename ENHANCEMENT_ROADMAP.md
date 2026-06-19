# Roadmap Peningkatan: Admin Features & Business Intelligence
## Nasi Goreng Polonia Web Portal

**Tanggal Analisis:** 2026-06-18  
**Tujuan:** Transformasi sistem dari order-management dasar menjadi platform operasional & BI untuk restoran

---

## 📊 Analisis Status Saat Ini

### ✅ Fitur yang Sudah Ada
- Dashboard harian (ringkasan order, stok rendah)
- Order management (buat, konfirmasi, tracking dapur, selesai)
- Manajemen menu & bahan (ingredients)
- Pembayaran manual (cash, transfer, QRIS)
- Laporan sederhana (penjualan harian, menu top-5)
- Finance dashboard
- Authentication admin (JWT)
- Stock movements tracking

### ❌ Fitur Kritis yang HILANG
Ini adalah fitur standar di restoran konvensional yang belum ada:

1. **Staff/User Management** - Admin belum bisa mengelola kasir, chef, dll
2. **Customer Relationship Management (CRM)** - Tidak tahu pelanggan mana yang sering order
3. **Inventory & Reordering** - Cuma lihat stok rendah, belum ada workflow pemesanan bahan
4. **Daily Reconciliation** - Tidak ada laporan penutupan hari
5. **Advanced Reporting** - Belum ada profit margin, cost analysis, forecasting
6. **Table Management** - Jika ada dine-in, tidak bisa atur meja
7. **Reservations** - Tidak bisa booking tempat
8. **Promotions/Discounts** - Belum ada sistem diskon & promo
9. **Audit Trail** - Tidak log siapa buat/ubah pesanan

---

## 🎯 PHASE 1: Admin Features Essentials (3-4 minggu)

### 1. **Staff Management System**
**Impact:** HIGH | **Complexity:** MEDIUM

**Apa yang diperlukan:**
```
Models baru:
- Staff (nama, role, email, password, phone, status)
  Roles: admin, manager, cashier, chef, waiter
- StaffLog (siapa login kapan, aksi apa)
- StaffShift (jadwal kerja per staff)

API endpoints:
- POST /api/staff → create staff
- GET /api/staff → list dengan pagination
- PATCH /api/staff/:id → update role/status
- DELETE /api/staff/:id → soft delete
- GET /api/staff/logs → audit trail siapa aksi apa
```

**Manfaat:**
- Admin bisa assign siapa yang kerja
- Tracking siapa yang confirm/complete order
- Akuntabilitas untuk kitchen & kasir

---

### 2. **Customer CRM Basics**
**Impact:** HIGH | **Complexity:** MEDIUM

**Apa yang diperlukan:**
```
Models baru:
- Customer (nama, phone, email, dari order online)
  + totalOrders, totalSpent, lastOrderDate, tierStatus
- CustomerTier (bronze, silver, gold based on spending)

API endpoints:
- GET /api/customers → list semua + filter by tier
- GET /api/customers/:id/orders → riwayat order customer
- PATCH /api/customers/:id → update preferred items, notes
- POST /api/customers/:id/send-promo → kirim promo personal
```

**Manfaat:**
- Tahu pelanggan setia mana
- Bisa send targeted promotions
- Personalisasi service

---

### 3. **Inventory Management & Reordering**
**Impact:** HIGH | **Complexity:** MEDIUM

**Apa yang diperlukan:**
```
Models baru:
- SupplierOrder (PO ke supplier)
  Fields: supplierId, items[], status, expectedDate, actualDate
- Supplier (nama, contact, leadTime)
- InventoryAlert (alert rule: jika stok < X, auto notify)

API endpoints:
- POST /api/purchase-orders → create PO
- GET /api/purchase-orders → list + filter by status
- PATCH /api/purchase-orders/:id/receive → mark terima barang
- GET /api/suppliers → list suppliers
- POST /api/suppliers → add supplier
```

**Manfaat:**
- Sistematis dalam restock
- Tidak kehabisan bahan
- Audit trail pembelian bahan

---

### 4. **Discount & Promotion Management**
**Impact:** MEDIUM | **Complexity:** MEDIUM

**Apa yang diperlukan:**
```
Models baru:
- Promotion (name, type: percentage/fixed, discount%, appliedTo, validFrom/To)
- PromoCode (code: "NASI50", percentage, maxUse, usedCount)

Modifikasi Order.items:
+ appliedPromo, discountAmount, discountPercent

API endpoints:
- POST /api/promotions → create promo
- GET /api/promotions → list aktif
- POST /api/promo-codes → generate kode
- GET /api/promo-codes/:code/validate → check valid & count
```

**Manfaat:**
- Kampanye penjualan terstruktur
- Flash sale / seasonal discounts
- Tracking conversion promo

---

### 5. **Daily Reconciliation Report**
**Impact:** MEDIUM | **Complexity:** MEDIUM

**Apa yang diperlukan:**
```
Model baru:
- DailyReconciliation
  Fields: date, totalOrders, totalRevenue, 
          totalCash, totalTransfer, totalQRIS,
          expectedVsActual, discrepancy, notes, 
          closedBy (staff), closedAt

API endpoint:
- POST /api/reconciliation/close-day → create daily report
- GET /api/reconciliation/reports → list reports + date filter
- GET /api/reconciliation/:date → detail report
```

**Manfaat:**
- Penutupan hari otomatis
- Cash audit trail
- Identify missing/extra cash

---

## 📈 PHASE 2: Business Intelligence & Analytics (4-5 minggu)

### 1. **Real-time KPI Dashboard**
**Impact:** CRITICAL | **Complexity:** HIGH

**Metrics yang ditampilkan:**
```
📊 Today's Performance
├─ Revenue (vs target, vs yesterday)
├─ Total Orders (vs avg)
├─ Avg Order Value
├─ Payment Success Rate
├─ Kitchen Efficiency (% orders on-time)
├─ Customer Satisfaction (if rating ada)
└─ Cash vs Online ratio

📈 This Week / Month
├─ Revenue trend (line chart)
├─ Orders trend
├─ Busiest hours
└─ Compare to last period
```

**Fitur:**
```
API endpoints:
- GET /api/analytics/kpi?period=today|week|month|custom
- GET /api/analytics/hourly-distribution → busy hours
- GET /api/analytics/payment-distribution → cash vs online
- GET /api/analytics/top-customers → customer by spending
- GET /api/analytics/top-menus → menu profitability
```

**Manfaat:**
- Lihat performa bisnis real-time
- Quick decision making
- Performance monitoring

---

### 2. **Menu & Profit Analysis**
**Impact:** HIGH | **Complexity:** HIGH

**Apa yang perlu:**
```
Tambah field di Menu model:
- costPrice (harga bahan mentah)
- ingredientsCost (total ingredient cost)
- profitMargin (calculated)
- foodCost% 

API endpoints:
- GET /api/analytics/menu-profitability → ranking menu by profit
- GET /api/analytics/menu-trend?menuId&period → trend penjualan
- GET /api/analytics/food-cost-ratio → total food cost %
```

**Analisis yang dihasilkan:**
```
✅ Menu dengan profit margin tertinggi
❌ Menu dengan profit margin terendah
📊 Menu yang paling laris
💰 Average profit per menu
📉 Trend penjualan per menu
```

**Manfaat:**
- Tahu menu mana yang menguntungkan
- Pricing strategy optimization
- Identify loss-leaders
- Focus marketing ke high-margin items

---

### 3. **Customer Behavior Analytics**
**Impact:** HIGH | **Complexity:** MEDIUM

**Metrics:**
```
API endpoints:
- GET /api/analytics/customer-segments → gold/silver/bronze
- GET /api/analytics/repeat-customers → customer loyalty
- GET /api/analytics/customer-lifetime-value → total value per customer
- GET /api/analytics/menu-preferences/:customerId → apa yg sering order
- GET /api/analytics/churn-risk → customers yg lama tidak order
```

**Insights:**
```
👑 Top 20% customers = 80% revenue
🔄 Repeat customer rate
💔 Churn risk (tidak order > 30 hari)
🎯 Product preferences per segment
```

**Manfaat:**
- Retention strategy
- Personalized marketing
- VIP customer management

---

### 4. **Operational Efficiency Metrics**
**Impact:** MEDIUM | **Complexity:** MEDIUM

**Metrics:**
```
API endpoints:
- GET /api/analytics/kitchen-efficiency → on-time delivery %
- GET /api/analytics/avg-prep-time → berapa lama rata-rata masak
- GET /api/analytics/order-cancellation-rate → % order dibatalkan
- GET /api/analytics/payment-issues → unpaid orders tracking
- GET /api/analytics/staff-performance → by cashier/kitchen
```

**Dashboard menunjukkan:**
```
⏱️ Avg order prep time: 12 min (vs target 15)
✅ On-time delivery: 94% (target 95%)
❌ Cancellation rate: 2% (trend: ↓ good)
💳 Unpaid orders: 5 items
👨‍💼 Staff: Chef A perf 98%, Chef B perf 89%
```

**Manfaat:**
- Identify bottlenecks
- Staff coaching areas
- Quality control

---

### 5. **Forecasting & Demand Planning**
**Impact:** MEDIUM | **Complexity:** HIGH

**Apa yang bisa:**
```
API endpoints:
- GET /api/analytics/demand-forecast?days=7|30 → predict order volume
- GET /api/analytics/ingredient-forecast → predict ingredient needs
- POST /api/analytics/forecast-accuracy → ML model improvement
```

**Prediksi untuk:**
```
📅 Next 7 days: expect 200 orders
🥘 Ingredient needs (auto reorder suggestions)
👥 Peak hours prediction (for staffing)
💰 Revenue forecast
```

**Manfaat:**
- Proactive staffing
- Inventory optimization
- Avoid stockouts
- Revenue planning

---

### 6. **Custom Reports Generator**
**Impact:** MEDIUM | **Complexity:** HIGH

**Fitur:**
```
Admin bisa generate reports:
- Date range: dari tanggal X ke Y
- Group by: hari, minggu, bulan, kategori menu
- Metrics: revenue, order count, avg value, food cost, profit
- Export: PDF, Excel, CSV
- Schedule: daily/weekly/monthly auto-email

API endpoints:
- POST /api/reports/custom → generate report
- GET /api/reports/templates → list template reports
- POST /api/reports/schedule → auto-generate & email
```

**Template reports ready:**
```
1. Daily Sales Report (standar setiap hari)
2. Weekly Performance Report
3. Monthly Financial Summary
4. Ingredient Cost Analysis
5. Menu Performance Ranking
6. Customer Acquisition Report
7. Cashier Daily Settlement
8. Kitchen Production Report
```

**Manfaat:**
- Data-driven decision
- Presentasi ke stakeholder
- Compliance tracking

---

## 🔧 PHASE 3: Advanced Features (Optional, 5+ minggu)

### 1. **Multi-Location Management**
- Manage multiple outlets dari satu dashboard
- Consolidate reports across branches
- Per-branch KPI tracking

### 2. **Table Management & Reservations**
- If ada dine-in: manage meja, reservasi
- QR code per table
- Digital menu via QR

### 3. **Integration: Online Ordering Platform**
- Connect dengan Grabfood, Gojek, Shopee
- Auto-sync orders ke sistem
- Commission tracking

### 4. **AI-Powered Recommendations**
- Suggest menu to customer based on history
- Dynamic pricing recommendations
- Optimal staffing suggestions

### 5. **Mobile App for Staff**
- Kitchen staff app (live queue, order details)
- Cashier app (quick order, payment)
- Delivery tracking (jika ada delivery)

---

## 📋 Implementation Priority Matrix

| Feature | Impact | Complexity | Priority | Effort (days) |
|---------|--------|-----------|----------|---------------|
| Staff Management | High | Medium | 🔴 P1 | 5 |
| Customer CRM | High | Medium | 🔴 P1 | 5 |
| Inventory Reorder | High | Medium | 🔴 P1 | 4 |
| KPI Dashboard | Critical | High | 🔴 P1 | 7 |
| Menu Profitability | High | Medium | 🔴 P1 | 5 |
| Daily Reconciliation | Medium | Medium | 🟡 P2 | 4 |
| Customer Analytics | High | Medium | 🟡 P2 | 5 |
| Operational Metrics | Medium | Medium | 🟡 P2 | 4 |
| Discounts/Promo | Medium | Medium | 🟡 P2 | 4 |
| Custom Reports | Medium | High | 🟡 P2 | 6 |
| Forecasting | Medium | High | 🟢 P3 | 8 |
| Multi-Location | Medium | High | 🟢 P3 | 10 |

---

## 🚀 Recommended Implementation Plan

### **Week 1-2: Staff + CRM Foundation**
1. Create Staff model & auth with roles
2. Create Customer model + tracking
3. Add staff audit logs
4. Simple staff management UI

### **Week 3-4: Inventory + Discounts**
5. Supplier & PO system
6. Promotion/discount system
7. Inventory alerts workflow

### **Week 5-7: KPI Dashboard**
8. Build analytics aggregation APIs
9. Menu profitability calculations
10. Real-time KPI dashboard UI

### **Week 8-10: Advanced Analytics**
11. Customer segmentation & behavior
12. Operational efficiency metrics
13. Custom reports generator
14. Forecast models (simple)

---

## 💻 Technical Stack Recommendations

### Backend Additions
```
Dependencies to add:
- chart.js / recharts data prep
- node-cron (scheduled reports)
- xlsx / pdf-lib (export reports)
- node-ml (simple forecasting)
- bull (job queue for heavy analytics)
```

### Frontend Additions
```
- Recharts / Chart.js (data visualization)
- React-Table (complex data tables)
- PDF viewer (report preview)
- React-Select (filtering)
- Date-range picker (period selection)
```

---

## 💡 Quick Wins (Start Here)

If waktu terbatas, prioritas **Week 1 improvements**:

1. ✅ **Add `staffId` to Orders** → track siapa confirm/complete
2. ✅ **Create Customer auto-tagging** → tag dari phone number
3. ✅ **Add `costPrice` to Ingredients** → calculate profit margin real-time
4. ✅ **Create `/api/analytics/today` endpoint** → live KPI dashboard
5. ✅ **Add Export to Excel** untuk existing reports

**Effort:** 3-4 hari | **Impact:** High

---

## 📞 Questions untuk Clarify Requirements

1. **Apakah ada dine-in atau hanya delivery/takeaway?**
   - Jika ada dine-in → butuh table management

2. **Berapa staff yang bekerja per hari?**
   - Untuk design staff management complexity

3. **Ada target revenue/KPI tertentu?**
   - Untuk priority forecasting & goal tracking

4. **Integrasi dengan Grabfood/Gojek?**
   - Jika iya → tambah data sync complexity

5. **Berapa cabang yang akan ada?**
   - Jika multi-location → perlu architecture adjust

6. **Apakah ada printer/hardware khusus?**
   - Untuk thermal printer integration

---

## ✨ Expected Business Impact

Setelah implementasi **Phase 1 + 2**:

```
📈 Revenue Growth
├─ Targeted marketing → +10-15% repeat customers
├─ Optimized pricing → +5-8% profit margin
└─ Better staffing → -10% operational cost

👥 Customer Experience
├─ Personalized service
├─ Faster order fulfillment
└─ Better tracking

📊 Data-Driven Operations
├─ Know which menu to promote
├─ Optimal inventory levels
├─ Staff performance visibility
└─ Real-time business health

🎯 Strategic Advantage
├─ Competitive differentiation
├─ Scalable ops for multi-branch
└─ Ready for franchise model
```

---

## 📝 Next Steps

1. **Review roadmap ini** dengan stakeholders
2. **Prioritize fitur** berdasarkan business needs
3. **Allocate resources** untuk development
4. **Start dengan Phase 1** (Staff + CRM + Inventory)
5. **Iterate & collect feedback** dari pengguna

---

**Prepared by:** GitHub Copilot AI Assistant  
**Status:** Ready for Development  
**Last Updated:** 2026-06-18
