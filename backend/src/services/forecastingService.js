const Order = require('../models/Order');
const Forecast = require('../models/Forecast');

async function getDemandForecast(query = {}) {
  const { days = 30 } = query;
  const lookbackDays = parseInt(days) * 2; // Use 2x forecast period for training

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  const endDate = new Date();

  // Get historical daily order counts
  const historicalData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed', 'confirmed'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Simple moving average forecast
  const values = historicalData.map(d => d.orderCount);
  const windowSize = Math.min(7, values.length);
  const seedValues = values.length ? values : [0];

  // Generate forecast for next `days` days
  const forecast = [];
  const now = new Date();
  let lastValues = seedValues.slice(-(windowSize || 1));

  for (let i = 1; i <= parseInt(days); i++) {
    const avg = lastValues.reduce((s, v) => s + v, 0) / lastValues.length;
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + i);

    // Simple day-of-week adjustment
    const dayOfWeek = nextDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const adjustedValue = isWeekend ? avg * 1.2 : avg; // weekends tend to be busier
    const stdDev = Math.sqrt(lastValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / lastValues.length);

    forecast.push({
      date: nextDate,
      predictedValue: Math.round(adjustedValue * 100) / 100,
      lowerBound: Math.max(0, Math.round((adjustedValue - stdDev) * 100) / 100),
      upperBound: Math.round((adjustedValue + stdDev) * 100) / 100,
      confidenceScore: Math.round(Math.min(80, (lastValues.length / 30) * 80) * 100) / 100
    });

    lastValues.push(adjustedValue);
    if (lastValues.length > windowSize) lastValues.shift();
  }

  // Calculate actual accuracy on historical data
  const accuracy = calculateAccuracy(values);

  // Save or update forecast
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + parseInt(days));

  await Forecast.findOneAndUpdate(
    { type: 'demand', status: 'ready' },
    {
      type: 'demand',
      period: {
        startDate: now,
        endDate: periodEnd,
        granularity: 'daily'
      },
      data: forecast,
      metadata: {
        modelVersion: 'v1-sma',
        accuracy,
        trainingDataRange: { from: startDate, to: endDate },
        features: ['historical_orders', 'day_of_week'],
        notes: 'Simple Moving Average dengan day-of-week adjustment'
      },
      status: 'ready'
    },
    { upsert: true, new: true }
  );

  return {
    type: 'demand',
    period: { startDate: now, endDate: periodEnd },
    data: forecast,
    historicalData: historicalData.map(d => ({
      date: d._id,
      actualValue: d.orderCount,
      revenue: d.totalRevenue
    })),
    accuracy,
    modelVersion: 'v1-sma'
  };
}

async function getRevenueForecast(query = {}) {
  const { days = 30 } = query;
  const lookbackDays = parseInt(days) * 3;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  const endDate = new Date();

  // Get historical daily revenue
  const historicalData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed', 'confirmed'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const values = historicalData.map(d => d.revenue);
  const windowSize = Math.min(14, values.length);
  const seedValues = values.length ? values : [0];

  // Forecast
  const forecast = [];
  const now = new Date();
  let lastValues = seedValues.slice(-(windowSize || 1));

  for (let i = 1; i <= parseInt(days); i++) {
    const avg = lastValues.reduce((s, v) => s + v, 0) / lastValues.length;
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + i);

    const dayOfWeek = nextDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const adjustedValue = isWeekend ? avg * 1.15 : avg;

    forecast.push({
      date: nextDate,
      predictedValue: Math.round(adjustedValue * 100) / 100,
      lowerBound: Math.max(0, Math.round((adjustedValue * 0.8) * 100) / 100),
      upperBound: Math.round((adjustedValue * 1.2) * 100) / 100,
      confidenceScore: Math.round(Math.min(75, (lastValues.length / 30) * 75) * 100) / 100
    });

    lastValues.push(adjustedValue);
    if (lastValues.length > windowSize) lastValues.shift();
  }

  const totalForecastRevenue = forecast.reduce((s, d) => s + d.predictedValue, 0);
  const totalHistoricalRevenue = historicalData.reduce((s, d) => s + d.revenue, 0);

  return {
    type: 'revenue',
    period: { startDate: now, endDate: new Date(now.getTime() + parseInt(days) * 86400000) },
    forecast,
    historicalData: historicalData.map(d => ({
      date: d._id,
      actualValue: d.revenue,
      orders: d.orders
    })),
    summary: {
      totalForecastRevenue: Math.round(totalForecastRevenue * 100) / 100,
      totalHistoricalRevenue: Math.round(totalHistoricalRevenue * 100) / 100,
      averageDailyForecast: Math.round((totalForecastRevenue / parseInt(days)) * 100) / 100
    }
  };
}

async function getCustomerChurnPrediction() {
  const Customer = require('../models/Customer');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  const allCustomers = await Customer.find({ isActive: true, totalOrders: { $gt: 0 } })
    .select('_id name phone totalOrders totalSpent lastOrderDate createdAt')
    .lean();

  const atRisk = [];
  const churned = [];
  const active = [];

  for (const c of allCustomers) {
    const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate) : c.createdAt;
    const daysSinceLastOrder = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));

    // Customers who haven't ordered in 60+ days after being active
    if (daysSinceLastOrder > 90) {
      churned.push({
        customerId: c._id,
        name: c.name,
        phone: c.phone,
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        daysSinceLastOrder,
        churnProbability: Math.min(95, 50 + daysSinceLastOrder * 0.3)
      });
    } else if (daysSinceLastOrder > 30) {
      atRisk.push({
        customerId: c._id,
        name: c.name,
        phone: c.phone,
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        daysSinceLastOrder,
        churnProbability: Math.min(80, 20 + daysSinceLastOrder * 0.5)
      });
    } else {
      active.push(c._id);
    }
  }

  return {
    summary: {
      totalCustomers: allCustomers.length,
      active: active.length,
      atRisk: atRisk.length,
      churned: churned.length,
      churnRate: allCustomers.length > 0
        ? Math.round(((churned.length + atRisk.length) / allCustomers.length) * 100 * 100) / 100
        : 0
    },
    atRiskCustomers: atRisk.sort((a, b) => b.churnProbability - a.churnProbability).slice(0, 20),
    churnedCustomers: churned.sort((a, b) => b.churnProbability - a.churnProbability).slice(0, 20)
  };
}

async function getInventoryPrediction() {
  const Ingredient = require('../models/Ingredient');
  const StockMovement = require('../models/StockMovement');

  const ingredients = await Ingredient.find({ isActive: true })
    .select('name unit currentStock minimumStock')
    .lean();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const predictions = [];

  for (const ing of ingredients) {
    // Get usage rate over last 30 days
    const usageData = await StockMovement.aggregate([
      {
        $match: {
          ingredient: ing._id,
          reason: 'order',
          createdAt: { $gte: thirtyDaysAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalUsed: { $sum: { $abs: '$changeAmount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyUsage = usageData[0] ? usageData[0].totalUsed / 30 : 0;

    // Days until stockout
    const daysUntilStockout = dailyUsage > 0
      ? Math.floor(ing.currentStock / dailyUsage)
      : 999;

    // Reorder recommendation
    const leadTimeDays = 3; // Assuming 3 days lead time
    const reorderPoint = dailyUsage * leadTimeDays * 1.5; // 1.5x safety stock
    const needsReorder = ing.currentStock <= reorderPoint;

    predictions.push({
      ingredientId: ing._id,
      name: ing.name,
      unit: ing.unit,
      currentStock: ing.currentStock,
      minimumStock: ing.minimumStock,
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      daysUntilStockout,
      reorderPoint: Math.round(reorderPoint * 100) / 100,
      needsReorder,
      recommendedOrderQuantity: needsReorder
        ? Math.round(Math.max(reorderPoint * 2 - ing.currentStock, dailyUsage * 7) * 100) / 100
        : 0
    });
  }

  return {
    predictions: predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout),
    summary: {
      totalIngredients: ingredients.length,
      needsReorder: predictions.filter(p => p.needsReorder).length,
      totalReorderValue: predictions
        .filter(p => p.needsReorder)
        .reduce((s, p) => s + p.recommendedOrderQuantity, 0)
    }
  };
}

function calculateAccuracy(values) {
  if (values.length < 14) return 0;

  // Use last 7 days as test set
  const testSize = Math.min(7, Math.floor(values.length * 0.2));
  const trainValues = values.slice(0, -testSize);
  const testValues = values.slice(-testSize);

  if (trainValues.length < 7) return 0;

  // Simple prediction: average of last 7 training values
  const windowSize = Math.min(7, trainValues.length);
  const lastTrainValues = trainValues.slice(-windowSize);
  const prediction = lastTrainValues.reduce((s, v) => s + v, 0) / windowSize;

  // Mean Absolute Percentage Error (MAPE)
  let totalError = 0;
  for (const actual of testValues) {
    if (actual > 0) {
      totalError += Math.abs((actual - prediction) / actual);
    }
  }

  const mape = totalError / testValues.length;

  // Accuracy = 100% - MAPE (capped at 0%)
  return Math.round(Math.max(0, (1 - mape) * 100) * 100) / 100;
}

async function getUpsellOpportunities() {
  const Customer = require('../models/Customer');
  const customers = await Customer.find({ isActive: true, totalOrders: { $gt: 0 } })
    .sort({ totalSpent: -1 })
    .select('name phone totalOrders totalSpent tier lastOrderDate')
    .limit(50)
    .lean();

  const opportunities = [];

  for (const c of customers) {
    const avgOrderValue = c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0;
    const targetAOV = 50000; // Target average order value

    if (avgOrderValue < targetAOV) {
      opportunities.push({
        customerId: c._id,
        name: c.name,
        phone: c.phone,
        tier: c.tier,
        currentAOV: Math.round(avgOrderValue * 100) / 100,
        potentialUpsell: Math.round((targetAOV - avgOrderValue) * 100) / 100,
        recommendation: 'Rekomendasikan menu tambahan atau upgrade porsi'
      });
    }
  }

  return opportunities.sort((a, b) => b.potentialUpsell - a.potentialUpsell).slice(0, 20);
}

module.exports = {
  getDemandForecast,
  getRevenueForecast,
  getCustomerChurnPrediction,
  getInventoryPrediction,
  getUpsellOpportunities
};
