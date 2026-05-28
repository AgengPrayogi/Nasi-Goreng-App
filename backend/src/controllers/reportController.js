const { getSalesSummary, getTopMenus } = require('../services/reportService');

async function salesSummaryHandler(req, res, next) {
  try {
    const data = await getSalesSummary(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function topMenusHandler(req, res, next) {
  try {
    const data = await getTopMenus(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  salesSummaryHandler,
  topMenusHandler
};

