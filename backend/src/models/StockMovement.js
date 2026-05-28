const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    changeAmount: { type: Number, required: true },
    reason: { type: String, required: true, enum: ['order', 'restock', 'adjustment'] },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
  },
  { timestamps: true }
);

// Indexes for common queries
StockMovementSchema.index({ ingredient: 1, createdAt: -1 }); // Ingredient history sorted by date
StockMovementSchema.index({ order: 1 }); // Find movements by order
StockMovementSchema.index({ reason: 1, createdAt: -1 }); // Filter by reason type

module.exports = mongoose.model('StockMovement', StockMovementSchema);
