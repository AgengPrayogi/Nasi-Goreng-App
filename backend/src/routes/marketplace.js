const express = require('express');
const controller = require('../controllers/marketplaceController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();
router.post('/webhooks/:platform', controller.webhookHandler);
router.use(authenticate, requireAdmin);
router.get('/orders', controller.listOrdersHandler);
router.get('/mappings', controller.listMappingsHandler);
router.post('/mappings', controller.createMappingHandler);
router.patch('/mappings/:id', controller.updateMappingHandler);
module.exports = router;
