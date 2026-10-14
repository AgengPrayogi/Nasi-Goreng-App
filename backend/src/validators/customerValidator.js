const Joi = require('joi');

const customerTypeBodySchema = Joi.object({
  customerType: Joi.string().valid('individual', 'corporate').required()
});

module.exports = { customerTypeBodySchema };