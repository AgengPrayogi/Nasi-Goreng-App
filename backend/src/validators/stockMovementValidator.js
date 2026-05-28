const Joi = require('joi');

const restockSchema = Joi.object({
  ingredientId: Joi.string().required().messages({
    'string.empty': 'Ingredient ID is required',
    'any.required': 'Ingredient ID is required'
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Restock amount must be greater than 0',
    'any.required': 'Restock amount is required'
  })
});

const adjustmentSchema = Joi.object({
  ingredientId: Joi.string().required().messages({
    'string.empty': 'Ingredient ID is required',
    'any.required': 'Ingredient ID is required'
  }),
  amount: Joi.number().invalid(0).required().messages({
    'any.invalid': 'Adjustment amount cannot be 0',
    'any.required': 'Adjustment amount is required'
  })
});

module.exports = {
  restockSchema,
  adjustmentSchema
};

