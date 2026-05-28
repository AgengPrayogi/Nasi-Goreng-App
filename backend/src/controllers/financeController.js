const financeService = require('../services/financeService');

async function createTransaction(req, res, next) {
  try {
    const { type, amount, description, category, reference, date, relatedOrder } = req.body;
    const transaction = await financeService.createTransaction({
      type,
      amount,
      description,
      category,
      reference,
      date,
      relatedOrder,
      createdBy: req.admin?._id,
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    const { type, category, startDate, endDate, page, limit } = req.query;
    const result = await financeService.listTransactions({
      type,
      category,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    res.json({ success: true, data: result.transactions, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getFinanceSummary(req, res, next) {
  try {
    const { startDate, endDate, period } = req.query;
    const result = await financeService.getFinanceSummary({
      startDate,
      endDate,
      period: period || 'daily',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransaction,
  listTransactions,
  getFinanceSummary,
};