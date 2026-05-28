const Joi = require('joi');

const createTransactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().trim().min(1).max(500).required(),
  category: Joi.string()
    .valid(
      'order_payment',
      'restock',
      'operational',
      'salary',
      'utilities',
      'maintenance',
      'marketing',
      'withdraw',
      'other'
    )
    .required(),
  reference: Joi.string().trim().max(200).allow('').default(''),
  date: Joi.date().iso(),
  relatedOrder: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
});

module.exports = {
  createTransactionSchema,
};