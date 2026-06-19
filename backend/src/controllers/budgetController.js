const financialAnalyticsService = require('../services/financialAnalyticsService');
const { AppError } = require('../errors/AppError');

async function listBudgetsHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.listBudgets(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function createBudgetHandler(req, res, next) {
  try {
    if (!req.user?.id) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const data = await financialAnalyticsService.createBudget(req.body, req.user.id);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateBudgetHandler(req, res, next) {
  try {
    const data = await financialAnalyticsService.updateBudget(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBudgetsHandler,
  createBudgetHandler,
  updateBudgetHandler
};
