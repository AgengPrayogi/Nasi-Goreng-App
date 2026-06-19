const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/templates', reportController.templatesHandler);
router.get('/sales', reportController.salesSummaryHandler);
router.get('/top-menus', reportController.topMenusHandler);
router.get('/menu-performance', reportController.menuPerformanceHandler);
router.get('/customer-analysis', reportController.customerAnalysisHandler);
router.get('/staff-performance', reportController.staffPerformanceReportHandler);
router.get('/inventory', reportController.inventoryReportHandler);
router.get('/financial', reportController.financialReportHandler);
router.get('/supplier', reportController.supplierReportHandler);
router.post('/custom', reportController.customReportHandler);
router.post('/export', reportController.exportReportHandler);
router.get('/saved', reportController.savedReportsHandler);
router.post('/saved', reportController.saveReportHandler);
router.delete('/saved/:id', reportController.deleteSavedReportHandler);

module.exports = router;
