const Finance = require('../models/Finance');
const { AppError } = require('../errors/AppError');

/**
 * Create a finance transaction (income or expense).
 */
async function createTransaction({ type, amount, description, category, reference, date, relatedOrder, createdBy }) {
  const transaction = await Finance.create({
    type,
    amount,
    description,
    category,
    reference,
    date: date || new Date(),
    relatedOrder,
    createdBy,
  });
  return transaction;
}

/**
 * List finance transactions with optional filters.
 */
async function listTransactions({ type, category, startDate, endDate, page = 1, limit = 50 }) {
  const filter = {};

  if (type) filter.type = type;
  if (category) filter.category = category;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Finance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOrder', 'orderCode')
      .populate('createdBy', 'email')
      .lean(),
    Finance.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get finance summary grouped by period (daily, monthly, yearly).
 */
async function getFinanceSummary({ startDate, endDate, period = 'daily' }) {
  const match = {};

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.date.$lte = end;
    }
  }

  let dateGroup;
  if (period === 'daily') {
    dateGroup = {
      $dateToString: { format: '%Y-%m-%d', date: '$date' },
    };
  } else if (period === 'monthly') {
    dateGroup = {
      $dateToString: { format: '%Y-%m', date: '$date' },
    };
  } else if (period === 'yearly') {
    dateGroup = {
      $dateToString: { format: '%Y', date: '$date' },
    };
  }

  const summary = await Finance.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          period: dateGroup,
          type: '$type',
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.period': -1, '_id.type': 1 } },
  ]);

  // Transform to a structured format
  const periodMap = {};

  for (const item of summary) {
    const key = item._id.period;
    if (!periodMap[key]) {
      periodMap[key] = {
        period: key,
        totalIncome: 0,
        totalExpense: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
    }
    if (item._id.type === 'income') {
      periodMap[key].totalIncome = item.totalAmount;
      periodMap[key].incomeCount = item.count;
    } else {
      periodMap[key].totalExpense = item.totalAmount;
      periodMap[key].expenseCount = item.count;
    }
    periodMap[key].netProfit = periodMap[key].totalIncome - periodMap[key].totalExpense;
  }

  const periods = Object.values(periodMap).sort((a, b) => b.period.localeCompare(a.period));

  // Grand totals
  const grandTotals = await Finance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const item of grandTotals) {
    if (item._id === 'income') {
      totalIncome = item.totalAmount;
      incomeCount = item.count;
    } else {
      totalExpense = item.totalAmount;
      expenseCount = item.count;
    }
  }

  return {
    periods,
    grandTotal: {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeCount,
      expenseCount,
    },
  };
}

module.exports = {
  createTransaction,
  listTransactions,
  getFinanceSummary,
};