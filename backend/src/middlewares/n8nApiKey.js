const crypto = require('crypto');
const { AppError } = require('../errors/AppError');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function authenticateN8n(req, res, next) {
  const configuredKey = process.env.N8N_WHATSAPP_API_KEY;
  if (!configuredKey) {
    return next(new AppError('n8n WhatsApp API is not configured', 503, 'N8N_WHATSAPP_NOT_CONFIGURED'));
  }
  if (!safeEqual(req.get('X-N8N-API-Key'), configuredKey)) {
    return next(new AppError('Invalid n8n API key', 401, 'INVALID_N8N_API_KEY'));
  }
  return next();
}

module.exports = { authenticateN8n };
