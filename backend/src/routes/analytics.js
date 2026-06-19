const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate, requireAdmin);

// --- KPI Dashboard & Operational Analytics ---
router.get('/dashboard', analyticsController.dashboardHandler);
router.get('/kpi', analyticsController.kpiHandler);
router.get('/trends', analyticsController.trendsHandler);
router.get('/hourly-distribution', analyticsController.hourlyDistributionHandler);
router.get('/payment-breakdown', analyticsController.paymentBreakdownHandler);
router.get('/menu-cost', analyticsController.menuCostHandler);
router.get('/menu-profit', analyticsController.menuProfitHandler);
router.get('/kitchen-efficiency', analyticsController.kitchenEfficiencyHandler);
router.get('/customer-segment', analyticsController.customerSegmentHandler);
router.get('/operations/kitchen-efficiency', analyticsController.kitchenEfficiencyHandler);
router.get('/operations/staff-performance', analyticsController.staffPerformanceHandler);
router.get('/customers/segments', analyticsController.customerSegmentsHandler);

// --- Profitability ---
router.get('/profitability/all', analyticsController.allProfitabilityHandler);
router.get('/profitability/by-category', analyticsController.categoryProfitabilityHandler);
router.get('/profitability/trends', analyticsController.profitabilityTrendsHandler);
router.get('/profitability/:id', analyticsController.menuProfitabilityHandler);
router.post('/profitability/:id/update-cost', analyticsController.updateMenuCostHandler);

// --- Customer Intelligence ---
router.get('/customer-intelligence/:customerId', analyticsController.customerIntelligenceHandler);
router.get('/customer-segments', analyticsController.customerSegmentsHandler);
router.get('/rfm-analysis', analyticsController.rfmAnalysisHandler);
router.get('/customer-journey/:customerId', analyticsController.customerJourneyHandler);
router.get('/customer-recommendations/:customerId', analyticsController.customerRecommendationsHandler);
router.post('/segment-customers', analyticsController.segmentCustomersHandler);

// --- Forecasting ---
router.get('/forecasting/demand', analyticsController.demandForecastHandler);
router.get('/forecasting/revenue', analyticsController.revenueForecastHandler);
router.get('/forecasting/customer-churn', analyticsController.customerChurnHandler);
router.get('/forecasting/inventory', analyticsController.inventoryPredictionHandler);
router.get('/forecasting/opportunities', analyticsController.upsellOpportunitiesHandler);

// --- Promotion Analytics ---
router.get('/promotion-performance/:promotionId', analyticsController.promotionPerformanceHandler);
router.get('/campaign-performance', analyticsController.campaignPerformanceHandler);
router.get('/discount-analysis', analyticsController.discountAnalysisHandler);

// --- Inventory Intelligence ---
router.get('/inventory/overview', analyticsController.inventoryOverviewHandler);
router.get('/inventory/:ingredientId', analyticsController.ingredientAnalyticsHandler);
router.get('/supplier-performance', analyticsController.allSupplierPerformanceHandler);
router.get('/supplier-performance/:supplierId', analyticsController.supplierPerformanceHandler);
router.get('/reorder-recommendations', analyticsController.reorderRecommendationsHandler);
router.get('/waste-analysis', analyticsController.wasteAnalysisHandler);
router.get('/inventory-aging', analyticsController.inventoryAgingHandler);

// --- Financial Intelligence ---
router.get('/profitability-summary', analyticsController.profitabilitySummaryHandler);
router.get('/cost-analysis', analyticsController.costAnalysisHandler);
router.get('/cash-flow', analyticsController.cashFlowHandler);
router.get('/budget-vs-actual', analyticsController.budgetVsActualHandler);

module.exports = router;
