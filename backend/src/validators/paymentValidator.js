const Joi = require('joi');

const paymentWebhookSchema = Joi.object({
  orderCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^NGP-\d{8}-[A-F0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid order code format' }),
  paymentStatus: Joi.string()
    .valid('unpaid', 'pending', 'paid', 'refunded', 'failed', 'expired', 'cancelled')
    .required(),
  paymentMethod: Joi.string().valid('cash', 'transfer', 'qris_static').optional(),
  externalPaymentId: Joi.string().trim().optional(),
  paymentReference: Joi.string().trim().optional()
});

const createPaymentSchema = Joi.object({
  orderId: Joi.string().trim().required().messages({ 'string.empty': 'orderId is required' }),
  method: Joi.string().valid('cash', 'transfer', 'qris_static').required(),
  amount: Joi.number().min(0).required(),
  minutesToExpire: Joi.number().integer().positive().optional()
});

const getPaymentByOrderCodeSchema = Joi.object({
  params: Joi.object({
    orderCode: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^NGP-\d{8}-[A-F0-9]{6}$/)
      .required()
      .messages({ 'string.pattern.base': 'Invalid order code format' })
  }).required()
});

const listPaymentsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'failed', 'expired', 'cancelled').optional(),
  method: Joi.string().valid('cash', 'transfer', 'qris_static').optional(),
  orderCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^NGP-\d{8}-[A-F0-9]{6}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Invalid order code format' }),
  page: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().positive().optional()
});

module.exports = {
  paymentWebhookSchema,
  createPaymentSchema,
  getPaymentByOrderCodeSchema,
  listPaymentsQuerySchema
};