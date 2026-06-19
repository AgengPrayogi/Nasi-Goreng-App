const Ingredient = require('../models/Ingredient');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const Menu = require('../models/Menu');

function getDateRange(query = {}, defaultDays = 30) {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.setDate(now.getDate() - defaultDays + 1));
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

async function getInventoryOverview() {
  const ingredients = await Ingredient.find({ isActive: true }).lean();

  const totalValue = ingredients.reduce((s, i) => s + i.currentStock * (i.costPerUnit || 0), 0);
  const lowStock = ingredients.filter((i) => i.currentStock <= i.minimumStock);
  const overstock = ingredients.filter((i) => i.minimumStock > 0 && i.currentStock > i.minimumStock * 5);
  const deadStock = ingredients.filter((i) => i.currentStock > 0 && i.minimumStock === 0);

  return {
    totalItems: ingredients.length,
    totalInventoryValue: Math.round(totalValue),
    lowStockCount: lowStock.length,
    overstockCount: overstock.length,
    deadStockCount: deadStock.length,
    lowStock: lowStock.map((i) => ({
      ingredientId: i._id,
      name: i.name,
      currentStock: i.currentStock,
      minimumStock: i.minimumStock,
      unit: i.unit,
      value: Math.round(i.currentStock * (i.costPerUnit || 0))
    })),
    overstock: overstock.slice(0, 10).map((i) => ({
      ingredientId: i._id,
      name: i.name,
      currentStock: i.currentStock,
      minimumStock: i.minimumStock,
      unit: i.unit
    }))
  };
}

async function getIngredientAnalytics(ingredientId) {
  const ingredient = await Ingredient.findById(ingredientId).lean();
  if (!ingredient) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [movements, usageAgg] = await Promise.all([
    StockMovement.find({ ingredient: ingredientId, createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    StockMovement.aggregate([
      { $match: { ingredient: ingredient._id, createdAt: { $gte: thirtyDaysAgo }, reason: 'order' } },
      { $group: { _id: null, totalUsed: { $sum: { $abs: '$changeAmount' } } } }
    ])
  ]);

  const totalUsed = usageAgg[0]?.totalUsed || 0;
  const stockturnRate = ingredient.currentStock > 0
    ? Math.round((totalUsed / ingredient.currentStock) * 100) / 100
    : 0;

  const daysUntilStockout = totalUsed > 0
    ? Math.round((ingredient.currentStock / (totalUsed / 30)) * 10) / 10
    : null;

  return {
    ingredient,
    stockValue: Math.round(ingredient.currentStock * (ingredient.costPerUnit || 0)),
    stockturnRate,
    avgDailyUsage: Math.round((totalUsed / 30) * 100) / 100,
    daysUntilStockout,
    recentMovements: movements.map((m) => ({
      changeAmount: m.changeAmount,
      reason: m.reason,
      date: m.createdAt
    }))
  };
}

async function getSupplierPerformance(supplierId) {
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) return null;

  const pos = await PurchaseOrder.find({ supplierId }).sort({ orderDate: -1 }).limit(100).lean();

  const received = pos.filter((p) => p.status === 'received');
  const onTime = received.filter((p) => {
    if (!p.expectedDate || !p.receivedDate) return true;
    return new Date(p.receivedDate) <= new Date(p.expectedDate);
  });

  const totalSpent = pos.reduce((s, p) => s + (p.totalCost || 0), 0);
  const avgLeadTime = received.length
    ? Math.round(
        received.reduce((s, p) => {
          const days = (new Date(p.receivedDate) - new Date(p.orderDate)) / (1000 * 60 * 60 * 24);
          return s + days;
        }, 0) / received.length * 10
      ) / 10
    : supplier.leadTime;

  return {
    supplier,
    metrics: {
      totalOrders: pos.length,
      receivedOrders: received.length,
      cancelledOrders: pos.filter((p) => p.status === 'cancelled').length,
      onTimeDeliveryRate: received.length ? Math.round((onTime.length / received.length) * 10000) / 100 : 100,
      totalSpent,
      avgOrderValue: pos.length ? Math.round(totalSpent / pos.length) : 0,
      avgLeadTimeDays: avgLeadTime,
      reliabilityScore: calculateReliabilityScore(received.length, onTime.length, pos.filter((p) => p.status === 'cancelled').length)
    },
    recentOrders: pos.slice(0, 10).map((p) => ({
      poNumber: p.poNumber,
      status: p.status,
      totalCost: p.totalCost,
      orderDate: p.orderDate,
      expectedDate: p.expectedDate,
      receivedDate: p.receivedDate
    }))
  };
}

function calculateReliabilityScore(received, onTime, cancelled) {
  if (received === 0 && cancelled === 0) return 50;
  const onTimeRate = received > 0 ? onTime / received : 1;
  const cancelRate = (received + cancelled) > 0 ? cancelled / (received + cancelled) : 0;
  return Math.round((onTimeRate * 70 + (1 - cancelRate) * 30));
}

async function getReorderRecommendations() {
  const ingredients = await Ingredient.find({ isActive: true }).lean();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const usageByIngredient = await StockMovement.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, reason: 'order' } },
    { $group: { _id: '$ingredient', totalUsed: { $sum: { $abs: '$changeAmount' } } } }
  ]);
  const usageMap = new Map(usageByIngredient.map((u) => [u._id.toString(), u.totalUsed / 30]));

  const recommendations = [];

  for (const ing of ingredients) {
    const avgDaily = usageMap.get(ing._id.toString()) || 0;
    const daysOfStock = avgDaily > 0 ? ing.currentStock / avgDaily : 999;
    const reorderPoint = Math.max(ing.minimumStock, avgDaily * 7);
    const suggestedQty = Math.max(reorderPoint * 2 - ing.currentStock, ing.minimumStock);

    if (ing.currentStock <= reorderPoint || daysOfStock <= 7) {
      recommendations.push({
        ingredientId: ing._id,
        name: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        minimumStock: ing.minimumStock,
        avgDailyUsage: Math.round(avgDaily * 100) / 100,
        daysOfStockLeft: daysOfStock === 999 ? null : Math.round(daysOfStock * 10) / 10,
        suggestedReorderQty: Math.ceil(suggestedQty),
        urgency: ing.currentStock <= ing.minimumStock ? 'critical' : daysOfStock <= 3 ? 'high' : 'medium',
        estimatedCost: Math.round(suggestedQty * (ing.costPerUnit || 0))
      });
    }
  }

  recommendations.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  return recommendations;
}

async function getWasteAnalysis(query = {}) {
  const { from, to } = getDateRange(query);

  const wasteMovements = await StockMovement.find({
    reason: 'adjustment',
    changeAmount: { $lt: 0 },
    createdAt: { $gte: from, $lte: to }
  })
    .populate('ingredient', 'name unit costPerUnit')
    .sort({ createdAt: -1 })
    .lean();

  const byIngredient = {};
  let totalWasteValue = 0;

  for (const m of wasteMovements) {
    const id = m.ingredient?._id?.toString() || 'unknown';
    const wasteQty = Math.abs(m.changeAmount);
    const wasteValue = wasteQty * (m.ingredient?.costPerUnit || 0);
    totalWasteValue += wasteValue;

    if (!byIngredient[id]) {
      byIngredient[id] = {
        ingredientId: m.ingredient?._id,
        name: m.ingredient?.name || 'Unknown',
        unit: m.ingredient?.unit,
        totalWaste: 0,
        wasteValue: 0,
        incidents: 0
      };
    }
    byIngredient[id].totalWaste += wasteQty;
    byIngredient[id].wasteValue += wasteValue;
    byIngredient[id].incidents += 1;
  }

  const items = Object.values(byIngredient).sort((a, b) => b.wasteValue - a.wasteValue);

  return {
    range: { from, to },
    totalIncidents: wasteMovements.length,
    totalWasteValue: Math.round(totalWasteValue),
    items: items.map((i) => ({
      ...i,
      totalWaste: Math.round(i.totalWaste * 100) / 100,
      wasteValue: Math.round(i.wasteValue)
    })),
    recommendations: items.length > 0
      ? [{ type: 'action', message: `Fokus reduksi waste pada ${items[0].name} (Rp ${Math.round(items[0].wasteValue).toLocaleString('id-ID')})` }]
      : [{ type: 'positive', message: 'Tidak ada waste signifikan dalam periode ini.' }]
  };
}

async function getInventoryAging() {
  const ingredients = await Ingredient.find({ isActive: true, currentStock: { $gt: 0 } }).lean();

  const lastMovement = await StockMovement.aggregate([
    { $match: { reason: { $in: ['restock', 'adjustment'] }, changeAmount: { $gt: 0 } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$ingredient', lastRestock: { $first: '$createdAt' } } }
  ]);
  const restockMap = new Map(lastMovement.map((r) => [r._id.toString(), r.lastRestock]));

  const now = new Date();
  return ingredients.map((ing) => {
    const lastRestock = restockMap.get(ing._id.toString()) || ing.updatedAt;
    const ageDays = Math.floor((now - new Date(lastRestock)) / (1000 * 60 * 60 * 24));
    let agingCategory = 'fresh';
    if (ageDays > 30) agingCategory = 'aging';
    if (ageDays > 60) agingCategory = 'stale';
    if (ageDays > 90) agingCategory = 'dead';

    return {
      ingredientId: ing._id,
      name: ing.name,
      currentStock: ing.currentStock,
      unit: ing.unit,
      stockValue: Math.round(ing.currentStock * (ing.costPerUnit || 0)),
      lastRestock,
      ageDays,
      agingCategory
    };
  }).sort((a, b) => b.ageDays - a.ageDays);
}

async function getAllSupplierPerformance() {
  const suppliers = await Supplier.find({ isActive: true }).lean();
  const results = await Promise.all(suppliers.map((s) => getSupplierPerformance(s._id)));
  return results.filter(Boolean).sort((a, b) => b.metrics.reliabilityScore - a.metrics.reliabilityScore);
}

module.exports = {
  getInventoryOverview,
  getIngredientAnalytics,
  getSupplierPerformance,
  getReorderRecommendations,
  getWasteAnalysis,
  getInventoryAging,
  getAllSupplierPerformance
};
