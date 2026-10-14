const mongoose = require('mongoose');

const WhatsAppMessageSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  recipient: { type: String, required: true, trim: true },
  category: { type: String, enum: ['utility', 'marketing'], required: true },
  templateName: { type: String, required: true, trim: true, lowercase: true },
  language: { type: String, required: true, trim: true, default: 'id' },
  variables: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, required: true, trim: true },
  sourceId: { type: String, required: true, trim: true },
  idempotencyKey: { type: String, required: true, unique: true, trim: true },
  provider: { type: String, default: 'meta_cloud_api', trim: true },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'unknown'],
    default: 'queued',
    index: true
  },
  wamid: { type: String, required: false, unique: true, sparse: true, trim: true },
  attempts: { type: Number, default: 0, min: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, required: false },
  acceptedAt: { type: Date, required: false },
  deliveredAt: { type: Date, required: false },
  readAt: { type: Date, required: false },
  failedAt: { type: Date, required: false },
  lastErrorCode: { type: String, default: '', trim: true },
  lastError: { type: String, default: '', trim: true, maxlength: 500 },
  consentSnapshot: {
    source: { type: String, default: '', trim: true },
    textVersion: { type: String, default: '', trim: true },
    consentedAt: { type: Date, required: false }
  }
}, { timestamps: true });

WhatsAppMessageSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
WhatsAppMessageSchema.index({ source: 1, sourceId: 1 });

module.exports = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);