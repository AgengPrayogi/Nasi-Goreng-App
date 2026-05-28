const { AppError, ValidationError, BusinessError, NotFoundError } = require('../errors/AppError');
const mongoose = require('mongoose');

function notFound(req, res, next) {
  res.status(404);
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  err.errorCode = 'ROUTE_NOT_FOUND';
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let errors = undefined;

  // Handle custom AppError classes
  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    errors = err.errors;
  } else if (err instanceof BusinessError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
  } else if (err instanceof NotFoundError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
  }
  // Handle Mongoose errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation error';
    errorCode = 'MONGOOSE_VALIDATION_ERROR';
    errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorCode = 'INVALID_ID';
  } else if (err.code === 11000) {
    // Duplicate key error
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    errorCode = 'DUPLICATE_KEY';
  }
  // Handle errors with statusCode (from previous implementation)
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message || message;
    errorCode = err.errorCode || errorCode;
  }
  // Unknown errors
  else {
    // Log error for debugging (in production, use proper logging)
    console.error('Unexpected error:', err);
  }

  const response = {
    success: false,
    message,
    errorCode
  };

  if (errors) {
    response.errors = errors;
  }

  // Only expose stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };
