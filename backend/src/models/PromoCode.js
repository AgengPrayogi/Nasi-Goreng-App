const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      required: true
    },
    maxUse: {
      type: Number,
      default: -1,
      description: '-1 = unlimited'
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    validFrom: {
      type: Date,
      required: false
    },
    validTo: {
      type: Date,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for quick code lookup
PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ promotionId: 1 });
PromoCodeSchema.index({ isActive: 1 });

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
