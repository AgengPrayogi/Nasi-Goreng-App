const mongoose = require('mongoose');

const WhatsAppWebhookEventSchema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true, trim: true },
  eventType: { type: String, enum: ['status', 'inbound'], required: true },
  status: { type: String, enum: ['received', 'processed', 'failed'], default: 'received', index: true },
  errorCode: { type: String, default: '', trim: true },
  processedAt: { type: Date, required: false }
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppWebhookEvent', WhatsAppWebhookEventSchema);