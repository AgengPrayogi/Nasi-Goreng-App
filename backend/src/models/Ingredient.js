const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, enum: ['gram', 'ml', 'pcs'], default: 'pcs' },
    costPerUnit: { type: Number, default: 0, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes for common queries
IngredientSchema.index({ name: 1 }, { unique: true }); // Unique name lookup
IngredientSchema.index({ isActive: 1, currentStock: 1, minimumStock: 1 }); // Low stock query optimization

module.exports = mongoose.model('Ingredient', IngredientSchema);
