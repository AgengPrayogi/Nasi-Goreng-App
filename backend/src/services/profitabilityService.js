const Order = require('../models/Order');
const Menu = require('../models/Menu');
const { calculateIngredientCost, applyMenuCostMetrics } = require('./menuService');

async function getMenuProfitability(menuId) {
  const menu = await Menu.findById(menuId).populate('ingredients.ingredient').lean();
  if (!menu) throw new Error('Menu not found');

  // Prefer the stored menu cost, then fall back to current ingredient cost.
  let ingredientCost = Number(menu.costPrice || 0);
  if (!ingredientCost && menu.ingredients?.length) {
    ingredientCost = await calculateIngredientCost(menu.ingredients);
  }
  const ingredientDetails = [];

  for (const item of menu.ingredients) {
    if (item.ingredient) {
      const cost = Number(item.quantity || 0) * Number(item.ingredient.costPerUnit || 0);
      ingredientDetails.push({
        ingredientId: item.ingredient._id,
        name: item.ingredient.name,
        quantity: item.quantity,
        unit: item.ingredient.unit,
        costPerUnit: item.ingredient.costPerUnit || 0,
        estimatedCost: Math.round(cost * 100) / 100
      });
    }
  }

  // Get sales data for this menu
  const salesData = await Order.aggregate([
    { $match: { status: { $in: ['completed', 'confirmed'] } } },
    { $unwind: '$items' },
    { $match: { 'items.menu': menu._id } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } }
      }
    }
  ]);

  const totalSales = salesData[0] || { totalQuantity: 0, totalRevenue: 0 };
  const avgSellingPrice = totalSales.totalQuantity > 0
    ? totalSales.totalRevenue / totalSales.totalQuantity
    : menu.price;

  const grossMargin = avgSellingPrice - ingredientCost;
  const grossMarginPercent = avgSellingPrice > 0
    ? Math.round((grossMargin / avgSellingPrice) * 100 * 100) / 100
    : 0;

  // Contribution margin (assuming 30% overhead for simplicity)
  const overheadAllocation = Number(menu.overheadAllocation || 0);
  const netMargin = menu.price - ingredientCost - overheadAllocation;
  const netMarginPercent = menu.price > 0
    ? Math.round((netMargin / menu.price) * 100 * 100) / 100
    : 0;

  return {
    menuId: menu._id,
    name: menu.name,
    currentPrice: menu.price,
    isAvailable: menu.isAvailable,
    ingredientCost: Math.round(ingredientCost * 100) / 100,
    ingredientDetails,
    avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    grossMarginPercent,
    overheadAllocation: Math.round(overheadAllocation * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100,
    netMarginPercent,
    totalSales: totalSales.totalQuantity,
    totalRevenue: totalSales.totalRevenue,
    recommendation: getPricingRecommendation(grossMarginPercent, totalSales.totalQuantity)
  };
}

function getPricingRecommendation(marginPercent, salesVolume) {
  if (marginPercent < 20) {
    return {
      action: 'increase_price',
      priority: 'high',
      message: `Margin hanya ${marginPercent}% — pertimbangkan menaikkan harga atau mengurangi biaya bahan baku`
    };
  }
  if (marginPercent >= 20 && marginPercent < 40) {
    if (salesVolume < 50) {
      return {
        action: 'promote',
        priority: 'medium',
        message: `Margin sehat (${marginPercent}%) tapi volume penjualan rendah — tingkatkan promosi`
      };
    }
    return {
      action: 'maintain',
      priority: 'low',
      message: `Margin dan volume penjualan baik — pertahankan strategi saat ini`
    };
  }
  return {
    action: 'maintain',
    priority: 'low',
    message: `Margin sangat baik (${marginPercent}%) — produk ini sangat menguntungkan`
  };
}

async function getAllProfitability() {
  const menus = await Menu.find({ isAvailable: true }).select('name price costPrice overheadAllocation').lean();
  const results = [];

  for (const menu of menus) {
    const profitability = await getMenuProfitability(menu._id);
    results.push(profitability);
  }

  // Sort by net margin descending
  results.sort((a, b) => b.netMarginPercent - a.netMarginPercent);

  return results;
}

async function getCategoryProfitability() {
  const allProfitability = await getAllProfitability();

  // Group by category (use name prefix as category proxy)
  // In production, you'd have actual category field on Menu model
  const categories = {};
  for (const item of allProfitability) {
    const category = item.name.split(' ')[0] || 'General';
    if (!categories[category]) {
      categories[category] = {
        category,
        items: [],
        totalRevenue: 0,
        totalCost: 0,
        totalNetMargin: 0
      };
    }
    categories[category].items.push(item.name);
    categories[category].totalRevenue += item.totalRevenue;
    categories[category].totalCost += item.ingredientCost * (item.totalSales || 0);
    categories[category].totalNetMargin += item.netMargin * (item.totalSales || 0);
  }

  const categoryArray = Object.values(categories);
  for (const cat of categoryArray) {
    cat.avgMargin = cat.totalRevenue > 0
      ? Math.round((cat.totalNetMargin / cat.totalRevenue) * 100 * 100) / 100
      : 0;
    cat.totalRevenue = Math.round(cat.totalRevenue * 100) / 100;
    cat.totalCost = Math.round(cat.totalCost * 100) / 100;
    cat.totalNetMargin = Math.round(cat.totalNetMargin * 100) / 100;
  }

  return categoryArray;
}

async function getProfitabilityTrends() {
  const menus = await Menu.find({ isAvailable: true }).select('_id name').lean();
  const trends = [];

  for (const menu of menus) {
    const monthlyData = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'confirmed'] } } },
      { $unwind: '$items' },
      { $match: { 'items.menu': menu._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    trends.push({
      menuId: menu._id,
      name: menu.name,
      monthlyData: monthlyData.map(m => ({
        year: m._id.year,
        month: m._id.month,
        quantity: m.totalQuantity,
        revenue: m.totalRevenue
      }))
    });
  }

  return trends;
}

async function updateMenuCost(menuId, { costOfGoodsPrice, costPrice, overheadAllocation }) {
  const menu = await Menu.findById(menuId);
  if (!menu) throw new Error('Menu not found');

  if (costOfGoodsPrice !== undefined) menu.costPrice = costOfGoodsPrice;
  if (costPrice !== undefined) menu.costPrice = costPrice;
  if (overheadAllocation !== undefined) menu.overheadAllocation = overheadAllocation;
  if (costOfGoodsPrice === undefined && costPrice === undefined) {
    menu.costPrice = await calculateIngredientCost(menu.ingredients);
  }
  applyMenuCostMetrics(menu);
  await menu.save();

  return {
    menuId,
    name: menu.name,
    price: menu.price,
    costPrice: menu.costPrice,
    overheadAllocation: menu.overheadAllocation,
    profitMargin: menu.profitMargin,
    foodCostPercent: menu.foodCostPercent,
    lastCostUpdate: menu.lastCostUpdate
  };
}

module.exports = {
  getMenuProfitability,
  getAllProfitability,
  getCategoryProfitability,
  getProfitabilityTrends,
  updateMenuCost
};
