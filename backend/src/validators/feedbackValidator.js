const Joi = require('joi');

const feedbackParamsSchema = Joi.object({
  orderCode: Joi.string().trim().uppercase().pattern(/^NGP-\d{8}-[A-F0-9]{6}$/).required()
});

const feedbackTokenQuerySchema = Joi.object({
  token: Joi.string().hex().length(64).required()
});

const submitFeedbackSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).allow('').default('')
});

module.exports = { feedbackParamsSchema, feedbackTokenQuerySchema, submitFeedbackSchema };
