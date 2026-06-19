const { createPayment, getPaymentByOrderCode, listPayments } = require('../services/paymentService');
const { BusinessError, NotFoundError } = require('../errors/AppError');

async function createPaymentHandler(req, res, next) {
  try {
    const { orderId, method, amount, minutesToExpire } = req.body;

    if (!orderId) {
      throw new BusinessError('orderId is required', 'ORDER_ID_REQUIRED');
    }
    if (!method) {
      throw new BusinessError('method is required', 'PAYMENT_METHOD_REQUIRED');
    }
    if (amount == null || isNaN(Number(amount))) {
      throw new BusinessError('amount must be a valid number', 'INVALID_AMOUNT');
    }

    const payment = await createPayment({
      orderId,
      method,
      amount: Number(amount),
      minutesToExpire: minutesToExpire ? Number(minutesToExpire) : undefined
    });

    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
}

async function getPaymentByOrderCodeHandler(req, res, next) {
  try {
    const { orderCode } = req.params;
    const payment = await getPaymentByOrderCode(orderCode);
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
}

async function listPaymentsHandler(req, res, next) {
  try {
    const { status, method, orderCode, page, limit } = req.query;
    const result = await listPayments({
      status,
      method,
      orderCode,
      page,
      limit
    });
    res.json({
      data: result.payments,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPaymentHandler,
  getPaymentByOrderCodeHandler,
  listPaymentsHandler
};