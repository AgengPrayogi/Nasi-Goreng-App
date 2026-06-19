const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['discount', 'promotion', 'seasonal', 'loyalty', 'referral', 'holiday'],
    default: 'promotion'
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  targetSegment: {
    customerTiers: [{ type: String, enum: ['bronze', 'silver', 'gold'] }],
    minOrders: { type: Number, default: 0 },
    minSpent: { type: Number, default: 0 },
    customFilter: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  discountConfig: {
    type: { type: String, enum: ['percentage', 'fixed', 'buy_x_get_y'], default: 'percentage' },
    value: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    applicableMenus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }]
  },
  budget: { type: Number, default: 0 },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    redemptions: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
    costIncurred: { type: Number, default: 0 },
    newCustomersAcquired: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

CampaignSchema.index({ status: 1, startDate: 1 });
CampaignSchema.index({ type: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);