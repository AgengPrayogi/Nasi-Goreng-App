const express = require('express');
const {
  createStaffHandler,
  getAllStaffHandler,
  getStaffHandler,
  updateStaffHandler,
  deleteStaffHandler,
  staffLoginHandler,
  getStaffPerformanceHandler
} = require('../controllers/staffController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

/**
 * Public endpoints
 */

// Staff login (no auth required)
router.post('/login', staffLoginHandler);

/**
 * Admin-only endpoints
 * Requires JWT authentication and admin role
 */
router.use(authenticate, requireAdmin);

// Create new staff member
router.post('/', createStaffHandler);

// Get all staff with filters and pagination
router.get('/', getAllStaffHandler);

// Get staff by ID
router.get('/:id', getStaffHandler);

// Update staff member
router.patch('/:id', updateStaffHandler);

// Delete (deactivate) staff member
router.delete('/:id', deleteStaffHandler);

// Get staff performance metrics
router.get('/:id/performance', getStaffPerformanceHandler);

module.exports = router;
