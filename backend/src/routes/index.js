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
const invoiceRoutes = require('./invoices');
const staffRoutes = require('./staff');
const customerRoutes = require('./customers');
const supplierRoutes = require('./suppliers');
const purchaseOrderRoutes = require('./purchaseOrders');
const reconciliationRoutes = require('./reconciliation');
const analyticsRoutes = require('./analytics');
const alertRoutes = require('./alerts');
const campaignRoutes = require('./campaigns');
const budgetRoutes = require('./budget');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/menus', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/stock-movements', stockMovementRoutes);
router.use('/reports', reportRoutes);
router.use('/finance', financeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/staff', staffRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/reconciliation', reconciliationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/alerts', alertRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/budget', budgetRoutes);

module.exports = router;

