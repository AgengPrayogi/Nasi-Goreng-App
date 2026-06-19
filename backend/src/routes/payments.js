const express = require('express');
const { validate } = require('../middlewares/validation');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const {
  paymentWebhookSchema,
  createPaymentSchema,
  getPaymentByOrderCodeSchema,
  listPaymentsQuerySchema
} = require('../validators/paymentValidator');
const {
  paymentWebhookHandler,
  createPaymentHandler,
  getPaymentByOrderCodeHandler,
  listPaymentsHandler
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/webhook', validate(paymentWebhookSchema), paymentWebhookHandler);
router.post('/create', validate(createPaymentSchema), createPaymentHandler);
router.get('/order/:orderCode', validate(getPaymentByOrderCodeSchema, 'params'), getPaymentByOrderCodeHandler);
router.use(authenticate, requireAdmin);
router.get('/', validate(listPaymentsQuerySchema, 'query'), listPaymentsHandler);

module.exports = router;