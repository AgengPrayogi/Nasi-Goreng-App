const express = require('express');
const {
  createOrderHandler,
  confirmOrderHandler,
  completeOrderHandler,
  cancelOrderHandler,
  listOrdersHandler,
  listKitchenQueueHandler,
  getOrderHandler,
  trackOrderHandler,
  updateKitchenStatusHandler,
  updatePaymentHandler
} = require('../controllers/orderController');
const { validate } = require('../middlewares/validation');
const {
  createOrderSchema,
  trackOrderParamsSchema,
  kitchenStatusBodySchema,
  paymentUpdateBodySchema,
  queueQuerySchema,
  listOrdersQuerySchema
} = require('../validators/orderValidator');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Public: create order
router.post('/', validate(createOrderSchema), createOrderHandler);

// Public: track order by kitchen / customer code
router.get('/track/:orderCode', validate(trackOrderParamsSchema, 'params'), trackOrderHandler);

// Admin-only: manage and view orders
router.use(authenticate, requireAdmin);

router.get('/queue', validate(queueQuerySchema, 'query'), listKitchenQueueHandler);
router.get('/', validate(listOrdersQuerySchema, 'query'), listOrdersHandler);

router.patch('/:id/kitchen', validate(kitchenStatusBodySchema), updateKitchenStatusHandler);
router.patch('/:id/payment', validate(paymentUpdateBodySchema), updatePaymentHandler);
router.patch('/:id/confirm', confirmOrderHandler);
router.patch('/:id/complete', completeOrderHandler);
router.patch('/:id/cancel', cancelOrderHandler);

router.get('/:id', getOrderHandler);

module.exports = router;
