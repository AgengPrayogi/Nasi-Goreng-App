const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Ingredient = require('../models/Ingredient');
const Staff = require('../models/Staff');
const Menu = require('../models/Menu');
const { Alert } = require('../models/Alert');

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const periodStart = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function getDashboardSummary() {
  const start = todayStart();
  const end = todayEnd();

  // --- Order summary hari ini ---
  const todayOrders = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  const orderStats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
  };

  todayOrders.forEach((row) => {
    orderStats.total += row.count;
    orderStats[row._id] = row.count;
    orderStats.totalRevenue += (row._id === 'completed' || row._id === 'confirmed') ? row.total : 0;
  });

  // --- Active kitchen orders ---
  const activeKitchen = await Order.countDocuments({
    kitchenStatus: { $in: ['queued', 'preparing'] },
    status: { $ne: 'cancelled' }
  });

  // --- Low stock ingredients ---
  const lowStock = await Ingredient.find({
    isActive: true,
    $expr: { $lte: ['$currentStock', '$minimumStock'] }
  }).select('name unit currentStock minimumStock').limit(10);

  // --- Recent orders (last 10) ---
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderCode customerName totalAmount status kitchenStatus paymentStatus createdAt')
    .lean();

  return {
    orderStats,
    activeKitchen,
    lowStock,
    recentOrders,
  };
}

async function getExecutiveDashboard() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();
  const lastWeekStart = periodStart(7);
  const lastMonthStart = periodStart(30);

  // Today's metrics
  const todayAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalRevenue: { $sum: { $cond: [{ $in: ['$status', ['completed', 'confirmed']] }, '$totalAmount', 0] } },
        totalDiscount: { $sum: '$discountAmount' }
      }
    }
  ]);

  const today = todayAgg[0] || { totalOrders: 0, completedOrders: 0, totalRevenue: 0, totalDiscount: 0 };
  const avgOrderValue = today.completedOrders > 0 ? today.totalRevenue / today.completedOrders : 0;

  // Last 7 days revenue trend
  const weeklyTrend = await Order.aggregate([
    { $match: { createdAt: { $gte: lastWeekStart, $lte: todayEndDate }, status: { $in: ['completed', 'confirmed'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } }
  ]);

  // Top products by revenue
  const topProducts = await Order.aggregate([
    { $match: { createdAt: { $gte: lastMonthStart, $lte: todayEndDate }, status: { $in: ['completed', 'confirmed'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menu',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ]);

  // Populate menu names
  const menuIds = topProducts.map(p => p._id);
  const menus = await Menu.find({ _id: { $in: menuIds } }).select('name').lean();
  const menuMap = new Map(menus.map(m => [m._id.toString(), m.name]));
  const topProductsWithNames = topProducts.map(p => ({
    menuId: p._id,
    name: menuMap.get(p._id.toString()) || 'Unknown',
    totalQuantity: p.totalQuantity,
    totalRevenue: p.totalRevenue
  }));

  // Top customers
  const topCustomers = await Customer.find({ isActive: true })
    .sort({ totalSpent: -1 })
    .limit(5)
    .select('name phone totalOrders totalSpent lastOrderDate tier')
    .lean();

  // Staff performance (orders completed today)
  const staffPerformance = await Order.aggregate([
    { $match: { completedBy: { $ne: null }, status: 'completed', createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: '$completedBy',
        ordersCompleted: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { ordersCompleted: -1 } }
  ]);

  const staffIds = staffPerformance.map(s => s._id);
  const staffs = await Staff.find({ _id: { $in: staffIds } }).select('name').lean();
  const staffMap = new Map(staffs.map(s => [s._id.toString(), s.name]));
  const staffPerformanceWithNames = staffPerformance.map(s => ({
    staffId: s._id,
    name: staffMap.get(s._id.toString()) || 'Unknown',
    ordersCompleted: s.ordersCompleted,
    totalRevenue: s.totalRevenue
  }));

  // Recent alerts
  const recentAlerts = await Alert.find({ resolved: false })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('type severity title message createdAt acknowledged')
    .lean();

  return {
    today: {
      totalOrders: today.totalOrders,
      completedOrders: today.completedOrders,
      totalRevenue: today.totalRevenue,
      totalDiscount: today.totalDiscount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100
    },
    trends: {
      weeklyRevenue: weeklyTrend,
      currentWeekTotal: weeklyTrend.reduce((sum, d) => sum + d.revenue, 0),
      previousWeekTotal: 0 // Will be calculated in comparisons
    },
    topProducts: topProductsWithNames,
    topCustomers,
    staffPerformance: staffPerformanceWithNames,
    recentAlerts
  };
}

async function getKpiDashboard() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();
  const lastWeekStart = periodStart(7);
  const lastMonthStart = periodStart(30);

  // Today's orders stats
  const todayOrdersStats = await Order.aggregate([
    { $match: { createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: { $cond: [{ $in: ['$status', ['completed', 'confirmed']] }, '$totalAmount', 0] } },
        totalDiscount: { $sum: '$discountAmount' }
      }
    }
  ]);

  const todayStats = todayOrdersStats[0] || { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0, totalDiscount: 0 };

  // Monthly revenue
  const monthRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: lastMonthStart, $lte: todayEndDate }, status: { $in: ['completed', 'confirmed'] } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    }
  ]);
  const monthStats = monthRevenue[0] || { revenue: 0, orders: 0 };

  // Average order value
  const avgOrderValue = todayStats.completed > 0 ? todayStats.totalRevenue / todayStats.completed : 0;

  // Customer KPIs
  const totalCustomers = await Customer.countDocuments({ isActive: true });
  const newCustomersToday = await Customer.countDocuments({ createdAt: { $gte: todayStartDate, $lte: todayEndDate } });
  const newCustomersMonth = await Customer.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: todayEndDate } });

  // Inventory KPIs
  const totalIngredients = await Ingredient.countDocuments({ isActive: true });
  const lowStockCount = await Ingredient.countDocuments({
    isActive: true,
    $expr: { $lte: ['$currentStock', '$minimumStock'] }
  });

  // Kitchen KPIs
  const activeKitchen = await Order.countDocuments({
    kitchenStatus: { $in: ['queued', 'preparing'] },
    status: { $ne: 'cancelled' }
  });

  // Conversion rate (completed / total)
  const conversionRate = todayStats.total > 0 ? Math.round((todayStats.completed / todayStats.total) * 100) : 0;

  return {
    orders: {
      today: todayStats.total,
      pending: todayStats.pending,
      confirmed: todayStats.confirmed,
      completed: todayStats.completed,
      cancelled: todayStats.cancelled,
      conversionRate
    },
    revenue: {
      today: todayStats.totalRevenue,
      month: monthStats.revenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalDiscount: todayStats.totalDiscount
    },
    customers: {
      total: totalCustomers,
      newToday: newCustomersToday,
      newThisMonth: newCustomersMonth
    },
    kitchen: {
      activeOrders: activeKitchen
    },
    inventory: {
      totalIngredients,
      lowStock: lowStockCount,
      stockHealthPercent: totalIngredients > 0 ? Math.round(((totalIngredients - lowStockCount) / totalIngredients) * 100) : 100
    },
    period: {
      today: todayStartDate,
      monthStart: lastMonthStart
    }
  };
}

async function getTrends(query) {
  const { period = '7d' } = query;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : period === '12m' ? 365 : 7;
  const startDate = periodStart(days);
  const endDate = todayEnd();

  // Daily revenue trend
  const revenueTrend = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $in: ['completed', 'confirmed'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        discounts: { $sum: '$discountAmount' }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1, discounts: 1 } }
  ]);

  // Order status distribution
  const statusDistribution = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Payment method distribution
  const paymentDistribution = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentMethod: { $ne: null } } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
  ]);

  // Hourly order distribution (today)
  const hourlyTrend = await Order.aggregate([
    { $match: { createdAt: { $gte: todayStart(), $lte: todayEnd() } } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', ['completed', 'confirmed']] }, '$totalAmount', 0] } }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, hour: '$_id', orders: 1, revenue: 1 } }
  ]);

  return {
    period: { days, from: startDate, to: endDate },
    revenue: revenueTrend,
    statusDistribution,
    paymentDistribution,
    hourlyTrend
  };
}

async function getComparisons() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();
  const yesterdayStart = periodStart(1);
  const yesterdayEnd = new Date(todayStartDate.getTime() - 1);
  const lastWeekStart = periodStart(7);
  const lastWeekEnd = new Date(todayStartDate.getTime() - 1);

  // Today vs Yesterday
  const [todayAgg, yesterdayAgg] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStartDate, $lte: todayEndDate }, status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }, status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ])
  ]);

  const todayData = todayAgg[0] || { orders: 0, revenue: 0 };
  const yesterdayData = yesterdayAgg[0] || { orders: 0, revenue: 0 };

  // This week vs last week
  const thisWeekStart = lastWeekStart;
  const thisWeekEnd = todayEndDate;
  const prevWeekStart = periodStart(14);
  const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);

  const [thisWeekAgg, prevWeekAgg] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }, status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: prevWeekStart, $lte: prevWeekEnd }, status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ])
  ]);

  const thisWeek = thisWeekAgg[0] || { orders: 0, revenue: 0 };
  const prevWeek = prevWeekAgg[0] || { orders: 0, revenue: 0 };

  const calcChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  return {
    todayVsYesterday: {
      today: { orders: todayData.orders, revenue: todayData.revenue },
      yesterday: { orders: yesterdayData.orders, revenue: yesterdayData.revenue },
      orderChange: calcChange(todayData.orders, yesterdayData.orders),
      revenueChange: calcChange(todayData.revenue, yesterdayData.revenue)
    },
    thisWeekVsLastWeek: {
      thisWeek: { orders: thisWeek.orders, revenue: thisWeek.revenue },
      lastWeek: { orders: prevWeek.orders, revenue: prevWeek.revenue },
      orderChange: calcChange(thisWeek.orders, prevWeek.orders),
      revenueChange: calcChange(thisWeek.revenue, prevWeek.revenue)
    }
  };
}

async function getAlerts() {
  const alerts = await Alert.find({ resolved: false })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('type severity title message createdAt acknowledged')
    .lean();

  const counts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length
  };

  return { counts, alerts };
}

// Manager dashboard
async function getManagerTeamPerformance() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();

  const staffPerf = await Order.aggregate([
    { $match: { completedBy: { $ne: null }, status: 'completed', createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: '$completedBy',
        ordersCompleted: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { ordersCompleted: -1 } }
  ]);

  const staffIds = staffPerf.map(s => s._id);
  const staffs = await Staff.find({ _id: { $in: staffIds } }).select('name role').lean();
  const staffMap = new Map(staffs.map(s => [s._id.toString(), s]));

  const teamPerformance = staffPerf.map(s => ({
    staffId: s._id,
    name: staffMap.get(s._id.toString())?.name || 'Unknown',
    role: staffMap.get(s._id.toString())?.role || 'staff',
    ordersCompleted: s.ordersCompleted,
    totalRevenue: s.totalRevenue
  }));

  return teamPerformance;
}

async function getManagerDailySummary() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();

  const dailyAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: { $cond: [{ $in: ['$status', ['completed', 'confirmed']] }, '$totalAmount', 0] } },
        totalDiscount: { $sum: '$discountAmount' }
      }
    }
  ]);

  const summary = dailyAgg[0] || { totalOrders: 0, completedOrders: 0, pendingOrders: 0, cancelledOrders: 0, totalRevenue: 0, totalDiscount: 0 };

  return summary;
}

async function getManagerPendingIssues() {
  // Pending orders
  const pendingOrders = await Order.countDocuments({
    status: 'pending',
    createdAt: { $gte: todayStart() }
  });

  // Preparing orders
  const preparingOrders = await Order.countDocuments({
    kitchenStatus: { $in: ['queued', 'preparing'] },
    status: { $ne: 'cancelled' }
  });

  // Unpaid orders
  const unpaidOrders = await Order.countDocuments({
    paymentStatus: 'unpaid',
    status: { $ne: 'cancelled' }
  });

  // Low stock count
  const lowStockCount = await Ingredient.countDocuments({
    isActive: true,
    $expr: { $lte: ['$currentStock', '$minimumStock'] }
  });

  return {
    pendingOrders,
    preparingOrders,
    unpaidOrders,
    lowStockCount
  };
}

// Staff dashboard
async function getStaffPersonal(staffId) {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();

  const personalStats = await Order.aggregate([
    { $match: { completedBy: staffId, status: 'completed', createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: null,
        ordersCompleted: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  const stats = personalStats[0] || { ordersCompleted: 0, totalRevenue: 0 };

  // Confirmed (but not yet completed) orders count
  const confirmedCount = await Order.countDocuments({
    confirmedBy: staffId,
    status: 'confirmed',
    createdAt: { $gte: todayStartDate, $lte: todayEndDate }
  });

  return {
    today: {
      ...stats,
      confirmedCount
    }
  };
}

async function getStaffToday() {
  const todayStartDate = todayStart();
  const todayEndDate = todayEnd();

  const allStaffToday = await Order.aggregate([
    { $match: { completedBy: { $ne: null }, status: 'completed', createdAt: { $gte: todayStartDate, $lte: todayEndDate } } },
    {
      $group: {
        _id: '$completedBy',
        ordersCompleted: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  const totalOrders = allStaffToday.reduce((sum, s) => sum + s.ordersCompleted, 0);
  const totalRevenue = allStaffToday.reduce((sum, s) => sum + s.totalRevenue, 0);

  return {
    totalOrders,
    totalRevenue,
    activeStaff: allStaffToday.length
  };
}

async function getStaffUpcoming() {
  const upcoming = await Order.find({
    status: 'pending',
    createdAt: { $gte: todayStart() }
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderCode customerName totalAmount items notes createdAt')
    .lean();

  return upcoming;
}

module.exports = {
  getDashboardSummary,
  getExecutiveDashboard,
  getKpiDashboard,
  getTrends,
  getComparisons,
  getAlerts,
  getManagerTeamPerformance,
  getManagerDailySummary,
  getManagerPendingIssues,
  getStaffPersonal,
  getStaffToday,
  getStaffUpcoming
};