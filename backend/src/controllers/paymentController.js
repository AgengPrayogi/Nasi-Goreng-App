const { paymentWebhookHandler } = require('./paymentController.webhook');
const {
  createPaymentHandler,
  getPaymentByOrderCodeHandler,
  listPaymentsHandler
} = require('./paymentController.gateway');

module.exports = {
  paymentWebhookHandler,
  createPaymentHandler,
  getPaymentByOrderCodeHandler,
  listPaymentsHandler
};