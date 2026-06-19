const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'buyxgety'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      description: 'Percentage (1-100) or fixed amount'
    },
    applicableTo: {
      type: String,
      enum: ['all', 'menu', 'category'],
      default: 'all'
    },
    applicableMenuIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      }
    ],
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },
    maximumDiscount: {
      type: Number,
      default: null,
      description: 'Max discount amount (optional)'
    },
    validFrom: {
      type: Date,
      required: true
    },
    validTo: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);

// Indexes for common queries
PromotionSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
PromotionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Promotion', PromotionSchema);
