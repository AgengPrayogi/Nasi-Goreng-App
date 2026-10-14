const mongoose = require('mongoose');

const CustomerTierHistorySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    previousTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'corporate', null],
      default: null
    },
    newTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'corporate', null],
      default: null
    },
    evaluatedAt: { type: Date, default: Date.now, index: true },
    reason: { type: String, required: true, trim: true },
    periodSpent: { type: Number, required: true, min: 0 },
    periodOrders: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

CustomerTierHistorySchema.index({ customerId: 1, evaluatedAt: -1 });

module.exports = mongoose.model('CustomerTierHistory', CustomerTierHistorySchema);