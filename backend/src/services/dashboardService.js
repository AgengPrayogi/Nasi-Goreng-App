const Order = require('../models/Order');
const Ingredient = require('../models/Ingredient');

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
    if (row._id === 'completed') {
      orderStats.totalRevenue = row.total;
    }
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

module.exports = { getDashboardSummary };