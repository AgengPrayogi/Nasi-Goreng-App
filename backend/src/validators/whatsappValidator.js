const Joi = require('joi');

const queueWhatsAppMessageSchema = Joi.object({
  customerId: Joi.string().hex().length(24).required(),
  templateKey: Joi.string().valid(
    'reservation_pending',
    'reservation_confirmed',
    'reservation_cancelled',
    'order_confirmed',
    'order_ready',
    'feedback_request',
    'menu_recommendation'
  ).required(),
  variables: Joi.object().pattern(Joi.string(), Joi.string().trim().max(1024)).required(),
  source: Joi.string().trim().min(1).max(80).required(),
  sourceId: Joi.string().trim().min(1).max(120).required()
});

const listWhatsAppMessagesQuerySchema = Joi.object({
  status: Joi.string().valid('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'unknown').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const listAutomationEventsQuerySchema = Joi.object({
  status: Joi.string().valid('queued', 'sending', 'delivered', 'failed').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const automationEventIdParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  queueWhatsAppMessageSchema,
  listWhatsAppMessagesQuerySchema,
  listAutomationEventsQuerySchema,
  automationEventIdParamsSchema
};
