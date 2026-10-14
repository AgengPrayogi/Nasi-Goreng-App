const Joi = require('joi');

const menuIngredientSchema = Joi.object({
  ingredient: Joi.string().required().messages({
    'string.empty': 'Ingredient ID is required',
    'any.required': 'Ingredient ID is required'
  }),
  quantity: Joi.number().min(0).required().messages({
    'number.min': 'Ingredient quantity must be >= 0',
    'any.required': 'Ingredient quantity is required'
  })
});

const menuRecipePortionSchema = Joi.object({
  label: Joi.string().trim().required().messages({
    'string.empty': 'Portion label is required',
    'any.required': 'Portion label is required'
  }),
  multiplier: Joi.number().min(0).default(1),
  ingredients: Joi.array().items(menuIngredientSchema).default([])
});

const menuRecipeSchema = Joi.object({
  version: Joi.string().trim().default('v1'),
  notes: Joi.string().allow('').default(''),
  portionSizes: Joi.array().items(menuRecipePortionSchema).default([])
});

const createMenuSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Menu name is required',
    'any.required': 'Menu name is required'
  }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Menu price must be >= 0',
    'any.required': 'Menu price is required'
  }),
  description: Joi.string().allow('').default(''),
  imageUrl: Joi.string().allow('').default(''),
  ingredients: Joi.array().items(menuIngredientSchema).default([]),
  recipe: menuRecipeSchema.optional(),
  costPrice: Joi.number().min(0).optional(),
  overheadAllocation: Joi.number().min(0).default(0),
  isAvailable: Joi.boolean().default(true)
});

const updateMenuSchema = Joi.object({
  name: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().allow('').optional(),
  imageUrl: Joi.string().allow('').optional(),
  ingredients: Joi.array().items(menuIngredientSchema).optional(),
  recipe: menuRecipeSchema.optional(),
  costPrice: Joi.number().min(0).optional(),
  overheadAllocation: Joi.number().min(0).optional(),
  isAvailable: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

module.exports = {
  createMenuSchema,
  updateMenuSchema
};
