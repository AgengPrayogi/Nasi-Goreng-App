const Joi = require('joi');

// Strong password: min 8 chars, uppercase, lowercase, numbers, special chars
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerAdminSchema = Joi.object({
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
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  })
});

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
      'any.required': 'Password is required'
    })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string()
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      'string.pattern.base': 'New password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
      'any.required': 'New password is required'
    })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

module.exports = {
  registerAdminSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema
};
