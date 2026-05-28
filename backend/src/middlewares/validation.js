const { ValidationError } = require('../errors/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ValidationError('Validation error', errors));
    }

    // Replace req[source] with validated and sanitized value
    req[source] = value;
    next();
  };
}

module.exports = { validate };
