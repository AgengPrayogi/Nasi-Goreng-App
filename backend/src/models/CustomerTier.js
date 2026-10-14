const mongoose = require('mongoose');

const CustomerTierSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ['bronze', 'silver', 'gold'],
      lowercase: true,
      trim: true
    },
    name: { type: String, required: true, trim: true },
    configVersion: { type: Number, default: 2, min: 1 },
    periodDays: { type: Number, required: true, min: 1, default: 60 },
    minTotalSpent: { type: Number, required: true, min: 0 },
    minTotalOrders: { type: Number, default: 0, min: 0 },
    benefits: {
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      description: { type: String, default: '', trim: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CustomerTierSchema.index({ minTotalSpent: -1, minTotalOrders: -1 });

CustomerTierSchema.statics.ensureDefaults = async function() {
  const defaults = [
    {
      code: 'bronze',
      name: 'Bronze',
      configVersion: 2,
      periodDays: 60,
      minTotalSpent: 50000,
      minTotalOrders: 1,
      benefits: { discountPercent: 0, description: 'Standard customer benefits' }
    },
    {
      code: 'silver',
      name: 'Silver',
      configVersion: 2,
      periodDays: 60,
      minTotalSpent: 300000,
      minTotalOrders: 6,
      benefits: { discountPercent: 5, description: 'Silver customer discount' }
    },
    {
      code: 'gold',
      name: 'Gold',
      configVersion: 2,
      periodDays: 60,
      minTotalSpent: 700000,
      minTotalOrders: 12,
      benefits: { discountPercent: 10, description: 'Gold customer discount' }
    }
  ];

  for (const tier of defaults) {
    const existing = await this.findOne({ code: tier.code });
    if (!existing) {
      await this.create(tier);
    } else if (existing.configVersion !== 2) {
      await this.updateOne({ _id: existing._id }, { $set: tier });
    }
  }
};

module.exports = mongoose.model('CustomerTier', CustomerTierSchema);