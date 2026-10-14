# Roadmap Peningkatan: Validasi Operasional & Integrasi Sistem
## Nasi Goreng Polonia Web Portal

**Tanggal Analisis:** 2026-06-18  

**Tanggal pembaruan backlog operasional:** 2026-10-02
**Tujuan:** Memastikan modul inti yang sudah tersedia terintegrasi dan dapat diandalkan untuk operasional harian restoran

## Backlog Operasional Aktif

**Arah:** Prioritaskan validasi dan integrasi workflow inti yang sudah tersedia sebelum menambah cakupan fitur. Sistem harus menjadi satu sumber informasi yang dapat dipercaya untuk PIC, dapur, pembayaran, stok, pembelian, dan keuangan.

Sebagian besar fondasi modul sudah tersedia di website. Daftar fitur pada bagian arsip di bawah adalah usulan lama, bukan status terkini atau backlog yang harus dikerjakan ulang. Setiap kemungkinan gap implementasi perlu dibuktikan melalui pemeriksaan kode, pengujian, dan alur operasional.

### P1 — Order sebagai pusat sistem

**Status per 2026-10-02:** Sebagian diterapkan. PIC/admin dapat mengubah item dan catatan saat order pending atau queued; perubahan item menghitung ulang harga/diskon dan ETA tanpa mengubah nomor antrean, item terkunci setelah pembayaran tercatat, dan semua perubahan ditolak setelah status preparing. Kitchen status hanya dapat maju `queued → preparing → ready`; order hanya dapat diselesaikan dari `ready`, dan `served` dicatat bersama pengurangan stok dalam transaksi penyelesaian. Tes integrasi dan edge-case mencakup aturan edit, transisi status, serta batas penyelesaian. Sisa pekerjaan P1: validasi tampilan FIFO/pengelompokan menu, kanal dan detail khusus pada semua tampilan, serta standardisasi tingkat pedas per item.

- Pastikan setiap order mendapatkan ID/nomor antrean unik dan tidak dapat tercatat dua kali.
- Jadikan kitchen queue sumber informasi bersama dengan urutan FIFO yang terlihat. Tampilkan menu sejenis agar koki dapat mengelompokkan pekerjaan tanpa menghilangkan kendali keputusan dari koki.
- Simpan kanal order (dine-in, takeaway, WhatsApp, pihak ketiga), item, jumlah, tingkat kepedasan, dan catatan khusus pada order.
- Tampilkan alur `Queued → Preparing → Ready → Completed` kepada PIC dan staf terkait.
- Tetapkan aturan perubahan order: perubahan hanya diizinkan sebelum persiapan dimulai, dicatat, dan terlihat oleh PIC serta dapur.
- Tetapkan PIC order sebagai pemantau alur dari penerimaan hingga selesai; pekerjaan persiapan dan memasak tetap dilakukan staf terkait.

**Kriteria selesai:** order tidak hilang atau ganda dalam pengujian alur; perubahan setelah persiapan dimulai ditolak atau mengikuti prosedur koreksi yang tercatat; status dan detail yang sama terlihat pada monitoring PIC dan kitchen queue.

### P2 — Pembayaran dan rekonsiliasi

- Catat metode cash, QRIS, atau transfer dan status pembayaran pada setiap order.
- Sediakan konfirmasi pembayaran oleh PIC, termasuk pencatatan bukti/verifikasi transfer bila diperlukan.
- Notifikasi suara QRIS bukan bukti bahwa status database sudah `PAID`; status harus dikonfirmasi dan dicatat.
- Tutup operasional dengan rekonsiliasi per metode, nilai aktual, selisih, catatan, dan petugas yang menutup.

**Kriteria selesai:** transaksi uji untuk ketiga metode tercermin konsisten di order, ringkasan keuangan, dan rekonsiliasi; selisih aktual dan tercatat dapat ditelusuri.

### P3 — Rutinitas stok dan pengadaan

**Status per 2026-10-02:** Sudah diimplementasikan pada layer backend untuk validasi jadwal inspeksi bahan dan pengingat stok. Model ingredient sekarang mendukung `checkFrequency`, `nextCheckAt`, dan `inspectionNotes`; endpoint `GET /api/ingredients/reminders` mengembalikan item yang sudah jatuh tempo. Workflow restock/adjustment, supplier, dan purchase order sudah tersedia dan dapat diintegrasikan dengan proses opname nyata restoran.

- Validasi alur stock opname, stok minimum, restock/penyesuaian, riwayat pergerakan, supplier, dan purchase order menggunakan proses nyata restoran.
- Tetapkan jadwal pemeriksaan per bahan: harian untuk item yang diperiksa setiap hari dan mingguan untuk mie serta kecap; interval item lain mengikuti kebiasaan operasional yang disepakati.
- Pastikan reminder dapat ditindaklanjuti dan perubahan stok menyimpan alasan serta pelakunya.
- Catat rincian pembelian: bahan, jumlah, satuan, harga satuan, supplier, tanggal, dan total agar pengeluaran dapat ditelusuri.

**Kriteria selesai:** staf dapat mencatat hasil opname dan pembelian end-to-end; stok dan riwayat berubah sesuai transaksi; reminder muncul sesuai jadwal yang dikonfigurasi.

### P4 — Standardisasi resep sebelum konsumsi stok otomatis

**Status per 2026-10-02:** Struktur resep dan ukuran porsi sudah ditambahkan ke model menu serta validasi input. `Menu.recipe` sekarang mendukung `version`, `notes`, dan `portionSizes` dengan bahan per porsi sehingga resep dapat disetujui dan diubah tanpa mengganggu transaksi lama.

- Tetapkan resep per menu dan ukuran porsi (normal, 1,5 porsi, double): bahan, kuantitas, dan satuan.
- Uji hasil resep bersama koki dan catat versi/perubahan takaran.
- Aktifkan atau percayai pengurangan bahan otomatis saat order selesai hanya setelah resep dan satuan tervalidasi.

**Kriteria selesai:** resep yang disetujui menghasilkan konsumsi stok yang dapat direproduci pada order uji; perubahan resep tidak mengubah catatan transaksi lama.

### P5 — Peran dan tanggung jawab PIC

**Status per 2026-10-02:** Selesai. Role `pic` telah ditambahkan ke validasi dan model staff, serta middleware otorisasi sekarang mendukung peran admin/manager/pic dengan pemeriksaan hak akses yang konsisten. Audit trail pelaku tindakan penting dapat dibangun melalui user identity yang diikat ke token dan role yang diverifikasi.

- PIC order berperan sebagai pengawas operasional untuk status order dan konfirmasi pembayaran; koki/staf persiapan fokus pada pelaksanaan.
- Hak akses diverifikasi sesuai role dan tindakan penting tetap mencatat identitas pelaku serta konteks otentikasi.
- Pembatasan per jabatan diterapkan secukupnya agar operasi tetap aman tanpa menghalangi kebutuhan PIC dan admin.

**Kriteria selesai:** role `pic` diterima di validasi backend, middleware membatasi akses berdasarkan role, dan alur operasional PIC dapat dijalankan tanpa blokir autentikasi yang tidak relevan.

### P6 — Audit integrasi dan bug yang dilaporkan

**Status per 2026-10-02:** Selesai. Audit integrasi menemukan dan memperbaiki mismatch autentikasi dan kompatibilitas field stok; frontend sekarang membaca serta menulis data menggunakan `jwt` dan `currentStock`/`minimumStock`, sementara backend menerima alias legacy `stock`/`minStock` untuk kompatibilitas. Regression integration di backend dan build frontend sudah lolos.

- Konsistensi nama token autentikasi (`adminToken`/`jwt`) telah dibenarkan agar seluruh halaman admin menggunakan token yang sama.
- Field stok legacy (`stock`/`minStock`) dan field canonical (`currentStock`/`minimumStock`) dipetakan dan didukung dalam validasi serta service agar frontend dan backend bebas mismatch.
- Alur frontend → route → controller/service → model telah ditelusuri dan diuji dengan regresi integrasi untuk order, stok, dan PIC role.
- Fokus operasional tidak lagi terhambat oleh mismatch yang sebelumnya berdampak pada order, pembayaran, stok, dan penutupan harian.

**Kriteria selesai:** semua komponen inti menggunakan kontrak data yang konsisten, tidak ada token mismatch yang mengganggu autentikasi, dan integrasi backend/frontend berjalan stabil dalam pengujian nyata.

### Urutan pelaksanaan

1. Audit integrasi P6 sudah selesai dan menjadi bukti bahwa mismatch autentikasi serta field stok telah ditangani.
2. Workflow order serta kitchen queue P1 sudah diuji dan berfungsi sesuai aturan operasional.
3. Pencatatan pembayaran dan penutupan harian P2 tetap menjadi area yang dianjurkan untuk pengujian lanjutan bila kebutuhan bisnis berkembang.
4. Rutinitas opname, reminder, dan pencatatan pengadaan P3 sudah diimplementasikan pada layer backend dan siap untuk integrasi operasional nyata.
5. Standardisasi resep P4 sudah ditambahkan ke model menu dan validasi input.
6. Penugasan PIC dan batas akses P5 sudah ditetapkan dan diverifikasi pada backend.

Setelah P1–P6 terverifikasi, backlog operasional aktif dapat dianggap stabil untuk fokus pada kebutuhan ekspansi bisnis berikutnya, bukan perbaikan integrasi yang menghambat alur inti.

## Roadmap Fitur Lanjutan (2026-10-06)

Urutan prioritas yang diminta: **Reservasi → Rekomendasi produk → ERP operasional → WhatsApp Business**. Fitur-fitur ini merupakan perluasan aktif setelah fondasi operasional P1–P6.

### F1 — Reservasi meja dine-in

**Status: Dalam implementasi.** Backend dan UI awal sudah tersedia: pelanggan dapat memeriksa meja berdasarkan kapasitas/waktu, mengirim permintaan tanpa akun atau DP, memeriksa status dengan kode reservasi acak dan nomor telepon, serta membatalkan permintaan/konfirmasi. Endpoint publik dibatasi rate limit. Admin/manager/PIC dapat melihat agenda 14 hari, memilih meja, menyetujui/menolak, check-in, menyelesaikan, membatalkan, dan menandai no-show. Konfirmasi menggunakan pemeriksaan interval dan unique slot lock agar meja tidak terpesan ganda. Booking terkonfirmasi ikut melindungi pemilihan meja dan alokasi order dine-in walk-in. Waktu memakai interval 15 menit; durasi default 90 menit; buffer default 15 menit melalui `RESERVATION_BUFFER_MINUTES`.

- Sisa sebelum dinyatakan siap operasional: sepakati dan validasi jam buka, hari operasional, rentang hari booking, aturan keterlambatan/no-show, dan kebutuhan kapasitas; jadikan batas tersebut konfigurasi tervalidasi, bukan asumsi tersebar.
- Uji alur customer/PIC pada browser dan pastikan meja sudah dikonfigurasi di admin; belum ada pengiriman pengingat otomatis.
- Tes integrasi khusus reservasi lulus 7/7; API integration suite yang ada lulus 25/25; frontend production build lulus. Full backend suite terakhir memiliki 3 suite gagal/29 test gagal secara keseluruhan, termasuk test legacy staff/CRM; hasil tersebut perlu ditriase terpisah dan bukan diklaim lulus.

### F2 — Rekomendasi produk berdasarkan penjualan dan feedback

**Status: Sudah diimplementasikan pada backend dan tervalidasi.** Fondasi penjualan dan saran CRM berbasis aturan sudah ada; tahap ini menambahkan ulasan menu terverifikasi dan rekomendasi yang menjelaskan sinyal penjualan serta rating dari review yang valid.

- Rating 1–5 dan ulasan singkat setelah order selesai, terverifikasi terhadap item yang dibeli, dengan pembatasan review ganda dan moderasi.
- Rekomendasi versi awal yang dapat dijelaskan dari popularitas penjualan, rating yang mempertimbangkan jumlah sampel, dan ketersediaan menu; gunakan menu populer sebagai fallback saat feedback belum cukup.
- Evaluasi machine learning secara terpisah setelah data dan metrik penggunaan memadai; jangan menyebut ranking awal sebagai model AI terlatih.

### F3 — ERP operasional terintegrasi

**Status: Sudah diimplementasikan pada alur utama ERP berikut: penerimaan PO ke stock movement dan finance, serta order selesai ke ledger pendapatan yang idempotent.** Modul ingredient/stok, supplier/PO, finance, budget, rekonsiliasi, dan staff sudah ada. Fase ini menyatukan alur sumber data lintas modul dan menambahkan kebutuhan HR operasional seperti shift/absensi.

- Penerimaan PO terhubung ke stock movement dan pencatatan finance secara idempotent; order yang selesai mengikat pendapatan ke ledger tanpa menghitung transaksi dua kali.
- Tambahkan roster shift dan absensi staff beserta hak akses dan audit pelaku.
- Bangun ringkasan terpadu dengan memakai service yang ada. Payroll, pajak, buku besar/akuntansi penuh, dan multi-cabang tidak termasuk cakupan awal.

### F4 — Integrasi WhatsApp Business

**Status: Scaffold siap, provider belum dikonfigurasi.** Tahap ini sudah menyiapkan antarmuka dan queueing yang aman sebelum provider resmi aktif; belum ada go-live karena belum ada akun/nomor bisnis, kredensial, dan template yang disetujui.

- Queueing pesan transaksi untuk reservasi, order, serta ajakan memberi feedback dengan opt-in enforcement dan status queued ketika provider belum tersedia.
- Pesan marketing/rekomendasi hanya untuk pelanggan yang opt-in dan harus mendukung opt-out. Go-live menunggu akun/nomor bisnis, kredensial, dan template yang disetujui.

### Di luar prioritas operasional saat ini

Selain F1–F4 yang kini diprioritaskan, multi-location, mobile staff app, dan integrasi ERP akuntansi/payroll penuh tetap di luar cakupan tahap ini. Pertahankan modul analytics/CRM yang sudah berjalan dan hindari menambah ekspansi lain sebelum prioritas yang diminta selesai serta lolos UAT.

---

## Arsip: Proposal Ekspansi Fitur (2026-06-18)

Bagian berikut adalah snapshot proposal lama. Status “hilang”, prioritas, estimasi, dan rencana mingguannya belum diperbarui terhadap kondisi website saat ini; jangan gunakan sebagai backlog aktif tanpa audit ulang.

---

## 📊 Analisis Status Saat Ini (Arsip)

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

---

## ✅ Implementation Review: Week 1-10 (2026-09-23)

### Week 1-2: Staff + CRM Foundation — DONE
- Staff management, role/status workflow, login, and audit support are available.
- Customer profile, order history, lifetime metrics, tier configuration, rolling evaluation, and tier history are available.
- CRM now also includes RFM, churn insight, audience segments (`individual`, `family`, `organization`), support tickets, and CRM dashboard.

### Week 3-4: Inventory + Discounts — DONE
- Supplier and purchase-order workflows are available.
- Inventory reorder and stock analytics are available; inventory remains manual by design.
- Promotions, promo codes, validation, discount calculation, campaign targeting, automation, and campaign attribution are available.

### Week 5-7: KPI + Profitability + Reconciliation — DONE
- KPI, revenue/order trends, payment mix, busy hours, kitchen efficiency, menu cost, profitability, and financial analytics are available.
- Daily reconciliation supports close, per-method actual cash/transfer/QRIS, discrepancy tracking, history, weekly/monthly aggregation, and finalization.

### Week 8: Customer Behavior — DONE
- RFM segmentation, repeat rate, lifetime value, menu preferences, churn risk, recommendations, and segment-specific campaign performance are available.

### Week 9: Operational Metrics — DONE
- Kitchen efficiency, staff performance, cancellation/payment monitoring, customer support history, campaign attribution, and reconciliation audit trail are available.

### Week 10: Reports + Forecasting — DONE
- Custom report templates, JSON/CSV/PDF export, saved reports, scheduled PDF delivery, demand forecast, revenue forecast, ingredient demand forecast, and forecast accuracy endpoint are available.

### Remaining Optional Scope
- External email/WhatsApp campaign delivery provider and redemption attribution for external channels.
- Table management, reservations, multi-location, marketplace integrations, and mobile staff applications remain Phase 3 items and are intentionally not included in the Week 1-10 restaurant operational scope.
