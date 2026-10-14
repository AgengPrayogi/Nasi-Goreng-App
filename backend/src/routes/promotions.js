const express = require('express');
const controller = require('../controllers/promotionController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();
router.get('/active', controller.activeHandler);
router.get('/validate/:code', controller.validateHandler);
router.post('/', authenticate, requireAdmin, controller.createHandler);
module.exports = router;