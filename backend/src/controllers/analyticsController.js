const profitabilityService = require('../services/profitabilityService');
const customerInsightService = require('../services/customerInsightService');
const forecastingService = require('../services/forecastingService');
const analyticsService = require('../services/analyticsService');
const promotionAnalyticsService = require('../services/promotionAnalyticsService');
const inventoryAnalyticsService = require('../services/inventoryAnalyticsService');
const financialAnalyticsService = require('../services/financialAnalyticsService');

// --- KPI & Operational BI ---
async function kpiHandler(req, res, next) {
  try {
    const data = await analyticsService.getKpi(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function dashboardHandler(req, res, next) {
  try {
    const data = await analyticsService.getBusinessDashboard(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function trendsHandler(req, res, next) {
  try {
    const data = await analyticsService.getTimePeriodKpi(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function hourlyDistributionHandler(req, res, next) {
  try {
    const data = await analyticsService.getHourlyDistribution(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function paymentBreakdownHandler(req, res, next) {
  try {
    const data = await analyticsService.getPaymentBreakdown(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function menuProfitHandler(req, res, next) {
  try {
    const data = await analyticsService.getMenuProfit(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function menuCostHandler(req, res, next) {
  try {
    const data = await analyticsService.getMenuCost();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function kitchenEfficiencyHandler(req, res, next) {
  try {
    const data = await analyticsService.getKitchenEfficiency(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerSegmentHandler(req, res, next) {
  try {
    const data = await analyticsService.getCustomerSegment(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function staffPerformanceHandler(req, res, next) {
  try {
    const data = await analyticsService.getStaffPerformance(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Profitability ---
async function menuProfitabilityHandler(req, res, next) {
  try {
    const data = await profitabilityService.getMenuProfitability(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function allProfitabilityHandler(req, res, next) {
  try {
    const data = await profitabilityService.getAllProfitability();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function categoryProfitabilityHandler(req, res, next) {
  try {
    const data = await profitabilityService.getCategoryProfitability();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function profitabilityTrendsHandler(req, res, next) {
  try {
    const data = await profitabilityService.getProfitabilityTrends();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateMenuCostHandler(req, res, next) {
  try {
    const data = await profitabilityService.updateMenuCost(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Customer Intelligence ---
async function customerIntelligenceHandler(req, res, next) {
  try {
    const data = await customerInsightService.getCustomerIntelligence(req.params.customerId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerSegmentsHandler(req, res, next) {
  try {
    const data = await customerInsightService.getCustomerSegments();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function rfmAnalysisHandler(req, res, next) {
  try {
    const data = await customerInsightService.getRfmAnalysis();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerJourneyHandler(req, res, next) {
  try {
    const data = await customerInsightService.getCustomerIntelligence(req.params.customerId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerRecommendationsHandler(req, res, next) {
  try {
    const data = await customerInsightService.getCustomerRecommendations(req.params.customerId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function segmentCustomersHandler(req, res, next) {
  try {
    const data = await customerInsightService.getRfmAnalysis();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Forecasting ---
async function demandForecastHandler(req, res, next) {
  try {
    const data = await forecastingService.getDemandForecast(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function revenueForecastHandler(req, res, next) {
  try {
    const data = await forecastingService.getRevenueForecast(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerChurnHandler(req, res, next) {
  try {
    const data = await forecastingService.getCustomerChurnPrediction();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function inventoryPredictionHandler(req, res, next) {
  try {
    const data = await forecastingService.getInventoryPrediction();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function upsellOpportunitiesHandler(req, res, next) {
  try {
    const data = await forecastingService.getUpsellOpportunities();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Promotion Analytics ---
async function promotionPerformanceHandler(req, res, next) {
  try {
    const data = await promotionAnalyticsService.getPromotionPerformance(req.params.promotionId);
    if (!data) return res.status(404).json({ success: false, message: 'Promotion not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function campaignPerformanceHandler(req, res, next) {
  try {
    const data = await promotionAnalyticsService.getCampaignPerformance();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function discountAnalysisHandler(req, res, next) {
  try {
    const data = await promotionAnalyticsService.getDiscountAnalysis(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Inventory Analytics ---
async function inventoryOverviewHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getInventoryOverview();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function ingredientAnalyticsHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getIngredientAnalytics(req.params.ingredientId);
    if (!data) return res.status(404).json({ success: false, message: 'Ingredient not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function supplierPerformanceHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getSupplierPerformance(req.params.supplierId);
    if (!data) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function reorderRecommendationsHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getReorderRecommendations();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function wasteAnalysisHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getWasteAnalysis(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function inventoryAgingHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getInventoryAging();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function allSupplierPerformanceHandler(req, res, next) {
  try {
    const data = await inventoryAnalyticsService.getAllSupplierPerformance();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// --- Financial Analytics ---
async function profitabilitySummaryHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.getProfitabilitySummary(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function costAnalysisHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.getCostAnalysis(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function cashFlowHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.getCashFlow(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function budgetVsActualHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.getBudgetVsActual(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  kpiHandler,
  dashboardHandler,
  trendsHandler,
  hourlyDistributionHandler,
  paymentBreakdownHandler,
  menuProfitHandler,
  menuCostHandler,
  kitchenEfficiencyHandler,
  customerSegmentHandler,
  staffPerformanceHandler,
  menuProfitabilityHandler,
  allProfitabilityHandler,
  categoryProfitabilityHandler,
  profitabilityTrendsHandler,
  updateMenuCostHandler,
  customerIntelligenceHandler,
  customerSegmentsHandler,
  rfmAnalysisHandler,
  customerJourneyHandler,
  customerRecommendationsHandler,
  segmentCustomersHandler,
  demandForecastHandler,
  revenueForecastHandler,
  customerChurnHandler,
  inventoryPredictionHandler,
  upsellOpportunitiesHandler,
  promotionPerformanceHandler,
  campaignPerformanceHandler,
  discountAnalysisHandler,
  inventoryOverviewHandler,
  ingredientAnalyticsHandler,
  supplierPerformanceHandler,
  reorderRecommendationsHandler,
  wasteAnalysisHandler,
  inventoryAgingHandler,
  allSupplierPerformanceHandler,
  profitabilitySummaryHandler,
  costAnalysisHandler,
  cashFlowHandler,
  budgetVsActualHandler
};
