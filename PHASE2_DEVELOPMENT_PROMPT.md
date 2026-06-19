# Phase 2 Development Prompt
## Advanced Analytics, Reporting & Intelligence Platform

**Prepared From:** Phase 1 Complete Infrastructure  
**Status:** Ready for Phase 2 Development  
**Document Version:** 1.0  
**Date:** 2026-06-18

---

## 🎯 Phase 2 Overview

Phase 2 builds on the solid Phase 1 infrastructure to deliver advanced analytics, business intelligence, and decision-making tools. Phase 1 established the operational backbone (staff, customers, suppliers, orders, POs); Phase 2 transforms raw data into actionable insights.

### Strategic Objectives
- Transform transactional data into business intelligence
- Enable data-driven decision making at all levels
- Identify trends, patterns, and optimization opportunities
- Provide real-time dashboards for operational visibility
- Support strategic planning with historical analysis

### Key Principle
**"All data collected in Phase 1 should become insight in Phase 2"**

---

## 📊 Phase 2 Feature Set

### 1. Dashboard & Analytics Platform
**Purpose:** Real-time operational visibility for all user roles

#### Executive Dashboard
- Revenue trends (daily/weekly/monthly/yearly)
- Top products by sales & profitability
- Top customers by spending
- Staff performance rankings
- Operational metrics (orders/day, avg order value, etc.)
- Key performance indicators (KPIs) with alerts
- Comparison to previous periods
- Forecast predictions

**Components to Build:**
- Dashboard controller & service
- Chart data aggregation endpoints
- KPI calculation engine
- Alert system for thresholds
- Export to PDF/Excel

**API Endpoints:**
```
GET /api/dashboard/executive
GET /api/dashboard/kpi
GET /api/dashboard/trends
GET /api/dashboard/comparisons
GET /api/dashboard/alerts
```

#### Manager Dashboard
- Team performance (individual staff metrics)
- Daily sales summary
- Pending orders & issues
- Inventory alerts
- Customer complaints
- Staff schedules
- Revenue by staff member

**API Endpoints:**
```
GET /api/dashboard/manager/team
GET /api/dashboard/manager/daily
GET /api/dashboard/manager/pending
GET /api/dashboard/manager/inventory-alerts
```

#### Staff Dashboard
- Personal shift performance
- Today's sales
- Team statistics
- Inventory levels
- Upcoming orders/schedule
- Personal KPIs

**API Endpoints:**
```
GET /api/dashboard/staff/personal
GET /api/dashboard/staff/today
GET /api/dashboard/staff/upcoming
```

---

### 2. Advanced Reporting System
**Purpose:** Flexible reporting for business analysis

#### Pre-built Reports
1. **Sales Report**
   - By date range, product, customer, staff, location
   - Filters: product category, customer tier, payment method
   - Metrics: units sold, revenue, discount, net profit
   - Grouping: daily, weekly, monthly, by category

2. **Menu Performance Report**
   - Best sellers (by units & revenue)
   - Worst performers
   - Profitability analysis
   - Margin analysis
   - Category comparison
   - Item recommendations for removal/addition

3. **Customer Report**
   - Customer lifetime value
   - Customer acquisition cost
   - Retention rate by cohort
   - Repeat purchase analysis
   - Average order value trends
   - Churn risk customers

4. **Staff Performance Report**
   - Orders confirmed/completed per staff
   - Order confirmation time
   - Order completion time
   - Accuracy metrics (returns, complaints)
   - Sales per staff member
   - Attendance tracking
   - Performance ranking

5. **Inventory Report**
   - Stock levels & trends
   - Stock movement (in/out/waste)
   - Supplier performance
   - Reorder points & alerts
   - Inventory value
   - Stockturn rate

6. **Financial Report**
   - Daily reconciliation summaries
   - Payment method breakdown
   - Discount tracking
   - Expense tracking
   - Profit & loss by period
   - Cash flow analysis

7. **Supplier Report**
   - On-time delivery rate
   - Price trends
   - Quality metrics
   - Lead time analysis
   - Cost comparison

**Report Builder Interface:**
- Select report type
- Choose date range
- Add filters
- Select grouping
- Choose output format (table, chart, PDF)
- Save favorite reports

**API Endpoints:**
```
GET /api/reports/sales
GET /api/reports/menu-performance
GET /api/reports/customer-analysis
GET /api/reports/staff-performance
GET /api/reports/inventory
GET /api/reports/financial
GET /api/reports/supplier
POST /api/reports/custom
GET /api/reports/saved
DELETE /api/reports/saved/:id
```

---

### 3. Menu Profitability Analysis
**Purpose:** Understand true profitability of each menu item

#### Features
- Cost calculation (ingredient cost + overhead)
- Margin analysis (gross & net)
- Contribution margin
- Price elasticity
- Sales volume vs profitability balance
- Recommendations for pricing
- Category profitability
- Seasonal trends in margins

**Model Enhancements:**
- Menu model: add `costOfGoodsPrice`, `overheadAllocation`
- Finance model: track overhead allocation methodology

**API Endpoints:**
```
GET /api/menu/:id/profitability
GET /api/analytics/profitability/all
GET /api/analytics/profitability/by-category
GET /api/analytics/profitability/trends
POST /api/menu/:id/profitability/update-cost
```

---

### 4. Predictive Analytics & Forecasting
**Purpose:** Predict future trends for better planning

#### Features
1. **Demand Forecasting**
   - Predict daily order volume
   - Predict by menu item
   - Seasonal adjustments
   - Special event factors
   - Accuracy metrics

2. **Revenue Forecasting**
   - Project monthly revenue
   - Forecast by customer segment
   - Forecast by product category
   - Confidence intervals

3. **Customer Behavior Prediction**
   - Predict customer churn (30/60/90 day window)
   - Predict next purchase date
   - Predict purchase value
   - Identify upsell opportunities
   - Identify cross-sell opportunities

4. **Inventory Prediction**
   - Predict stockout dates
   - Recommend reorder quantities
   - Forecast inventory value
   - Identify slow-moving items

**API Endpoints:**
```
GET /api/forecasting/demand
GET /api/forecasting/revenue
GET /api/forecasting/customer-churn
GET /api/forecasting/inventory
GET /api/forecasting/opportunities
```

---

### 5. Customer Intelligence & Insights
**Purpose:** Deep understanding of customer behavior

#### Customer Insights
1. **Customer Segmentation (Advanced)**
   - RFM analysis (Recency, Frequency, Monetary)
   - Behavioral segmentation
   - Value-based segmentation
   - Lifecycle stage (new, regular, at-risk, loyal, dormant)

2. **Customer Journey**
   - First purchase date
   - Purchase frequency timeline
   - Seasonal patterns
   - Favorite items history
   - Payment method preferences
   - Communication preferences

3. **Customer Loyalty Metrics**
   - Net Promoter Score (NPS) readiness
   - Customer satisfaction indicators
   - Repeat visit intervals
   - Average days between orders
   - Loyalty tier progression

4. **Customer Recommendations**
   - Best time to offer promotions
   - Personalized menu recommendations
   - Churn prevention recommendations
   - Upsell recommendations

**API Endpoints:**
```
GET /api/analytics/customer-intelligence/:customerId
GET /api/analytics/customer-segments
GET /api/analytics/rfm-analysis
GET /api/analytics/customer-journey/:customerId
GET /api/analytics/customer-recommendations/:customerId
POST /api/analytics/segment-customers
```

---

### 6. Promotion & Campaign Analytics
**Purpose:** Measure and optimize promotional effectiveness

#### Features
1. **Promotion Performance Tracking**
   - Redemption rate
   - Revenue uplift
   - Cost per customer acquired
   - ROI calculation
   - Conversion rate
   - Customer lifetime value of promo customers vs non-promo

2. **Campaign Management**
   - Create & schedule campaigns
   - Target specific customer segments
   - Track performance metrics
   - A/B testing support
   - Effectiveness scoring

3. **Discount Analysis**
   - Total discount spending
   - Discount per order trends
   - Discount effectiveness
   - Discount dependency (what % of sales need discount)
   - Recommendations for discount optimization

**API Endpoints:**
```
GET /api/analytics/promotion-performance/:promotionId
GET /api/analytics/campaign-performance
POST /api/campaigns/create
GET /api/campaigns
PATCH /api/campaigns/:id
GET /api/analytics/discount-analysis
```

---

### 7. Inventory & Supply Chain Intelligence
**Purpose:** Optimize inventory management

#### Features
1. **Inventory Analytics**
   - Stockturn rate by item
   - Inventory aging
   - Stock value tracking
   - Dead stock identification
   - Overstock identification

2. **Supplier Intelligence**
   - Supplier reliability scoring
   - On-time delivery rate
   - Quality consistency
   - Price trend analysis
   - Cost-benefit analysis
   - Lead time optimization
   - Supplier comparison

3. **Reorder Optimization**
   - Recommended reorder quantities
   - Optimal reorder points
   - Economic order quantity (EOQ)
   - Supplier lead time consideration
   - Demand variability factoring

4. **Waste Tracking**
   - Waste by item
   - Waste reasons
   - Waste cost analysis
   - Reduction recommendations
   - Trend analysis

**Models to Enhance:**
- StockMovement: add `wastageReason`, `wasteValue`
- Supplier: add `reliabilityScore`, `onTimeDeliveryRate`

**API Endpoints:**
```
GET /api/analytics/inventory/:ingredientId
GET /api/analytics/supplier-performance/:supplierId
GET /api/analytics/reorder-recommendations
GET /api/analytics/waste-analysis
GET /api/analytics/inventory-aging
```

---

### 8. Financial Intelligence
**Purpose:** Deep financial analysis for management

#### Features
1. **Profitability Analysis**
   - Gross margin by product
   - Net margin by product
   - Contribution margin analysis
   - Break-even analysis
   - Margin trends

2. **Cost Analysis**
   - Fixed vs variable costs
   - Cost per order
   - Cost by product category
   - Cost trends
   - Cost drivers

3. **Cash Flow Analysis**
   - Daily cash flow
   - Weekly cash flow
   - Monthly cash flow
   - Payment method impact
   - Cash flow forecasting

4. **Budget vs Actual**
   - Track actual vs budgeted revenue
   - Track actual vs budgeted costs
   - Variance analysis
   - Trend comparison
   - Forecast accuracy tracking

5. **Tax & Compliance Support**
   - Monthly tax-ready reports
   - Audit trail completeness
   - Transaction reconciliation
   - Export for accounting software

**Models to Create:**
- Budget model
- ExpenseCategory model
- TaxReport model

**API Endpoints:**
```
GET /api/analytics/profitability
GET /api/analytics/cost-analysis
GET /api/analytics/cash-flow
GET /api/analytics/budget-vs-actual
GET /api/analytics/tax-report/:month/:year
POST /api/budget/create
PATCH /api/budget/:id
```

---

### 9. Real-time Monitoring & Alerts
**Purpose:** Proactive alerts for operational issues

#### Alert Types
1. **Inventory Alerts**
   - Low stock warning
   - Overstock warning
   - Expiry date approaching
   - Dead stock alert

2. **Sales Alerts**
   - Unusual sales spike/drop
   - Slow-moving products
   - Customer complaints
   - Payment failures

3. **Operational Alerts**
   - High order wait time
   - Staff performance issues
   - Quality issues (returns)
   - System performance issues

4. **Financial Alerts**
   - Reconciliation discrepancy
   - Unusual cash variance
   - Bad debt risk
   - Budget variance

**Alert Management:**
- Alert configuration (thresholds, frequency)
- Alert channels (dashboard, email, SMS)
- Alert history
- Alert acknowledgment tracking

**API Endpoints:**
```
GET /api/alerts
POST /api/alerts/config
PATCH /api/alerts/:id/acknowledge
GET /api/alerts/history
```

---

### 10. Export & Integration
**Purpose:** Data accessibility and system integration

#### Export Features
1. **Report Export**
   - PDF with formatting
   - Excel with formulas
   - CSV for data import
   - JSON for API integration

2. **Scheduled Reports**
   - Generate & email daily reports
   - Generate & email weekly reports
   - Generate & email monthly reports
   - Custom schedule support

3. **Third-party Integration**
   - Accounting software (Jurnal, Kledo)
   - Tax software
   - Data warehouse
   - BI tools (Tableau, PowerBI readiness)

**API Endpoints:**
```
POST /api/reports/:id/export
GET /api/reports/:id/export/:format
POST /api/reports/schedule
GET /api/integrations/accounting
POST /api/integrations/sync
```

---

## 🏗️ Phase 2 Architecture

### New Services to Create
```
backend/src/services/
├── dashboardService.js           - Dashboard aggregations & KPI calculations
├── reportService.js              - Report generation & filtering
├── profitabilityService.js       - Profitability & margin calculations
├── forecastingService.js         - Predictions & forecasting
├── customerInsightService.js     - Customer behavior analysis
├── promotionAnalyticsService.js  - Campaign performance tracking
├── inventoryAnalyticsService.js  - Stock & supplier intelligence
├── financialAnalyticsService.js  - Financial analysis
├── alertService.js               - Alert generation & management
└── exportService.js              - Report export & integration
```

### New Controllers to Create
```
backend/src/controllers/
├── dashboardController.js        - Dashboard endpoints
├── reportController.js           - Report generation
├── analyticsController.js        - Analytics endpoints
├── alertController.js            - Alert management
├── exportController.js           - Export functionality
└── forecastingController.js      - Forecasting endpoints
```

### New Models to Create
```
backend/src/models/
├── Budget.js                     - Budget planning & tracking
├── Alert.js                      - Alert configuration & history
├── SavedReport.js                - User's favorite reports
├── Campaign.js                   - Marketing campaigns
├── Forecast.js                   - Forecasting data
└── FinancialSnapshot.js          - Period-end snapshots
```

### Frontend Pages to Create
```
frontend/src/pages/
├── DashboardPage.jsx             - Executive dashboard
├── ManagerDashboardPage.jsx      - Manager view
├── StaffDashboardPage.jsx        - Staff view
├── ReportsPage.jsx               - Report builder & library
├── AnalyticsPage.jsx             - Analytics explorer
├── ProfitabilityPage.jsx         - Menu profitability analysis
├── ForecastingPage.jsx           - Forecasting & predictions
├── CustomerIntelligencePage.jsx  - Customer insights
├── InventoryAnalyticsPage.jsx    - Inventory intelligence
├── FinancialAnalyticsPage.jsx    - Financial reports
├── CampaignsPage.jsx             - Campaign management
└── AlertsPage.jsx                - Alert management
```

---

## 🔧 Technical Requirements

### Backend Enhancements
1. **Data Aggregation**
   - Advanced MongoDB aggregation pipelines
   - Time-series data handling
   - Pivot table generation
   - Statistical calculations

2. **Caching Strategy**
   - Redis for frequently accessed data
   - Cache invalidation strategy
   - Cache warming for reports
   - Cache monitoring

3. **Job Scheduling**
   - Bull/BullMQ for background jobs
   - Daily report generation
   - Scheduled exports
   - Forecast recalculation
   - Data archiving

4. **Data Export**
   - PDF generation (PDFKit)
   - Excel generation (ExcelJS)
   - CSV generation
   - JSON formatting

### Frontend Enhancements
1. **Charting Library**
   - Recharts (already installed from Phase 1)
   - D3.js for advanced charts
   - Chart customization
   - Interactive drill-down

2. **Data Visualization**
   - Dashboard grids
   - Gauge charts for KPIs
   - Heatmaps for patterns
   - Geographic visualization (if multi-location)

3. **Table Components**
   - Advanced filtering
   - Sorting
   - Pagination
   - Column customization
   - Export to Excel/PDF

4. **Date/Time Handling**
   - Date range pickers
   - Time period selection
   - Timezone handling
   - Seasonal adjustments

### Performance Optimization
1. **Query Optimization**
   - Query result caching
   - Aggregation pipeline optimization
   - Index strategy for analytics
   - Materialized views consideration

2. **Frontend Optimization**
   - Lazy loading for reports
   - Virtual scrolling for large tables
   - Streaming large datasets
   - Progressive data loading

---

## 📋 Data Requirements

### Data to Aggregate (From Phase 1)
- **Orders**: By product, customer, staff, date, payment method
- **Customers**: Lifecycle, spending, frequency, segments
- **Staff**: Performance, sales, confirmation rates
- **Inventory**: Stock levels, movements, costs
- **Suppliers**: Lead time, cost, reliability
- **Promotions**: Usage, redemption, effectiveness
- **Reconciliation**: Daily totals, discrepancies, payment methods

### New Data to Capture (Phase 2)
- Customer satisfaction (if NPS survey added)
- Product costs & overhead allocation
- Budget targets
- Alert configurations
- Forecast data
- Campaign parameters

---

## 🎯 Phase 2 Success Criteria

### Functional Requirements
- [ ] 12 admin dashboard/analytics pages created
- [ ] 10 pre-built reports available
- [ ] Custom report builder functional
- [ ] Real-time alerts working
- [ ] Forecasting models trained & accurate
- [ ] Export functionality for all reports
- [ ] Campaign performance tracking working
- [ ] Customer intelligence data available

### Performance Requirements
- [ ] Dashboard loads in < 2 seconds
- [ ] Reports generate in < 5 seconds
- [ ] Forecasting accuracy > 80%
- [ ] No N+1 query problems
- [ ] Support 100k+ transactions

### User Experience
- [ ] Intuitive dashboard layouts
- [ ] One-click report generation
- [ ] Beautiful charts & visualizations
- [ ] Mobile-responsive dashboards
- [ ] Customizable alert thresholds

### Data Quality
- [ ] All Phase 1 data properly aggregated
- [ ] No data loss in calculations
- [ ] Reconciliation data validated
- [ ] Forecast accuracy tracked
- [ ] Anomalies detected & logged

---

## 📊 Scope & Priorities

### Priority 1 (Must Have)
- [ ] Executive dashboard with KPIs
- [ ] Sales report generator
- [ ] Menu profitability analysis
- [ ] Customer segmentation (RFM)
- [ ] Real-time alerts

### Priority 2 (Should Have)
- [ ] Manager & staff dashboards
- [ ] Advanced reporting suite (6 reports)
- [ ] Forecast system
- [ ] Campaign performance tracking
- [ ] Export to Excel/PDF

### Priority 3 (Nice to Have)
- [ ] Predictive analytics
- [ ] Advanced visualizations
- [ ] BI tool integration
- [ ] Mobile app dashboards
- [ ] Custom report builder

---

## 📈 Development Approach

### Phase 2A: Foundation (Week 1-2)
- Create Dashboard & Report services
- Build aggregation pipelines
- Create basic KPI endpoints
- Add caching layer
- Build dashboard UI components

### Phase 2B: Analytics (Week 3-4)
- Build analytics endpoints
- Create visualization components
- Implement filtering & drill-down
- Add export functionality
- Create saved report system

### Phase 2C: Intelligence (Week 5-6)
- Build forecasting models
- Implement customer intelligence
- Add promotional analytics
- Create financial analysis
- Build alert system

### Phase 2D: Polish & Testing (Week 7-8)
- Performance optimization
- User testing & feedback
- Documentation & training
- Bug fixes
- Production deployment

---

## 🔍 Testing Strategy

### Unit Tests
- Service calculations accuracy
- Data aggregation correctness
- Forecasting model tests
- Alert trigger tests

### Integration Tests
- End-to-end report generation
- Dashboard data flow
- Export functionality
- Cache invalidation

### Performance Tests
- Load testing on dashboards
- Report generation under load
- Alert processing performance
- Data export speed

### User Testing
- Usability testing with admins
- Dashboard clarity & usefulness
- Report builder intuitiveness
- Alert threshold appropriateness

---

## 📚 Documentation for Phase 2

### Technical Docs
- [ ] Phase 2 Architecture Guide
- [ ] Aggregation Pipeline Patterns
- [ ] Caching Strategy Document
- [ ] Forecasting Model Documentation
- [ ] API Reference (Phase 2 endpoints)

### User Docs
- [ ] Dashboard User Guide
- [ ] Report Builder Guide
- [ ] Analytics Interpretation Guide
- [ ] Alert Configuration Guide
- [ ] Best Practices Guide

### Developer Docs
- [ ] How to Add New KPI
- [ ] How to Add New Report
- [ ] How to Add New Alert Type
- [ ] How to Extend Forecasting
- [ ] Troubleshooting Guide

---

## 🚀 Expected Outcomes

### For Business
- ✅ Data-driven decision making
- ✅ Visibility into all operations
- ✅ Profitability optimization
- ✅ Customer intelligence
- ✅ Inventory optimization
- ✅ Staff performance management
- ✅ Competitive advantage
- ✅ Scalability for growth

### For Users
- ✅ Beautiful, intuitive dashboards
- ✅ Instant access to key metrics
- ✅ Flexible reporting
- ✅ Proactive alerts
- ✅ Data-backed recommendations
- ✅ Export capabilities
- ✅ Time-saving automation

### For Organization
- ✅ Revenue growth opportunities identified
- ✅ Cost optimization identified
- ✅ Risk factors identified early
- ✅ Better customer retention
- ✅ Improved operational efficiency
- ✅ Competitive positioning

---

## 💼 Deliverables Checklist

### Backend Deliverables
- [ ] 10 new services (2500+ lines of code)
- [ ] 5 new controllers (1500+ lines of code)
- [ ] 6 new models (500+ lines of code)
- [ ] 50+ new API endpoints
- [ ] 100+ test cases
- [ ] Caching implementation
- [ ] Job scheduling system
- [ ] Export functionality

### Frontend Deliverables
- [ ] 12 new React pages (4000+ lines of code)
- [ ] Chart & visualization components
- [ ] Report builder interface
- [ ] Dashboard grid system
- [ ] Alert management UI
- [ ] Export button integration
- [ ] Responsive design
- [ ] Dark mode support (optional)

### Documentation Deliverables
- [ ] Phase 2 API Reference
- [ ] User Guides (4 documents)
- [ ] Developer Guides (5 documents)
- [ ] Architecture documentation
- [ ] Troubleshooting guide

### Testing Deliverables
- [ ] Jest test suite (100+ cases)
- [ ] Integration tests
- [ ] Performance test results
- [ ] User testing feedback

---

## 🎓 Knowledge Building

### For Developers
- Advanced MongoDB aggregation pipelines
- Time-series data handling
- Caching strategies
- Forecasting algorithms
- Data visualization
- Performance optimization
- Charting libraries
- Real-time data processing

### For Business Users
- Data interpretation
- KPI understanding
- Report analysis
- Forecasting limitations
- Decision support using data
- Alert response procedures

---

## 📞 Dependencies & Prerequisites

### From Phase 1
- ✅ All Phase 1 models (Staff, Customer, Supplier, etc.)
- ✅ All Phase 1 data collection
- ✅ Authentication & RBAC system
- ✅ Audit logging
- ✅ Error handling patterns

### External Dependencies
- [ ] Charting library: Recharts (already in Phase 1)
- [ ] PDF generation: PDFKit
- [ ] Excel generation: ExcelJS
- [ ] Job queue: Bull/BullMQ
- [ ] Caching: Redis (optional but recommended)
- [ ] Time zone support: Luxon
- [ ] Statistical analysis: Simple-statistics (optional)

### Infrastructure
- [ ] Redis instance (optional, for caching)
- [ ] Additional database indexes
- [ ] Enough storage for reports archive

---

## 🎯 High-Level Phase 2 Goal

**Transform Nasi Goreng Polonia from a transaction recorder into a data-driven business intelligence platform that enables:**

1. **Visibility** - Executives see everything that's happening
2. **Understanding** - Managers understand why it's happening
3. **Prediction** - Leaders can predict what will happen
4. **Optimization** - Teams can optimize based on data
5. **Growth** - Organization can scale intelligently

---

## 📝 Final Notes

### Key Principles
- "If it's not measurable, it's not manageable"
- "Data-driven beats gut-driven"
- "Visualization beats numbers"
- "Real-time beats stale reports"
- "Alerts beat surprises"

### Remember
- Phase 1 built the foundation; Phase 2 builds the intelligence
- Start with what matters most to the business
- Validate forecasts against reality
- Keep dashboards simple and focused
- Over-complicated reports are unused reports

### Success Factors
- Clear KPI definitions
- User training & adoption
- Regular dashboard reviews
- Continuous refinement
- Executive sponsorship
- Data quality focus

---

## 🚀 Ready to Begin Phase 2

Phase 1 has delivered a rock-solid foundation. All the data is being collected, all the transactions are being tracked, and all the users are being managed.

**Phase 2 will transform this data into business intelligence and competitive advantage.**

**Let's build it!** 💪

---

**This prompt is ready for:**
- ✅ Developer team to start Phase 2 planning
- ✅ Project manager to create sprint schedule
- ✅ Product owner to refine requirements
- ✅ Business stakeholders to provide feedback
- ✅ Executive team to align on priorities

**Next Step:** Review this prompt with stakeholders and create Phase 2 detailed specification document.
