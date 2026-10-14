const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    menu: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^NGP-\d{8}-[A-F0-9]{6}$/
    },
    feedbackTokenHash: { type: String, default: '', select: false },
    channel: {
      type: String,
      enum: ['dine_in', 'online', 'marketplace'],
      default: 'dine_in'
    },
    fulfillmentType: { type: String, enum: ['dine_in', 'takeaway', 'delivery'], default: 'dine_in' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: false },
    tableNumber: { type: String, default: '', trim: true },
    deliveryAddress: { type: String, default: '', trim: true },
    deliveryNotes: { type: String, default: '', trim: true },
    marketplacePlatform: { type: String, enum: ['grabfood', 'gofood', 'shopeefood', 'other'], required: false },
    externalOrderId: { type: String, trim: true, required: false },
    marketplaceCommission: { type: Number, default: 0, min: 0 },
    marketplaceNetSettlement: { type: Number, default: 0, min: 0 },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },
    queueDate: { type: String, default: '', trim: true },
    queueNumber: { type: Number, min: 0, default: 0 },
    kitchenStatus: {
      type: String,
      enum: ['none', 'queued', 'preparing', 'ready', 'served'],
      default: 'none'
    },
    estimatedReadyAt: { type: Date, required: false },
    readyAt: { type: Date, required: false },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'qris_static'],
      trim: true,
      required: false
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'refunded'],
      default: 'unpaid'
    },
    externalPaymentId: { type: String, trim: true, required: false },
    paymentReference: { type: String, trim: true, required: false },
    paidAt: { type: Date, required: false },
    items: { type: [OrderItemSchema], default: [] },
    totalAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'confirmed', 'completed', 'cancelled']
    },
    notes: { type: String, default: '' },
    // Phase 1 - Staff tracking
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: false },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: false },
    // Phase 1 - Customer CRM
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
    // Phase 1 - Discounts & Promotions
    promoCodeUsed: { type: String, default: '', trim: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: false },
    promoAudienceSegment: { type: String, enum: ['individual', 'family', 'organization'], required: false },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    amountAfterDiscount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Indexes for common queries (orderCode unique index comes from field `unique: true`)
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'items.menu': 1 });
OrderSchema.index({ queueDate: 1, queueNumber: 1 });
OrderSchema.index({ queueDate: 1, kitchenStatus: 1, status: 1 });
OrderSchema.index({ channel: 1, status: 1 });
OrderSchema.index({ tableId: 1, status: 1 });
OrderSchema.index({ marketplacePlatform: 1, externalOrderId: 1 }, { sparse: true, unique: true });
OrderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
// Staff tracking indexes
OrderSchema.index({ confirmedBy: 1, createdAt: -1 });
OrderSchema.index({ completedBy: 1, createdAt: -1 });
OrderSchema.index({ modifiedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
