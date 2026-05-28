const express = require('express');
const { salesSummaryHandler, topMenusHandler } = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All reporting endpoints are admin-only
router.use(authenticate, requireAdmin);

router.get('/sales', salesSummaryHandler);
router.get('/top-menus', topMenusHandler);

module.exports = router;

