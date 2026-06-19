const express = require('express');
const {
  createPOHandler,
  getAllPOHandler,
  getPOHandler,
  updatePOStatusHandler,
  receivePOHandler,
  cancelPOHandler,
  getPendingPOHandler,
  getOverduePOHandler
} = require('../controllers/purchaseOrderController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All PO routes require admin auth
router.use(authenticate, requireAdmin);

// Create purchase order
router.post('/', createPOHandler);

// Get all purchase orders
router.get('/', getAllPOHandler);

// Analytics endpoints
router.get('/analytics/pending', getPendingPOHandler);
router.get('/analytics/overdue', getOverduePOHandler);

// Get purchase order by ID
router.get('/:id', getPOHandler);

// Update status
router.patch('/:id/status', updatePOStatusHandler);

// Receive (mark as received and update stock)
router.patch('/:id/receive', receivePOHandler);

// Cancel purchase order
router.patch('/:id/cancel', cancelPOHandler);

module.exports = router;
