const mongoose = require('mongoose');

const MenuIngredientSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const MenuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    ingredients: { type: [MenuIngredientSchema], default: [] },
    costPrice: { type: Number, default: 0, min: 0 },
    overheadAllocation: { type: Number, default: 0, min: 0 },
    profitMargin: { type: Number, default: 0 },
    foodCostPercent: { type: Number, default: 0 },
    lastCostUpdate: { type: Date, required: false }
  },
  { timestamps: true }
);

// Indexes for common queries
MenuSchema.index({ isAvailable: 1, name: 1 }); // Filter available menus, sorted by name
MenuSchema.index({ 'ingredients.ingredient': 1 }); // Find menus by ingredient

module.exports = mongoose.model('Menu', MenuSchema);
