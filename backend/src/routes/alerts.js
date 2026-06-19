const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const alertController = require('../controllers/alertController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', alertController.getAlertsHandler);
router.get('/history', alertController.getAlertHistoryHandler);
router.get('/configs', alertController.getAlertConfigsHandler);
router.post('/configs', alertController.createAlertConfigHandler);
router.patch('/configs/:id', alertController.updateAlertConfigHandler);
router.delete('/configs/:id', alertController.deleteAlertConfigHandler);
router.patch('/:id/acknowledge', alertController.acknowledgeAlertHandler);
router.patch('/:id/resolve', alertController.resolveAlertHandler);
router.post('/check', alertController.checkAlertsHandler);

module.exports = router;