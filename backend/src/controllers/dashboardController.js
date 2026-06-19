const dashboardService = require('../services/dashboardService');

async function dashboardSummaryHandler(req, res, next) {
  try {
    const data = await dashboardService.getDashboardSummary();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function executiveDashboardHandler(req, res, next) {
  try {
    const data = await dashboardService.getExecutiveDashboard();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function kpiDashboardHandler(req, res, next) {
  try {
    const data = await dashboardService.getKpiDashboard();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function trendsHandler(req, res, next) {
  try {
    const data = await dashboardService.getTrends(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function comparisonsHandler(req, res, next) {
  try {
    const data = await dashboardService.getComparisons();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function dashboardAlertsHandler(req, res, next) {
  try {
    const data = await dashboardService.getAlerts();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// Manager dashboard
async function managerTeamHandler(req, res, next) {
  try {
    const data = await dashboardService.getManagerTeamPerformance();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function managerDailyHandler(req, res, next) {
  try {
    const data = await dashboardService.getManagerDailySummary();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function managerPendingHandler(req, res, next) {
  try {
    const data = await dashboardService.getManagerPendingIssues();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// Staff dashboard
async function staffPersonalHandler(req, res, next) {
  try {
    const staffId = req.user.staffId || req.params.staffId;
    const data = await dashboardService.getStaffPersonal(staffId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function staffTodayHandler(req, res, next) {
  try {
    const data = await dashboardService.getStaffToday();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function staffUpcomingHandler(req, res, next) {
  try {
    const data = await dashboardService.getStaffUpcoming();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboardSummaryHandler,
  executiveDashboardHandler,
  kpiDashboardHandler,
  trendsHandler,
  comparisonsHandler,
  dashboardAlertsHandler,
  managerTeamHandler,
  managerDailyHandler,
  managerPendingHandler,
  staffPersonalHandler,
  staffTodayHandler,
  staffUpcomingHandler
};