const Joi = require('joi');

const createIngredientSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Ingredient name is required',
    'any.required': 'Ingredient name is required'
  }),
  unit: Joi.string().valid('gram', 'ml', 'pcs', 'kg').default('pcs'),
  costPerUnit: Joi.number().min(0).default(0),
  currentStock: Joi.number().min(0).default(0),
  minimumStock: Joi.number().min(0).default(0),
  stock: Joi.number().min(0).optional(),
  minStock: Joi.number().min(0).optional(),
  checkFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').default('weekly'),
  nextCheckAt: Joi.date().iso().allow(null).optional(),
  lastCheckedAt: Joi.date().iso().allow(null).optional(),
  inspectionNotes: Joi.string().trim().allow('').default('')
}).custom((value, helpers) => {
  if (value.stock !== undefined && value.currentStock === 0 && value.stock >= 0) {
    value.currentStock = value.stock;
  }
  if (value.minStock !== undefined && value.minimumStock === 0 && value.minStock >= 0) {
    value.minimumStock = value.minStock;
  }
  return value;
});

const updateIngredientSchema = Joi.object({
  name: Joi.string().trim().optional(),
  unit: Joi.string().valid('gram', 'ml', 'pcs', 'kg').optional(),
  costPerUnit: Joi.number().min(0).optional(),
  currentStock: Joi.number().optional(),
  minimumStock: Joi.number().min(0).optional(),
  stock: Joi.number().optional(),
  minStock: Joi.number().min(0).optional(),
  checkFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').optional(),
  nextCheckAt: Joi.date().iso().allow(null).optional(),
  lastCheckedAt: Joi.date().iso().allow(null).optional(),
  inspectionNotes: Joi.string().trim().allow('').optional()
}).custom((value, helpers) => {
  if (value.stock !== undefined) {
    value.currentStock = value.stock;
  }
  if (value.minStock !== undefined) {
    value.minimumStock = value.minStock;
  }
  return value;
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

module.exports = {
  createIngredientSchema,
  updateIngredientSchema
};
