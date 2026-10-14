const mongoose = require('mongoose');

const MarketplaceOrderSchema = new mongoose.Schema({
  platform: { type: String, enum: ['grabfood', 'gofood', 'shopeefood', 'other'], required: true, index: true },
  externalOrderId: { type: String, required: true, trim: true },
  internalOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  status: { type: String, enum: ['received', 'mapped', 'synced', 'failed', 'cancelled'], default: 'received' },
  rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastError: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now },
  syncedAt: { type: Date }
}, { timestamps: true });

MarketplaceOrderSchema.index({ platform: 1, externalOrderId: 1 }, { unique: true });

module.exports = mongoose.model('MarketplaceOrder', MarketplaceOrderSchema);