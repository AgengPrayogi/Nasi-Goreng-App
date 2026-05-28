const Ingredient = require('../models/Ingredient');
const StockMovement = require('../models/StockMovement');
const { BusinessError, NotFoundError } = require('../errors/AppError');

async function restockIngredient({ ingredientId, amount }) {
  if (amount <= 0) {
    throw new BusinessError('Restock amount must be greater than 0', 'INVALID_RESTOCK_AMOUNT');
  }

  const ingredient = await Ingredient.findByIdAndUpdate(
    ingredientId,
    { $inc: { currentStock: amount } },
    { new: true }
  );

  if (!ingredient) {
    throw new NotFoundError('Ingredient');
  }

  await StockMovement.create({
    ingredient: ingredient._id,
    changeAmount: amount,
    reason: 'restock'
  });

  return ingredient;
}

async function adjustIngredientStock({ ingredientId, amount }) {
  if (amount === 0) {
    throw new BusinessError('Adjustment amount cannot be 0', 'INVALID_ADJUSTMENT_AMOUNT');
  }

  // If adjustment is negative, ensure stock doesn't go below zero.
  const query =
    amount < 0
      ? { _id: ingredientId, currentStock: { $gte: Math.abs(amount) } }
      : { _id: ingredientId };

  const ingredient = await Ingredient.findOneAndUpdate(
    query,
    { $inc: { currentStock: amount } },
    { new: true }
  );

  if (!ingredient) {
    throw new BusinessError(
      'Insufficient stock for this adjustment or ingredient not found',
      'INVALID_STOCK_ADJUSTMENT'
    );
  }

  await StockMovement.create({
    ingredient: ingredient._id,
    changeAmount: amount,
    reason: 'adjustment'
  });

  return ingredient;
}

module.exports = {
  restockIngredient,
  adjustIngredientStock
};

