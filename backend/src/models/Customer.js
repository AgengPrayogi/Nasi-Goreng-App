const mongoose = require('mongoose');

const WhatsAppConsentCategorySchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  source: {
    type: String,
    enum: ['order_checkout', 'reservation_form', 'customer_request', 'inbound_whatsapp'],
    required: false
  },
  textVersion: { type: String, default: '', trim: true },
  consentedAt: { type: Date, required: false },
  optedOutAt: { type: Date, required: false }
}, { _id: false });

const CustomerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'corporate', null],
      default: null
    },
    customerType: {
      type: String,
      enum: ['individual', 'corporate'],
      default: 'individual'
    },
    audienceSegment: {
      type: String,
      enum: ['individual', 'family', 'organization'],
      default: 'individual',
      index: true
    },
    householdSize: {
      type: Number,
      min: 1,
      required: false
    },
    organizationName: {
      type: String,
      default: '',
      trim: true
    },
    customerTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerTier',
      required: false
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }
    ],
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lastOrderDate: {
      type: Date,
      required: false
    },
    periodSpent: { type: Number, default: 0, min: 0 },
    periodOrders: { type: Number, default: 0, min: 0 },
    periodStartDate: { type: Date, required: false },
    tierUpdatedAt: { type: Date, required: false },
    tierEvaluationFailures: { type: Number, default: 0, min: 0 },
    preferredItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      }
    ],
    whatsappConsent: {
      utility: { type: WhatsAppConsentCategorySchema, default: () => ({}) },
      marketing: { type: WhatsAppConsentCategorySchema, default: () => ({}) }
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for common queries
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ tier: 1 });
CustomerSchema.index({ totalSpent: -1 });
CustomerSchema.index({ lastOrderDate: -1 });
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ orderIds: 1 });
CustomerSchema.index({ customerType: 1, isActive: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
