const Joi = require('joi');

const orderItemSchema = Joi.object({
  menuId: Joi.string().required().messages({
    'string.empty': 'Menu ID is required',
    'any.required': 'Menu ID is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    'array.min': 'Order must have at least one item',
    'any.required': 'Items array is required'
  }),
  notes: Joi.string().allow('').optional(),
  channel: Joi.string().valid('dine_in', 'online', 'marketplace').default('dine_in'),
  fulfillmentType: Joi.string().valid('dine_in', 'takeaway', 'delivery').default('takeaway'),
  tableId: Joi.string().optional().allow(''),
  deliveryAddress: Joi.string().allow('').optional(),
  deliveryNotes: Joi.string().allow('').optional(),
  promoCodeUsed: Joi.string().trim().allow('').optional(),
  campaignId: Joi.string().optional().allow(''),
  customerName: Joi.string().trim().min(1).required().messages({
    'any.required': 'Customer name is required'
  }),
  customerPhone: Joi.string().trim()
    .pattern(/^\+?[0-9][0-9\s().-]{6,18}$/)
    .allow('')
    .optional()
    .messages({ 'string.pattern.base': 'Customer phone number is invalid' }),
  whatsappConsent: Joi.object({
    utility: Joi.boolean().default(false),
    marketing: Joi.boolean().default(false)
  }).default({})
});

const updateOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).optional(),
  notes: Joi.string().allow('').optional()
}).min(1);

const trackOrderParamsSchema = Joi.object({
  orderCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^NGP-\d{8}-[A-F0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order code format'
    })
});

const kitchenStatusBodySchema = Joi.object({
  kitchenStatus: Joi.string().valid('preparing', 'ready').required()
});

const paymentUpdateBodySchema = Joi.object({
  paymentStatus: Joi.string().valid('unpaid', 'pending', 'paid', 'refunded').required(),
  paymentMethod: Joi.when('paymentStatus', {
    is: 'paid',
    then: Joi.string().valid('cash', 'transfer', 'qris_static').required(),
    otherwise: Joi.string().valid('cash', 'transfer', 'qris_static').optional().allow(null, '')
  }),
  externalPaymentId: Joi.string().trim().optional(),
  paymentReference: Joi.string().trim().optional()
});

const queueQuerySchema = Joi.object({
  queueDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({ 'string.pattern.base': 'queueDate must be YYYY-MM-DD' })
});

const listOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('').optional(),
  orderCode: Joi.string().trim().uppercase().optional(),
  status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').optional(),
  channel: Joi.string().valid('dine_in', 'online', 'marketplace').optional(),
  kitchenStatus: Joi.string().valid('none', 'queued', 'preparing', 'ready', 'served').optional(),
  paymentStatus: Joi.string().valid('unpaid', 'pending', 'paid', 'refunded').optional(),
  queueDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
});

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
  createOrderSchema,
  updateOrderSchema,
  trackOrderParamsSchema,
  kitchenStatusBodySchema,
  paymentUpdateBodySchema,
  queueQuerySchema,
  listOrdersQuerySchema,
  paymentWebhookSchema
};
