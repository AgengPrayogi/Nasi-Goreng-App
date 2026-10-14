const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, enum: ['gram', 'ml', 'pcs', 'kg'], default: 'pcs' },
    costPerUnit: { type: Number, default: 0, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 0, min: 0 },
    checkFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], default: 'weekly' },
    nextCheckAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    inspectionNotes: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

IngredientSchema.virtual('stock').get(function() {
  return this.currentStock;
}).set(function(value) {
  this.currentStock = value;
});

IngredientSchema.virtual('minStock').get(function() {
  return this.minimumStock;
}).set(function(value) {
  this.minimumStock = value;
});

IngredientSchema.set('toJSON', { virtuals: true, versionKey: false });
IngredientSchema.set('toObject', { virtuals: true, versionKey: false });

// Indexes for common queries
IngredientSchema.index({ name: 1 }, { unique: true }); // Unique name lookup
IngredientSchema.index({ isActive: 1, currentStock: 1, minimumStock: 1 }); // Low stock query optimization

module.exports = mongoose.model('Ingredient', IngredientSchema);
