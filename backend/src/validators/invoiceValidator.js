const Joi = require('joi');

const orderCodeParamSchema = Joi.object({
  orderCode: Joi.string().pattern(/^NGP-\d{8}-[A-F0-9]{6}$/).required()
});

const orderIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  orderCodeParamSchema,
  orderIdParamSchema
};