const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['low_stock', 'new_order', 'payment_received', 'order_ready', 'system', 'kitchen_bottleneck'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    read: { type: Boolean, default: false },
    readAt: { type: Date, required: false },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    relatedIngredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: false },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

NotificationSchema.index({ read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
