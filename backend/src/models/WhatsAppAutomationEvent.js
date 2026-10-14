const mongoose = require('mongoose');

const WhatsAppAutomationEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, trim: true },
  eventType: { type: String, enum: ['inbound_message', 'message_status'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['queued', 'sending', 'delivered', 'failed'], default: 'queued', index: true },
  attempts: { type: Number, default: 0, min: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, required: false },
  deliveredAt: { type: Date, required: false },
  lastError: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

WhatsAppAutomationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
WhatsAppAutomationEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

module.exports = mongoose.model('WhatsAppAutomationEvent', WhatsAppAutomationEventSchema);
