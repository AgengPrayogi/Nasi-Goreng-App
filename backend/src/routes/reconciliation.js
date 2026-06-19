const express = require('express');
const {
  closeDayHandler,
  getDailyHandler,
  getRangeHandler,
  compareHandler,
  getMonthlyHandler,
  getTrendHandler,
  getHealthMetricsHandler
} = require('../controllers/reconciliationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All reconciliation routes require admin auth
router.use(authenticate, requireAdmin);

// Close daily sales
router.post('/close', closeDayHandler);

// Get daily reconciliation
router.get('/:date', getDailyHandler);

// Get reconciliation range (analytics)
router.get('/range/period', getRangeHandler);

// Compare two dates
router.get('/compare/dates', compareHandler);

// Get monthly summary
router.get('/monthly/:year/:month', getMonthlyHandler);

// Get revenue trend
router.get('/trend/data', getTrendHandler);

// Get health metrics
router.get('/health/metrics', getHealthMetricsHandler);

module.exports = router;
