const Joi = require('joi');

const paymentWebhookSchema = Joi.object({
  orderCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^NGP-\d{8}-[A-F0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid order code format' }),
  paymentStatus: Joi.string()
    .valid('unpaid', 'pending', 'paid', 'refunded')
    .required(),
  paymentMethod: Joi.string().valid('cash', 'transfer', 'qris_static').optional(),
  externalPaymentId: Joi.string().trim().optional(),
  paymentReference: Joi.string().trim().optional()
});

module.exports = {
  paymentWebhookSchema
};
