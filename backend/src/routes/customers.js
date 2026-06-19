const express = require('express');
const {
  getAllCustomersHandler,
  getCustomerHandler,
  updateCustomerHandler,
  getCustomerOrdersHandler,
  getTopCustomersHandler,
  getCustomerSegmentsHandler,
  getRepeatCustomerRateHandler,
  getChurnRiskHandler,
  getCustomerLifetimeValueHandler
} = require('../controllers/customerController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All customer routes require admin auth
router.use(authenticate, requireAdmin);

// Get all customers with filters
router.get('/', getAllCustomersHandler);

// Analytics endpoints
router.get('/analytics/top', getTopCustomersHandler);
router.get('/analytics/segments', getCustomerSegmentsHandler);
router.get('/analytics/repeat-rate', getRepeatCustomerRateHandler);
router.get('/analytics/churn-risk', getChurnRiskHandler);

// Get customer by ID
router.get('/:id', getCustomerHandler);

// Get customer order history
router.get('/:id/orders', getCustomerOrdersHandler);

// Get customer lifetime value
router.get('/:id/lifetime-value', getCustomerLifetimeValueHandler);

// Update customer
router.patch('/:id', updateCustomerHandler);

module.exports = router;
