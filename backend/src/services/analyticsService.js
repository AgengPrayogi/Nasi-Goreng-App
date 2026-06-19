const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Ingredient = require('../models/Ingredient');
const Menu = require('../models/Menu');
const Staff = require('../models/Staff');

const COMPLETED_STATUSES = ['completed'];
const REVENUE_STATUSES = ['completed', 'confirmed'];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getDateRange(query = {}, defaultDays = 30) {
  const now = new Date();
  const fallbackFrom = new Date(now);
  fallbackFrom.setDate(fallbackFrom.getDate() - defaultDays + 1);
  return {
    from: startOfDay(parseDate(query.from, fallbackFrom)),
    to: endOfDay(parseDate(query.to, now))
  };
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

async function getKpi(query = {}) {
  const period = query.period || 'today';
  let range;

  if (period === 'today') {
    range = { from: startOfDay(), to: endOfDay() };
  } else if (period === 'week') {
    range = getDateRange({}, 7);
  } else if (period === 'month') {
    range = getDateRange({}, 30);
  } else {
    range = getDateRange(query, 30);
  }

  const [orderAgg, uniqueCustomers, activeKitchen] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUSES] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0] } },
          discounts: { $sum: '$discountAmount' }
        }
      }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: range.from, $lte: range.to }, customerId: { $ne: null } } },
      { $group: { _id: '$customerId' } },
      { $count: 'count' }
    ]),
    Order.countDocuments({
      kitchenStatus: { $in: ['queued', 'preparing'] },
      status: { $ne: 'cancelled' }
    })
  ]);

  const row = orderAgg[0] || {
    orderCount: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    paidOrders: 0,
    revenue: 0,
    discounts: 0
  };

  return {
    period,
    range,
    revenue: row.revenue,
    netRevenue: Math.max(0, row.revenue - row.discounts),
    orderCount: row.orderCount,
    completedOrders: row.completedOrders,
    cancelledOrders: row.cancelledOrders,
    avgOrderValue: row.completedOrders ? Math.round((row.revenue / row.completedOrders) * 100) / 100 : 0,
    paymentSuccessRate: pct(row.paidOrders, row.orderCount),
    completionRate: pct(row.completedOrders, row.orderCount),
    cancellationRate: pct(row.cancelledOrders, row.orderCount),
    uniqueCustomers: uniqueCustomers[0]?.count || 0,
    activeKitchenOrders: activeKitchen
  };
}

async function getTimePeriodKpi(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const period = query.period === 'hourly' ? 'hourly' : 'daily';

  const group = period === 'hourly'
    ? {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        hour: { $hour: '$createdAt' }
      }
    : { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } };

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: group,
        revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0] } },
        orders: { $sum: 1 },
        completed: { $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUSES] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
      }
    },
    { $sort: period === 'hourly' ? { '_id.date': 1, '_id.hour': 1 } : { '_id.date': 1 } }
  ]);

  return {
    period,
    range: { from, to },
    data: rows.map((row) => ({
      date: row._id.date,
      hour: row._id.hour,
      revenue: row.revenue,
      orders: row.orders,
      completed: row.completed,
      cancelled: row.cancelled,
      completionRate: pct(row.completed, row.orders)
    }))
  };
}

async function getHourlyDistribution(query = {}) {
  const date = query.date ? new Date(query.date) : new Date();
  const from = startOfDay(date);
  const to = endOfDay(date);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const data = Array.from({ length: 24 }, (_, hour) => {
    const row = rows.find((item) => item._id === hour);
    return { hour, orders: row?.orders || 0, revenue: row?.revenue || 0 };
  });

  return {
    date: from.toISOString().slice(0, 10),
    data,
    peakHours: data
      .filter((row) => row.orders > 0)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 3)
  };
}

async function getPaymentBreakdown(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { method: '$paymentMethod', status: '$paymentStatus' },
        count: { $sum: 1 },
        amount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  return {
    range: { from, to },
    data: rows.map((row) => ({
      method: row._id.method || 'unset',
      status: row._id.status || 'unknown',
      count: row.count,
      amount: row.amount,
      percentage: pct(row.count, totalCount)
    }))
  };
}

async function getMenuProfit(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const sortField = query.sort === 'margin' ? 'marginPercent' : 'profit';

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REVENUE_STATUSES } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'menus',
        localField: 'items.menu',
        foreignField: '_id',
        as: 'menu'
      }
    },
    { $unwind: { path: '$menu', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$items.menu',
        name: { $first: '$menu.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } },
        cost: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$menu.costPrice', 0] }] } }
      }
    },
    {
      $addFields: {
        profit: { $subtract: ['$revenue', '$cost'] },
        marginPercent: {
          $cond: [
            { $gt: ['$revenue', 0] },
            { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] }, 100] },
            0
          ]
        },
        foodCostPercent: {
          $cond: [
            { $gt: ['$revenue', 0] },
            { $multiply: [{ $divide: ['$cost', '$revenue'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { [sortField]: -1 } }
  ]);

  return {
    range: { from, to },
    data: rows.map((row) => ({
      menuId: row._id,
      name: row.name || 'Unknown Menu',
      quantity: row.quantity,
      revenue: Math.round(row.revenue * 100) / 100,
      cost: Math.round(row.cost * 100) / 100,
      profit: Math.round(row.profit * 100) / 100,
      marginPercent: Math.round(row.marginPercent * 100) / 100,
      foodCostPercent: Math.round(row.foodCostPercent * 100) / 100,
      recommendation: row.marginPercent < 25 ? 'review_price_or_recipe' : row.quantity < 5 ? 'promote_menu' : 'maintain'
    }))
  };
}

async function getKitchenEfficiency(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REVENUE_STATUSES } } },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        hour: { $hour: '$createdAt' },
        waitMinutes: {
          $cond: [
            { $and: ['$readyAt', '$createdAt'] },
            { $divide: [{ $subtract: ['$readyAt', '$createdAt'] }, 60000] },
            null
          ]
        },
        onTime: {
          $cond: [
            { $and: ['$readyAt', '$estimatedReadyAt'] },
            { $lte: ['$readyAt', '$estimatedReadyAt'] },
            null
          ]
        }
      }
    },
    {
      $group: {
        _id: '$date',
        orders: { $sum: 1 },
        measuredOrders: { $sum: { $cond: [{ $ne: ['$waitMinutes', null] }, 1, 0] } },
        avgWaitMinutes: { $avg: '$waitMinutes' },
        onTimeCount: { $sum: { $cond: [{ $eq: ['$onTime', true] }, 1, 0] } },
        etaMeasured: { $sum: { $cond: [{ $ne: ['$onTime', null] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const totalOrders = rows.reduce((sum, row) => sum + row.orders, 0);
  const etaMeasured = rows.reduce((sum, row) => sum + row.etaMeasured, 0);
  const onTimeCount = rows.reduce((sum, row) => sum + row.onTimeCount, 0);
  const measuredWaits = rows.filter((row) => row.avgWaitMinutes !== null && row.avgWaitMinutes !== undefined);
  const avgPrepTime = measuredWaits.length
    ? measuredWaits.reduce((sum, row) => sum + row.avgWaitMinutes, 0) / measuredWaits.length
    : 0;

  return {
    range: { from, to },
    summary: {
      totalOrders,
      avgPrepTimeMinutes: Math.round(avgPrepTime * 100) / 100,
      onTimeRate: pct(onTimeCount, etaMeasured),
      measuredEtaOrders: etaMeasured
    },
    daily: rows.map((row) => ({
      date: row._id,
      orders: row.orders,
      measuredOrders: row.measuredOrders,
      avgWaitMinutes: Math.round((row.avgWaitMinutes || 0) * 100) / 100,
      onTimeRate: pct(row.onTimeCount, row.etaMeasured)
    }))
  };
}

async function getCustomerSegment(query = {}) {
  const { from, to } = getDateRange(query, 90);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, customerId: { $ne: null }, status: { $in: REVENUE_STATUSES } } },
    {
      $group: {
        _id: '$customerId',
        orders: { $sum: 1 },
        spent: { $sum: '$totalAmount' },
        lastOrderDate: { $max: '$createdAt' }
      }
    },
    {
      $bucket: {
        groupBy: '$spent',
        boundaries: [0, 100000, 250000, 500000, 1000000, 999999999],
        default: 'unknown',
        output: {
          customers: { $sum: 1 },
          avgOrders: { $avg: '$orders' },
          avgSpent: { $avg: '$spent' },
          totalSpent: { $sum: '$spent' }
        }
      }
    }
  ]);

  const labels = {
    0: 'low_value',
    100000: 'bronze',
    250000: 'silver',
    500000: 'gold',
    1000000: 'vip'
  };

  return {
    range: { from, to },
    data: rows.map((row) => ({
      segment: labels[row._id] || row._id,
      customers: row.customers,
      avgOrders: Math.round((row.avgOrders || 0) * 100) / 100,
      avgSpent: Math.round((row.avgSpent || 0) * 100) / 100,
      totalSpent: Math.round((row.totalSpent || 0) * 100) / 100
    }))
  };
}

async function getStaffPerformance(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, completedBy: { $ne: null } } },
    {
      $group: {
        _id: '$completedBy',
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } }
      }
    },
    { $sort: { completedOrders: -1 } }
  ]);

  const staffIds = rows.map((row) => row._id);
  const staff = await Staff.find({ _id: { $in: staffIds } }).select('name role').lean();
  const staffMap = new Map(staff.map((item) => [item._id.toString(), item]));

  return {
    range: { from, to },
    data: rows.map((row) => ({
      staffId: row._id,
      name: staffMap.get(row._id.toString())?.name || 'Unknown',
      role: staffMap.get(row._id.toString())?.role || 'staff',
      completedOrders: row.completedOrders,
      revenue: row.revenue
    }))
  };
}

async function getBusinessDashboard(query = {}) {
  const [kpi, trends, hourlyDistribution, paymentBreakdown, menuProfit, kitchenEfficiency, customerSegment, lowStock] =
    await Promise.all([
      getKpi({ period: 'today' }),
      getTimePeriodKpi({ period: 'daily', from: query.from, to: query.to }),
      getHourlyDistribution(query),
      getPaymentBreakdown(query),
      getMenuProfit({ ...query, sort: 'profit' }),
      getKitchenEfficiency(query),
      getCustomerSegment(query),
      Ingredient.find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minimumStock'] }
      }).select('name unit currentStock minimumStock costPerUnit').sort({ currentStock: 1 }).limit(10).lean()
    ]);

  return {
    kpi,
    trends,
    hourlyDistribution,
    paymentBreakdown,
    topMenus: menuProfit.data.slice(0, 10),
    kitchenEfficiency,
    customerSegment,
    lowStock
  };
}

async function getMenuCost() {
  const menus = await Menu.find({ isAvailable: true })
    .select('name price costPrice overheadAllocation profitMargin foodCostPercent ingredients')
    .populate('ingredients.ingredient', 'name unit costPerUnit')
    .sort({ name: 1 })
    .lean();

  return menus.map((menu) => ({
    menuId: menu._id,
    name: menu.name,
    price: menu.price,
    costPrice: menu.costPrice || 0,
    overheadAllocation: menu.overheadAllocation || 0,
    profitMargin: menu.profitMargin || 0,
    foodCostPercent: menu.foodCostPercent || 0,
    ingredientCosts: (menu.ingredients || []).map((item) => ({
      ingredientId: item.ingredient?._id,
      name: item.ingredient?.name || 'Unknown',
      quantity: item.quantity,
      unit: item.ingredient?.unit,
      costPerUnit: item.ingredient?.costPerUnit || 0,
      lineCost: Math.round((item.quantity * (item.ingredient?.costPerUnit || 0)) * 100) / 100
    }))
  }));
}

module.exports = {
  getKpi,
  getTimePeriodKpi,
  getHourlyDistribution,
  getPaymentBreakdown,
  getMenuProfit,
  getKitchenEfficiency,
  getCustomerSegment,
  getStaffPerformance,
  getBusinessDashboard,
  getMenuCost
};
