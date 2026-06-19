# PHASE 2: Business Intelligence Implementation
## Advanced Analytics & KPI Dashboard

**Duration:** 12-15 days  
**Prerequisite:** Phase 1 (Staff + CRM + Inventory) complete

---

## 🎯 Phase 2 Goals

Transform raw operational data into **actionable business insights**:

- ✅ Real-time KPI dashboard (revenue, orders, efficiency)
- ✅ Menu profitability analysis (know which dishes make money)
- ✅ Customer behavior insights (retention, spending patterns)
- ✅ Kitchen efficiency metrics (prep time, on-time %)
- ✅ Customizable reports with export (PDF/Excel)

---

## 📊 Implementation Breakdown

### Week 1: KPI Dashboard & Menu Profitability

#### Day 1-2: Enhance Menu Model with Cost Data

**Tasks:**
```
[ ] Update Menu model:
    - Add costPrice (total ingredient cost)
    - Add profitMargin (calculated)
    - Add foodCostPercent (calculated)
    
[ ] Create migration script to backfill costPrice from ingredients
    
[ ] Create /api/analytics/menu-cost endpoint
    Returns: costPrice, salePrice, profitMargin for each menu
    
[ ] Create menuController.updateCost()
    - Recalculate costPrice when recipe changes
```

**Schema Update:**
```javascript
// Add to Menu schema
{
  // existing fields...
  
  // Phase 2 additions
  costPrice: {
    type: Number,
    default: 0,
    description: "Sum of ingredient costs"
  },
  profitMargin: {
    type: Number,
    default: 0,
    description: "percentage: (price - costPrice) / price * 100"
  },
  foodCostPercent: {
    type: Number,
    default: 0,
    description: "costPrice / price * 100"
  },
  lastCostUpdate: Date
}
```

---

#### Day 2-3: Analytics Aggregation Service

**Tasks:**
```
[ ] Create backend/src/services/analyticsService.js with functions:
    
    - getTodayKPI()
      Returns: { revenue, orderCount, avgOrderValue, 
                 paymentMethods, topMenus, activeKitchen }
    
    - getTimePeriodKPI(from, to, period='daily'|'hourly')
      Returns: array of { date/hour, revenue, orders, ... }
    
    - getHourlyDistribution(date)
      Returns: busiest hours for staffing
    
    - getPaymentDistribution(from, to)
      Returns: % cash vs online orders
    
    - getMenuProfitAnalysis(from, to)
      Returns: top profit menus, low-margin items, trending
    
    - getPerformanceVsTarget(period)
      Returns: actual vs target KPI (needs target config)
```

**Sample Service Code:**
```javascript
// backend/src/services/analyticsService.js

async function getTodayKPI() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [orders, customers, activeKitchen] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrder: { $avg: '$totalAmount' },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          }
        }
      }
    ]),
    Order.aggregate([
      { $match: { channel: 'online', status: 'completed', 
                   createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$customerId' } },
      { $count: 'uniqueCustomers' }
    ]),
    Order.countDocuments({
      kitchenStatus: { $in: ['queued', 'preparing'] },
      status: { $ne: 'cancelled' }
    })
  ]);

  return {
    totalRevenue: orders[0]?.totalRevenue || 0,
    orderCount: orders[0]?.orderCount || 0,
    avgOrderValue: orders[0]?.avgOrder || 0,
    paidOrderCount: orders[0]?.paidOrders || 0,
    paymentSuccessRate: (orders[0]?.paidOrders / (orders[0]?.orderCount || 1) * 100).toFixed(2),
    uniqueCustomers: customers[0]?.uniqueCustomers || 0,
    activeKitchenOrders: activeKitchen
  };
}

async function getMenuProfitAnalysis(from, to) {
  const pipeline = [
    { $match: { status: 'completed', createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'menus',
        localField: 'items.menu',
        foreignField: '_id',
        as: 'menuData'
      }
    },
    { $unwind: '$menuData' },
    {
      $group: {
        _id: '$items.menu',
        menuName: { $first: '$menuData.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } },
        cost: { $sum: { $multiply: ['$items.quantity', '$menuData.costPrice'] } }
      }
    },
    {
      $addFields: {
        profit: { $subtract: ['$revenue', '$cost'] },
        profitMargin: {
          $multiply: [
            { $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] },
            100
          ]
        }
      }
    },
    { $sort: { profit: -1 } }
  ];

  return await Order.aggregate(pipeline);
}
```

---

#### Day 4: Create Analytics API Endpoints

**Tasks:**
```
[ ] Create analyticsController.js with handlers:
    
[ ] POST /api/analytics/kpi?period=today|week|month|custom&from=&to=
    
[ ] GET /api/analytics/hourly-distribution?date=YYYY-MM-DD
    
[ ] GET /api/analytics/payment-breakdown?from=&to=
    
[ ] GET /api/analytics/menu-profit?from=&to=&sort=profit|margin
    
[ ] GET /api/analytics/kitchen-efficiency?from=&to=
    
[ ] GET /api/analytics/customer-segment?from=&to=
    
[ ] Create validation with Joi for date ranges, limits
```

**Routes:**
```javascript
// backend/src/routes/analytics.js
const express = require('express');
const { verifyAdminJWT } = require('../middlewares/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// All routes require admin auth
router.use(verifyAdminJWT);

router.get('/kpi', analyticsController.getKPI);
router.get('/hourly-distribution', analyticsController.getHourlyDistribution);
router.get('/payment-breakdown', analyticsController.getPaymentBreakdown);
router.get('/menu-profit', analyticsController.getMenuProfit);
router.get('/kitchen-efficiency', analyticsController.getKitchenEfficiency);
router.get('/customer-segment', analyticsController.getCustomerSegment);

module.exports = router;
```

---

#### Day 5: Real-time KPI Dashboard Backend

**Tasks:**
```
[ ] Modify analyticsService to include:
    - vs Yesterday comparison
    - vs Week Average comparison
    - vs Month Average comparison
    - Trend indicators (↑ / ↓ / →)
    
[ ] Add caching (Redis optional, or in-memory with TTL):
    - Cache KPI for 5 minutes
    - Invalidate on order completion
    
[ ] Create /api/analytics/dashboard endpoint
    Returns complete dashboard data in one call:
    {
      kpi: { today, vs_yesterday, trend },
      topMenus: [...],
      hourlyDistribution: [...],
      paymentMethods: {...},
      topCustomers: [...],
      lowStockItems: [...],
      performance: { onTime%, avgPrepTime, ... }
    }
```

---

### Week 2: Advanced Analytics & Reporting

#### Day 6-7: Customer Behavior & Segmentation

**Tasks:**
```
[ ] Create customerAnalyticsService.js:
    
    - getCustomerSegmentation()
      Returns: bronze/silver/gold counts and metrics
    
    - getTopCustomers(limit, from, to)
      Returns: top N by spending with spend trend
    
    - getRepeatCustomerRate(from, to)
      Returns: % customers with repeat orders
    
    - getChurnRisk(daysInactive=30)
      Returns: customers inactive > N days
    
    - getCustomerLifetimeValue()
      Returns: avg CLV per tier
    
    - getCustomerPreferences(customerId)
      Returns: top ordered items, favorite times
    
    - getAcquisitionCost(period)
      Returns: CAC by calculating customer acquisition cost
    
[ ] Add /api/analytics/customers/* endpoints
    - GET /api/analytics/customers/top
    - GET /api/analytics/customers/segments
    - GET /api/analytics/customers/churn-risk
    - GET /api/analytics/customers/:id/lifetime-value
    - GET /api/analytics/customers/:id/preferences
```

---

#### Day 7-8: Kitchen & Operations Efficiency

**Tasks:**
```
[ ] Create operationsAnalyticsService.js:
    
    - getKitchenEfficiency(from, to, groupBy='daily')
      Returns: on-time %, avg prep time, by hour
    
    - getStaffPerformance(from, to, groupBy='staff')
      Returns: orders confirmed/completed per staff
    
    - getOrderCancellationRate(from, to)
      Returns: % cancelled, reason breakdown
    
    - getPaymentIssues(from, to)
      Returns: unpaid orders, pending, issues
    
    - getPeakHours(from, to)
      Returns: busiest hours for staffing decisions
    
    - getQueueAnalysis(from, to)
      Returns: avg queue wait time, peak queue size
    
[ ] Add /api/analytics/operations/* endpoints
    - GET /api/analytics/operations/kitchen-efficiency
    - GET /api/analytics/operations/staff-performance
    - GET /api/analytics/operations/peak-hours
    - GET /api/analytics/operations/queue-analysis
```

---

#### Day 9: Forecasting & Predictions (Simple)

**Tasks:**
```
[ ] Create forecastService.js with basic models:
    
    - getSimpleMovingAverage(metric='orders', days=7, periods=14)
      Returns: predicted next 7 days based on 14-day avg
    
    - getLinearTrend(metric, from, to, forecastDays=7)
      Returns: trend projection
    
    - getPeakHoursForecast(lastDays=30)
      Returns: likely peak hours for next week
    
    - getIngredientForecast(ingredientId, forecastDays=7)
      Returns: suggested quantity to reorder
    
[ ] NOT YET: ML models, Prophet, etc (can be Phase 3)
    Keep it simple, deterministic
    
[ ] Add /api/analytics/forecast/* endpoints
    - GET /api/analytics/forecast/orders?days=7
    - GET /api/analytics/forecast/revenue?days=7
    - GET /api/analytics/forecast/ingredients/:id?days=7
```

---

#### Day 10-11: Custom Reports & Export

**Tasks:**
```
[ ] Create reportService with template functions:
    
    - generateDailySalesReport(date)
    - generateWeeklySummary(week)
    - generateMonthlySummary(month)
    - generateMenuPerformance(from, to)
    - generateIngredientCostAnalysis(from, to)
    - generateCustomerReport(from, to)
    - generateStaffPerformance(from, to)
    
[ ] Create export formatters:
    - exportAsJSON(data)
    - exportAsCSV(data) → use papaparse
    - exportAsPDF(data, template) → use pdfkit
    - exportAsExcel(data) → use xlsx
    
[ ] Add /api/reports/* endpoints:
    - POST /api/reports/generate
      Body: { templateName, from, to, format }
      Returns: file stream or URL
    
    - GET /api/reports/templates → list available templates
    
    - POST /api/reports/schedule
      Body: { templateName, frequency: 'daily'|'weekly'|'monthly', 
              email, format }
      Returns: scheduleId (uses node-cron for auto-generation)
    
    - GET /api/reports/scheduled → list scheduled reports
    
    - DELETE /api/reports/scheduled/:id → cancel schedule
```

**Install Dependencies:**
```bash
npm install --save papaparse pdfkit xlsx node-cron
```

---

#### Day 12: Frontend - KPI Dashboard

**Tasks:**
```
[ ] Create DashboardAnalyticsPage.jsx with:
    - Real-time KPI cards (revenue, orders, avg value)
    - Comparison indicators (vs yesterday, trend)
    - Charts:
      * Revenue trend (line chart)
      * Orders by hour (bar chart)
      * Payment methods (pie chart)
      * Top menus (bar chart)
    - Filters: date range, period type
    - Auto-refresh (every 5 minutes or real-time socket)
    
[ ] Create components:
    - KPICard.jsx (displays metric with trend)
    - RevenueChart.jsx (recharts line)
    - OrderTrendChart.jsx (recharts bar)
    - PaymentMethodChart.jsx (recharts pie)
    - TopMenusTable.jsx
    - PeakHoursChart.jsx
```

**Sample Component:**
```jsx
// src/components/KPICard.jsx
export default function KPICard({ label, value, vs_yesterday, trend }) {
  const isPositive = trend > 0;
  
  return (
    <div className="kpi-card">
      <div className="label">{label}</div>
      <div className="value">Rp {value.toLocaleString('id-ID')}</div>
      <div className={`trend ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(trend)}% vs kemarin
      </div>
    </div>
  );
}
```

---

#### Day 13-14: Frontend - Analytics Pages

**Tasks:**
```
[ ] Create CustomerAnalyticsPage.jsx:
    - Customer segments pie chart
    - Top customers table
    - Repeat rate metric
    - Churn risk alerts
    - Lifetime value analysis
    
[ ] Create MenuAnalyticsPage.jsx:
    - Profitability matrix
    - Margin vs Revenue scatter
    - Top sellers list
    - Trending items
    - Low-margin warnings
    
[ ] Create OperationsAnalyticsPage.jsx:
    - Kitchen efficiency score
    - Avg prep time by hour
    - Staff performance ranking
    - Queue wait time analysis
    - On-time delivery %
    
[ ] Create ReportsPage.jsx:
    - List available report templates
    - Date range picker
    - Format selector (PDF, Excel, CSV)
    - Generate & download button
    - Scheduled reports list
    - Auto-email setup
    
[ ] Create ForecastPage.jsx (optional):
    - Next 7 days revenue forecast
    - Ingredient reorder suggestions
    - Peak hour predictions
    - Staffing recommendations
```

---

## 📦 Dependencies to Add

**Backend:**
```json
{
  "xlsx": "^0.18.5",           // Excel export
  "pdfkit": "^0.13.0",         // PDF generation
  "papaparse": "^5.4.1",       // CSV export
  "node-cron": "^3.0.2",       // Scheduled reports
  "recharts": "^2.10.3"        // Charts (share with frontend)
}
```

**Frontend (already in package.json likely):**
```json
{
  "recharts": "^2.10.3",       // Charting library
  "react-table": "^8.9.1",     // Advanced tables
  "date-fns": "^2.30.0",       // Date utilities
  "react-hook-form": "^7.46.0" // Form handling
}
```

---

## 🎨 Analytics Pages Structure

```
src/pages/
├─ AnalyticsDashboardPage.jsx      (main KPI dashboard)
├─ CustomerAnalyticsPage.jsx       (CRM insights)
├─ MenuAnalyticsPage.jsx           (profitability)
├─ OperationsAnalyticsPage.jsx     (efficiency)
├─ ReportsPage.jsx                 (custom reports)
└─ ForecastPage.jsx                (predictions)

src/components/
├─ analytics/
│  ├─ KPICard.jsx
│  ├─ RevenueChart.jsx
│  ├─ OrderTrendChart.jsx
│  ├─ PaymentMethodChart.jsx
│  ├─ ProfitabilityMatrix.jsx
│  ├─ CustomerSegmentChart.jsx
│  ├─ KitchenEfficiencyChart.jsx
│  ├─ PeakHoursChart.jsx
│  └─ ForecastChart.jsx
│
├─ forms/
│  ├─ DateRangeFilter.jsx
│  ├─ ReportGeneratorForm.jsx
│  └─ ScheduleReportForm.jsx
│
└─ tables/
   ├─ TopCustomersTable.jsx
   ├─ MenuProfitabilityTable.jsx
   ├─ StaffPerformanceTable.jsx
   └─ ScheduledReportsTable.jsx
```

---

## 📋 Analytics Data Model

**Key Calculations:**

```javascript
// Metrics definitions

// Financial
Revenue = sum(order.totalAmount where status='completed')
NetRevenue = Revenue - Discounts
COGS = sum(item.quantity * menu.costPrice)
GrossProfit = NetRevenue - COGS
GrossProfitMargin = (GrossProfit / NetRevenue) * 100
NetProfit = GrossProfit - OpEx (estimated)

// Orders
OrderCount = count(orders where status='completed')
AvgOrderValue = Revenue / OrderCount
PendingOrders = count(orders where status='pending')
CompletionRate = (Completed / Total) * 100

// Kitchen
AvgPrepTime = avg(order.completedAt - order.confirmedAt)
OnTimeDelivery% = (orders delivered <= ETA / total) * 100
QueueWaitTime = avg(order.confirmedAt - order.createdAt)

// Payment
PaidOrders% = (count where paymentStatus='paid' / total) * 100
UnpaidAmount = sum(totalAmount where paymentStatus='unpaid')

// Customer
RepeatRate% = (customers with >1 order / total) * 100
AvgCLV = avg(customer.totalSpent)
ChurnRate% = (customers inactive >30d / previous month) * 100

// Menu
MenuProfitMargin% = ((price - costPrice) / price) * 100
FoodCost% = (COGS / Revenue) * 100
```

---

## ⚠️ Performance Considerations

**Optimization tips:**

```javascript
// 1. Use aggregation pipeline for large datasets
// DON'T: fetch all orders, then process in JS
// DO: use $group, $match in MongoDB

// 2. Add indexes
db.orders.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ customerId: 1 })
db.orders.createIndex({ completedAt: 1 })

// 3. Cache expensive queries (5-10 min TTL)
// Use Redis or in-memory cache

// 4. Limit data ranges for large queries
// Enforce max 90 days if no range specified

// 5. Async background jobs
// Use Bull/BullMQ for report generation
```

---

## 📊 Dashboard Wireframe

```
┌─────────────────────────────────────────────┐
│  NASI GORENG POLONIA - ADMIN ANALYTICS      │
├─────────────────────────────────────────────┤
│
│  📊 TODAY'S PERFORMANCE
│  ┌──────────┬──────────┬──────────┬────────┐
│  │ Revenue  │ Orders   │ Avg Val  │ Paid % │
│  │ Rp 2.5M  │ 45       │ Rp 55K   │ 98%    │
│  │ ↑ 12%    │ ↑ 8%     │ ↓ 2%     │ ↑ 3%   │
│  └──────────┴──────────┴──────────┴────────┘
│
│  📈 REVENUE TREND (Last 7 days)
│  ┌──────────────────────────────────────────┐
│  │  Chart: Line graph of daily revenue       │
│  └──────────────────────────────────────────┘
│
│  🍜 TOP MENUS
│  ┌──────────────────────┬─────────┬────────┐
│  │ Menu Name            │ Qty     │ Profit │
│  ├──────────────────────┼─────────┼────────┤
│  │ Nasi Goreng Spesial  │ 24      │ 480K   │
│  │ Lumpia               │ 18      │ 270K   │
│  │ Es Jeruk             │ 45      │ 135K   │
│  └──────────────────────┴─────────┴────────┘
│
│  👥 TOP CUSTOMERS
│  ┌──────────────┬──────────┬──────────────┐
│  │ Customer     │ Spent    │ Orders       │
│  ├──────────────┼──────────┼──────────────┤
│  │ Budi (Gold)  │ Rp 1.2M  │ 28 ▸ Repeat │
│  │ Siti (Silver)│ Rp 680K  │ 15 ▸ Loyal  │
│  └──────────────┴──────────┴──────────────┘
│
│  ⚙️ OPERATIONS
│  └─ Kitchen Efficiency: 94% on-time
│  └─ Avg Prep Time: 12 min (target: 15)
│  └─ Active Orders: 3 in queue
│  └─ Unpaid: 2 orders
│
└─────────────────────────────────────────────┘
```

---

## ✅ Phase 2 Success Criteria

```
[ ] All KPI endpoints return < 500ms response time
[ ] Dashboard loads all data in < 2s
[ ] Charts display correctly with 100+ data points
[ ] Export to PDF/Excel works for all report types
[ ] Scheduled reports send on time
[ ] No memory leaks in analytics service
[ ] Customer segmentation accuracy > 95%
[ ] Forecasts within 10% accuracy for next 7 days
[ ] UI responsive on mobile (if needed)
[ ] Documentation complete for all endpoints
```

---

## 🔄 Integration with Phase 1

**Dependencies on Phase 1:**
- Staff tracking (confirmedBy, completedBy)
- Customer model (for CRM analytics)
- Ingredient costPrice (for menu profitability)
- Purchase orders (for cost tracking)
- Promo codes (for promotion ROI analysis)

**Must complete Phase 1 first** ✅

---

## 📚 Reference & Tools

**Visualization:** Recharts, Chart.js, Plotly.js  
**Export:** pdfkit, xlsx, papaparse  
**Scheduling:** node-cron, Bull/BullMQ  
**Forecasting:** ml.js, simple-statistics, (advanced: Prophet.js)  

---

**Status:** Ready for Development  
**Target Completion:** 2-3 weeks after Phase 1  
**Next:** Review Phase 1, then start Phase 2 in parallel
