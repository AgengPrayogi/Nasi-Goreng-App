const Order = require('../models/Order');
const Menu = require('../models/Menu');

async function getDateRangeFromQuery(query) {
  const { from, to } = query;

  let start;
  let end;

  if (from) {
    start = new Date(from);
  }
  if (to) {
    end = new Date(to);
  }

  // Default: last 7 days
  if (!start && !end) {
    end = new Date();
    start = new Date();
    start.setDate(end.getDate() - 6);
  }

  // Normalize end to end-of-day
  if (end) {
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

async function getSalesSummary(query) {
  const { start, end } = await getDateRangeFromQuery(query);

  const match = { status: 'completed' };
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        totalAmount: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id.day',
        totalAmount: 1,
        orderCount: 1
      }
    },
    { $sort: { date: 1 } }
  ];

  const daily = await Order.aggregate(pipeline);

  const grandTotal = daily.reduce(
    (acc, d) => ({
      totalAmount: acc.totalAmount + d.totalAmount,
      orderCount: acc.orderCount + d.orderCount
    }),
    { totalAmount: 0, orderCount: 0 }
  );

  return {
    range: {
      from: start,
      to: end
    },
    daily,
    summary: grandTotal
  };
}

async function getTopMenus(query) {
  const { start, end } = await getDateRangeFromQuery(query);
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 5;

  const match = { status: 'completed' };
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menu',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit }
  ];

  const agg = await Order.aggregate(pipeline);

  const menuIds = agg.map(a => a._id);
  const menus = await Menu.find({ _id: { $in: menuIds } }).select('name price');
  const menuMap = new Map(menus.map(m => [m._id.toString(), m]));

  const results = agg.map(row => {
    const menu = menuMap.get(row._id.toString());
    return {
      menuId: row._id,
      name: menu ? menu.name : 'Unknown menu',
      currentPrice: menu ? menu.price : null,
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue
    };
  });

  return {
    range: {
      from: start,
      to: end
    },
    items: results
  };
}

module.exports = {
  getSalesSummary,
  getTopMenus
};

