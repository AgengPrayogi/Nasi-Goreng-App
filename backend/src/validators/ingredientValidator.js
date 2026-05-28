const Joi = require('joi');

const createIngredientSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Ingredient name is required',
    'any.required': 'Ingredient name is required'
  }),
  unit: Joi.string().valid('gram', 'ml', 'pcs').default('pcs'),
  currentStock: Joi.number().min(0).default(0),
  minimumStock: Joi.number().min(0).default(0)
});

const updateIngredientSchema = Joi.object({
  name: Joi.string().trim().optional(),
  unit: Joi.string().valid('gram', 'ml', 'pcs').optional(),
  currentStock: Joi.number().min(0).optional(),
  minimumStock: Joi.number().min(0).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

module.exports = {
  createIngredientSchema,
  updateIngredientSchema
};
