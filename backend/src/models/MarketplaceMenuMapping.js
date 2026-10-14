const mongoose = require('mongoose');

const MarketplaceMenuMappingSchema = new mongoose.Schema({
  platform: { type: String, enum: ['grabfood', 'gofood', 'shopeefood', 'other'], required: true },
  externalMenuId: { type: String, required: true, trim: true },
  externalName: { type: String, default: '', trim: true },
  internalMenuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

MarketplaceMenuMappingSchema.index({ platform: 1, externalMenuId: 1 }, { unique: true });

module.exports = mongoose.model('MarketplaceMenuMapping', MarketplaceMenuMappingSchema);