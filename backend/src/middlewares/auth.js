const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { AppError } = require('../errors/AppError');

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

async function authenticate(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      throw new AppError('Authentication token missing', 401, 'UNAUTHORIZED');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw new AppError('Admin not found or inactive', 401, 'UNAUTHORIZED');
    }

    req.user = {
      id: admin._id.toString(),
      email: admin.email
    };

    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new AppError('Admin authentication required', 403, 'FORBIDDEN'));
  }
  return next();
}

module.exports = {
  authenticate,
  requireAdmin
};

