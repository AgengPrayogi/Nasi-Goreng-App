const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const controller = require('../controllers/tableController');

const router = express.Router();
router.get('/available', controller.listAvailableTablesHandler);
router.use(authenticate, requireAdmin);
router.get('/', controller.listTablesHandler);
router.post('/', controller.createTableHandler);
router.patch('/:id', controller.updateTableHandler);
router.get('/:id/orders', controller.tableOrdersHandler);
router.post('/:id/release', controller.releaseTableHandler);
module.exports = router;
