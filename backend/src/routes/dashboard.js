const express = require('express');
const {
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
} = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All dashboard endpoints are admin-only
router.use(authenticate, requireAdmin);

// Executive dashboard
router.get('/summary', dashboardSummaryHandler);
router.get('/executive', executiveDashboardHandler);
router.get('/kpi', kpiDashboardHandler);
router.get('/trends', trendsHandler);
router.get('/comparisons', comparisonsHandler);
router.get('/alerts', dashboardAlertsHandler);

// Manager dashboard
router.get('/manager/team', managerTeamHandler);
router.get('/manager/daily', managerDailyHandler);
router.get('/manager/pending', managerPendingHandler);

// Staff dashboard
router.get('/staff/personal', staffPersonalHandler);
router.get('/staff/personal/:staffId', staffPersonalHandler);
router.get('/staff/today', staffTodayHandler);
router.get('/staff/upcoming', staffUpcomingHandler);

module.exports = router;
