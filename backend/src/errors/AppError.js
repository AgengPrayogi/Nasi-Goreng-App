class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BusinessError extends AppError {
  constructor(message, errorCode = 'BUSINESS_RULE_VIOLATION') {
    super(message, 400, errorCode);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = [], errorCode = 'VALIDATION_ERROR') {
    super(message, 400, errorCode);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', errorCode = 'NOT_FOUND') {
    super(`${resource} not found`, 404, errorCode);
  }
}

module.exports = {
  AppError,
  BusinessError,
  ValidationError,
  NotFoundError
};
