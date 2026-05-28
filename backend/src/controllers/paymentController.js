const { BusinessError } = require('../errors/AppError');
const { updatePaymentByOrderCode } = require('../services/orderService');

async function paymentWebhookHandler(req, res, next) {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers['x-webhook-secret'] || req.headers['x-payment-secret'];
      if (!incomingSecret || incomingSecret !== webhookSecret) {
        throw new BusinessError('Invalid webhook secret', 'INVALID_WEBHOOK_SECRET');
      }
    }

    const { orderCode, paymentStatus, paymentMethod, externalPaymentId, paymentReference } = req.body;
    const order = await updatePaymentByOrderCode(orderCode, {
      paymentStatus,
      paymentMethod,
      externalPaymentId,
      paymentReference
    });

    res.json({ data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  paymentWebhookHandler
};
