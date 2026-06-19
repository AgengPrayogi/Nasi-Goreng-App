const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Finance = require('../models/Finance');
const Budget = require('../models/Budget');
const DailyReconciliation = require('../models/DailyReconciliation');

function getDateRange(query = {}, defaultDays = 30) {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.setDate(now.getDate() - defaultDays + 1));
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

async function getProfitabilitySummary(query = {}) {
  const { from, to } = getDateRange(query);

  const [orderAgg, menus] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menus',
          localField: 'items.menu',
          foreignField: '_id',
          as: 'menuData'
        }
      },
      { $unwind: '$menuData' },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } },
          cogs: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$menuData.costPrice', 0] }] } },
          discounts: { $sum: '$discountAmount' },
          orderCount: { $addToSet: '$_id' }
        }
      },
      { $project: { revenue: 1, cogs: 1, discounts: 1, orderCount: { $size: '$orderCount' } } }
    ]),
    Menu.find({ isAvailable: true }).select('name price costPrice profitMargin').lean()
  ]);

  const row = orderAgg[0] || { revenue: 0, cogs: 0, discounts: 0, orderCount: 0 };
  const grossProfit = row.revenue - row.cogs;
  const netRevenue = row.revenue - row.discounts;

  return {
    range: { from, to },
    revenue: row.revenue,
    netRevenue,
    cogs: row.cogs,
    grossProfit,
    grossMarginPercent: row.revenue ? Math.round((grossProfit / row.revenue) * 10000) / 100 : 0,
    netMarginPercent: netRevenue ? Math.round(((netRevenue - row.cogs) / netRevenue) * 10000) / 100 : 0,
    totalDiscounts: row.discounts,
    orderCount: row.orderCount,
    avgOrderValue: row.orderCount ? Math.round(row.revenue / row.orderCount) : 0,
    foodCostPercent: row.revenue ? Math.round((row.cogs / row.revenue) * 10000) / 100 : 0,
    menuBreakdown: menus.slice(0, 20).map((m) => ({
      menuId: m._id,
      name: m.name,
      price: m.price,
      costPrice: m.costPrice || 0,
      profitMargin: m.profitMargin || 0
    }))
  };
}

async function getCostAnalysis(query = {}) {
  const { from, to } = getDateRange(query);

  const [orderCosts, financeExpenses] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menus',
          localField: 'items.menu',
          foreignField: '_id',
          as: 'menuData'
        }
      },
      { $unwind: '$menuData' },
      {
        $group: {
          _id: null,
          variableCost: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$menuData.costPrice', 0] }] } },
          orderCount: { $addToSet: '$_id' }
        }
      },
      { $project: { variableCost: 1, orderCount: { $size: '$orderCount' } } }
    ]),
    Finance.aggregate([
      { $match: { type: 'expense', date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ])
  ]);

  const orderRow = orderCosts[0] || { variableCost: 0, orderCount: 0 };
  const fixedCosts = financeExpenses.reduce((s, e) => s + e.total, 0);

  return {
    range: { from, to },
    variableCosts: {
      cogs: orderRow.variableCost,
      costPerOrder: orderRow.orderCount ? Math.round(orderRow.variableCost / orderRow.orderCount) : 0
    },
    fixedCosts: {
      total: fixedCosts,
      byCategory: financeExpenses.map((e) => ({
        category: e._id || 'other',
        total: e.total,
        count: e.count
      }))
    },
    totalCosts: orderRow.variableCost + fixedCosts,
    orderCount: orderRow.orderCount
  };
}

async function getCashFlow(query = {}) {
  const { from, to } = getDateRange(query, 30);
  const period = query.period || 'daily';

  const dateFormat = period === 'weekly' ? '%Y-W%V' : period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

  const [inflows, outflows, paymentBreakdown] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid', createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { period: { $dateToString: { format: dateFormat, date: '$createdAt' } } },
          cashIn: { $sum: '$amountAfterDiscount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.period': 1 } }
    ]),
    Finance.aggregate([
      { $match: { type: 'expense', date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { period: { $dateToString: { format: dateFormat, date: '$date' } } },
          cashOut: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.period': 1 } }
    ]),
    Order.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid', createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amountAfterDiscount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const outflowMap = new Map(outflows.map((o) => [o._id.period, o.cashOut]));
  const cashFlow = inflows.map((inf) => {
    const cashOut = outflowMap.get(inf._id.period) || 0;
    return {
      period: inf._id.period,
      cashIn: inf.cashIn,
      cashOut,
      netCashFlow: inf.cashIn - cashOut,
      orderCount: inf.orderCount
    };
  });

  const totalIn = inflows.reduce((s, i) => s + i.cashIn, 0);
  const totalOut = outflows.reduce((s, o) => s + o.cashOut, 0);

  return {
    range: { from, to },
    period,
    cashFlow,
    summary: {
      totalCashIn: totalIn,
      totalCashOut: totalOut,
      netCashFlow: totalIn - totalOut
    },
    paymentMethodImpact: paymentBreakdown.map((p) => ({
      method: p._id || 'unknown',
      total: p.total,
      count: p.count,
      percentage: totalIn ? Math.round((p.total / totalIn) * 10000) / 100 : 0
    }))
  };
}

async function getBudgetVsActual(query = {}) {
  const year = parseInt(query.year) || new Date().getFullYear();
  const month = parseInt(query.month) || new Date().getMonth() + 1;

  const budget = await Budget.findOne({
    'period.year': year,
    'period.month': month,
    status: { $in: ['active', 'draft'] }
  }).lean();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [actualRevenue, actualCogs, reconciliations] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, revenue: { $sum: '$amountAfterDiscount' }, discounts: { $sum: '$discountAmount' } } }
    ]),
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $unwind: '$items' },
      {
        $lookup: { from: 'menus', localField: 'items.menu', foreignField: '_id', as: 'menuData' }
      },
      { $unwind: '$menuData' },
      { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$menuData.costPrice', 0] }] } } } }
    ]),
    DailyReconciliation.find({ date: { $gte: startOfMonth, $lte: endOfMonth } }).lean()
  ]);

  const revenue = actualRevenue[0]?.revenue || 0;
  const cogs = actualCogs[0]?.cogs || 0;

  const actuals = {
    revenue,
    cost_of_goods: cogs,
    gross_profit: revenue - cogs
  };

  if (!budget) {
    return {
      period: { year, month },
      budget: null,
      actuals,
      variance: null,
      message: 'Belum ada budget untuk periode ini'
    };
  }

  const variance = budget.items.map((item) => {
    const actualKey = item.category === 'revenue' ? 'revenue'
      : item.category === 'cost_of_goods' ? 'cost_of_goods' : null;
    const actualAmount = actualKey ? actuals[actualKey] || item.actualAmount : item.actualAmount;
    const diff = actualAmount - item.budgetedAmount;
    return {
      category: item.category,
      name: item.name,
      budgeted: item.budgetedAmount,
      actual: actualAmount,
      variance: diff,
      variancePercent: item.budgetedAmount ? Math.round((diff / item.budgetedAmount) * 10000) / 100 : 0
    };
  });

  return {
    period: { year, month },
    budget: {
      id: budget._id,
      name: budget.name,
      totalBudgeted: budget.totalBudgeted,
      status: budget.status
    },
    actuals,
    variance,
    reconciliationDays: reconciliations.length
  };
}

async function listBudgets(query = {}) {
  const filter = {};
  if (query.year) filter['period.year'] = parseInt(query.year);
  if (query.status) filter.status = query.status;
  return Budget.find(filter).sort({ 'period.year': -1, 'period.month': -1 }).lean();
}

async function createBudget(data, adminId) {
  const totalBudgeted = (data.items || []).reduce((s, i) => s + (i.budgetedAmount || 0), 0);
  return Budget.create({
    ...data,
    totalBudgeted,
    createdBy: adminId
  });
}

async function updateBudget(id, data) {
  if (data.items) {
    data.totalBudgeted = data.items.reduce((s, i) => s + (i.budgetedAmount || 0), 0);
  }
  const budget = await Budget.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return budget;
}

module.exports = {
  getProfitabilitySummary,
  getCostAnalysis,
  getCashFlow,
  getBudgetVsActual,
  listBudgets,
  createBudget,
  updateBudget
};
