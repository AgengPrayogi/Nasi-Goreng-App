const express = require('express');
const { dashboardSummaryHandler } = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All dashboard endpoints are admin-only
router.use(authenticate, requireAdmin);

router.get('/summary', dashboardSummaryHandler);

module.exports = router;