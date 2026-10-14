const { AppError, BusinessError } = require('../errors/AppError');
const { handleWebhookUpdate } = require('../services/paymentService');

async function paymentWebhookHandler(req, res, next) {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret && process.env.NODE_ENV === 'production') {
      throw new AppError('Payment webhook secret is not configured', 503, 'PAYMENT_WEBHOOK_NOT_CONFIGURED');
    }
    if (webhookSecret) {
      const incomingSecret =
        req.headers['x-webhook-secret'] || req.headers['x-payment-secret'];
      if (!incomingSecret || incomingSecret !== webhookSecret) {
        throw new BusinessError('Invalid webhook secret', 'INVALID_WEBHOOK_SECRET');
      }
    }

    const {
      orderCode,
      paymentStatus,
      paymentMethod,
      externalPaymentId,
      paymentReference
    } = req.body;

    const payment = await handleWebhookUpdate({
      orderCode,
      paymentStatus,
      paymentMethod,
      externalPaymentId,
      paymentReference
    });

    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  paymentWebhookHandler
};
