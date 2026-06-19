const express = require('express');

const {
  getInvoiceByOrderCode,
  getInvoiceByOrderId,
  getInvoiceHtmlByOrderCode
} = require('../controllers/invoiceController');

const { orderCodeParamSchema, orderIdParamSchema } = require('../validators/invoiceValidator');
const { validate } = require('../middlewares/validation');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get(
  '/order/:orderCode',
  validate(orderCodeParamSchema),
  getInvoiceByOrderCode
);

router.get(
  '/admin/orders/:id',
  authenticate,
  requireAdmin,
  validate(orderIdParamSchema),
  getInvoiceByOrderId
);

router.get(
  '/preview/order/:orderCode',
  validate(orderCodeParamSchema),
  getInvoiceHtmlByOrderCode
);

module.exports = router;