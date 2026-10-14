const express = require('express');
const {
  createCustomerHandler,
  getAllCustomersHandler,
  getCustomerTiersHandler,
  updateCustomerTypeHandler,
  getCustomerHandler,
  updateCustomerHandler,
  getCustomerOrdersHandler,
  getTopCustomersHandler,
  getCustomerSegmentsHandler,
  getRepeatCustomerRateHandler,
  getChurnRiskHandler,
  getCustomerLifetimeValueHandler,
  getCrmDashboardHandler,
  listSupportTicketsHandler,
  createSupportTicketHandler,
  updateSupportTicketHandler
} = require('../controllers/customerController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const { customerTypeBodySchema } = require('../validators/customerValidator');

const router = express.Router();

router.post('/', createCustomerHandler);

// All customer routes require admin auth
router.use(authenticate, requireAdmin);

// Get all customers with filters
router.get('/', getAllCustomersHandler);
router.get('/tiers', getCustomerTiersHandler);
router.get('/crm-dashboard', getCrmDashboardHandler);
router.get('/support-tickets', listSupportTicketsHandler);
router.post('/support-tickets', createSupportTicketHandler);
router.patch('/support-tickets/:ticketId', updateSupportTicketHandler);
router.patch('/:id/type', validate(customerTypeBodySchema), updateCustomerTypeHandler);

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
