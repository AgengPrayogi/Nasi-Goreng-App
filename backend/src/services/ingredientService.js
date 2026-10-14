const Ingredient = require('../models/Ingredient');
const Menu = require('../models/Menu');
const { BusinessError, NotFoundError } = require('../errors/AppError');

async function createIngredient(data) {
  const {
    name,
    unit = 'pcs',
    costPerUnit = 0,
    currentStock = data.stock ?? 0,
    minimumStock = data.minStock ?? 0,
    checkFrequency = 'weekly',
    nextCheckAt = null,
    lastCheckedAt = null,
    inspectionNotes = ''
  } = data;

  const ingredient = new Ingredient({
    name: name.trim(),
    unit,
    costPerUnit,
    currentStock,
    minimumStock,
    checkFrequency,
    nextCheckAt: nextCheckAt ? new Date(nextCheckAt) : null,
    lastCheckedAt: lastCheckedAt ? new Date(lastCheckedAt) : null,
    inspectionNotes
  });

  try {
    await ingredient.save();
    return ingredient;
  } catch (err) {
    if (err.code === 11000) {
      throw new BusinessError('Ingredient with this name already exists', 'DUPLICATE_INGREDIENT');
    }
    throw err;
  }
}

async function getAllIngredients() {
  return Ingredient.find({ isActive: true }).sort({ name: 1 });
}

async function updateIngredient(id, data) {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw new NotFoundError('Ingredient');
  }

  const {
    name,
    unit,
    costPerUnit,
    currentStock = data.stock,
    minimumStock = data.minStock,
    checkFrequency,
    nextCheckAt,
    lastCheckedAt,
    inspectionNotes
  } = data;

  // INVARIANT: Cannot update currentStock directly via API
  if (currentStock !== undefined) {
    throw new BusinessError(
      'Cannot update currentStock directly. Use stock movement endpoints instead.',
      'INVALID_STOCK_UPDATE'
    );
  }

  if (name !== undefined) {
    ingredient.name = name.trim();
  }

  if (unit !== undefined) ingredient.unit = unit;
  if (costPerUnit !== undefined) ingredient.costPerUnit = costPerUnit;
  if (minimumStock !== undefined) ingredient.minimumStock = minimumStock;
  if (checkFrequency !== undefined) ingredient.checkFrequency = checkFrequency;
  if (nextCheckAt !== undefined) ingredient.nextCheckAt = nextCheckAt ? new Date(nextCheckAt) : null;
  if (lastCheckedAt !== undefined) ingredient.lastCheckedAt = lastCheckedAt ? new Date(lastCheckedAt) : null;
  if (inspectionNotes !== undefined) ingredient.inspectionNotes = inspectionNotes;

  try {
    await ingredient.save();
    return ingredient;
  } catch (err) {
    if (err.code === 11000) {
      throw new BusinessError('Ingredient with this name already exists', 'DUPLICATE_INGREDIENT');
    }
    throw err;
  }
}

async function deleteIngredient(id) {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw new NotFoundError('Ingredient');
  }

  // INVARIANT: Cannot delete ingredient if used by menu
  const menusUsingIngredient = await Menu.find({
    'ingredients.ingredient': id,
    isAvailable: true
  });

  if (menusUsingIngredient.length > 0) {
    throw new BusinessError(
      'Cannot delete ingredient: still used by active menus',
      'INGREDIENT_IN_USE'
    );
  }

  // Soft delete: set isActive to false
  ingredient.isActive = false;
  await ingredient.save();
  return ingredient;
}

async function getLowStockIngredients() {
  return Ingredient.find({
    isActive: true,
    $expr: { $lte: ['$currentStock', '$minimumStock'] }
  }).sort({ currentStock: 1 });
}

async function getIngredientReminders() {
  return Ingredient.find({
    isActive: true,
    nextCheckAt: { $lte: new Date() }
  }).sort({ nextCheckAt: 1, name: 1 });
}

module.exports = {
  createIngredient,
  getAllIngredients,
  updateIngredient,
  deleteIngredient,
  getLowStockIngredients,
  getIngredientReminders
};
