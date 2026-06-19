const Joi = require('joi');

// Strong password: min 8 chars, uppercase, lowercase, numbers, special chars
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const createStaffSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string()
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
      'any.required': 'Password is required'
    }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must be at most 100 characters',
    'any.required': 'Name is required'
  }),
  phone: Joi.string().optional().allow('').messages({
    'string.base': 'Phone must be a string'
  }),
  role: Joi.string()
    .valid('admin', 'manager', 'cashier', 'chef', 'waiter')
    .default('waiter')
    .messages({
      'any.only': 'Role must be one of: admin, manager, cashier, chef, waiter'
    }),
  notes: Joi.string().optional().allow('').messages({
    'string.base': 'Notes must be a string'
  })
});

const updateStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must be at most 100 characters'
  }),
  phone: Joi.string().optional().allow('').messages({
    'string.base': 'Phone must be a string'
  }),
  role: Joi.string()
    .valid('admin', 'manager', 'cashier', 'chef', 'waiter')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, manager, cashier, chef, waiter'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'suspended')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended'
    }),
  notes: Joi.string().optional().allow('').messages({
    'string.base': 'Notes must be a string'
  })
});

const staffLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const staffPasswordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string()
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
      'any.required': 'New password is required'
    })
});

module.exports = {
  createStaffSchema,
  updateStaffSchema,
  staffLoginSchema,
  staffPasswordChangeSchema
};
