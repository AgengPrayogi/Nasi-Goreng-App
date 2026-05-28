const { getDashboardSummary } = require('../services/dashboardService');

async function dashboardSummaryHandler(req, res, next) {
  try {
    const data = await getDashboardSummary();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboardSummaryHandler };