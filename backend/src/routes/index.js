const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const ingredientRoutes = require('./ingredients');
const menuRoutes = require('./menus');
const orderRoutes = require('./orders');
const paymentRoutes = require('./payments');
const stockMovementRoutes = require('./stockMovements');
const reportRoutes = require('./reports');
const financeRoutes = require('./finance');
const dashboardRoutes = require('./dashboard');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/menus', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/stock-movements', stockMovementRoutes);
router.use('/reports', reportRoutes);
router.use('/finance', financeRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

