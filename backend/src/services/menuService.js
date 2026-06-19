const Menu = require('../models/Menu');
const Ingredient = require('../models/Ingredient');
const { BusinessError, NotFoundError } = require('../errors/AppError');

function applyMenuCostMetrics(menu) {
  const price = Number(menu.price || 0);
  const costPrice = Number(menu.costPrice || 0);
  menu.profitMargin = price > 0 ? Math.round(((price - costPrice) / price) * 10000) / 100 : 0;
  menu.foodCostPercent = price > 0 ? Math.round((costPrice / price) * 10000) / 100 : 0;
  menu.lastCostUpdate = new Date();
}

async function calculateIngredientCost(ingredients = []) {
  if (!ingredients.length) return 0;

  const ingredientIds = ingredients.map((ing) => ing.ingredient).filter(Boolean);
  const records = await Ingredient.find({ _id: { $in: ingredientIds }, isActive: true })
    .select('costPerUnit')
    .lean();
  const costMap = new Map(records.map((ing) => [ing._id.toString(), Number(ing.costPerUnit || 0)]));

  return ingredients.reduce((sum, ing) => {
    const unitCost = costMap.get(ing.ingredient.toString()) || 0;
    return sum + (Number(ing.quantity || 0) * unitCost);
  }, 0);
}

async function createMenu(data) {
  const {
    name,
    price,
    description = '',
    imageUrl = '',
    ingredients = [],
    isAvailable = true,
    overheadAllocation = 0
  } = data;

  // Validate all ingredients exist and are active
  if (ingredients && ingredients.length > 0) {
    const ingredientIds = ingredients.map(ing => ing.ingredient).filter(Boolean);
    
    if (ingredientIds.length > 0) {
      const existingIngredients = await Ingredient.find({
        _id: { $in: ingredientIds },
        isActive: true
      });

      if (existingIngredients.length !== ingredientIds.length) {
        throw new BusinessError(
          'One or more ingredients do not exist or are inactive',
          'INVALID_INGREDIENTS'
        );
      }
    }
  }

  const menu = new Menu({
    name: name.trim(),
    price,
    description,
    imageUrl,
    ingredients,
    isAvailable,
    costPrice: data.costPrice !== undefined ? data.costPrice : await calculateIngredientCost(ingredients),
    overheadAllocation
  });
  applyMenuCostMetrics(menu);

  // INVARIANT: Cannot set isAvailable=true if any ingredient has currentStock <= 0
  if (isAvailable && ingredients.length > 0) {
    const ingredientIds = ingredients.map(ing => ing.ingredient).filter(Boolean);
    if (ingredientIds.length > 0) {
      const ingredientStocks = await Ingredient.find({
        _id: { $in: ingredientIds },
        isActive: true
      }).select('name currentStock');

      const outOfStock = ingredientStocks.filter(ing => ing.currentStock <= 0);
      if (outOfStock.length > 0) {
        throw new BusinessError(
          `Cannot set menu as available: ingredients out of stock: ${outOfStock.map(i => i.name).join(', ')}`,
          'INGREDIENTS_OUT_OF_STOCK'
        );
      }
    }
  }

  await menu.save();
  return menu;
}

async function getAllMenus() {
  // Public endpoint: return only available menus, sorted by name
  return Menu.find({ isAvailable: true }).sort({ name: 1 });
}

async function updateMenu(id, data) {
  const menu = await Menu.findById(id);
  if (!menu) {
    throw new NotFoundError('Menu');
  }

  const { name, price, description, imageUrl, ingredients, isAvailable } = data;

  if (name !== undefined) {
    menu.name = name.trim();
  }

  if (price !== undefined) {
    menu.price = price;
  }

  if (description !== undefined) menu.description = description;
  if (imageUrl !== undefined) menu.imageUrl = imageUrl;
  if (data.overheadAllocation !== undefined) menu.overheadAllocation = data.overheadAllocation;

  // Validate ingredients if provided
  if (ingredients !== undefined) {
    if (ingredients.length > 0) {
      const ingredientIds = ingredients.map(ing => ing.ingredient).filter(Boolean);
      
      const existingIngredients = await Ingredient.find({
        _id: { $in: ingredientIds },
        isActive: true
      });

      if (existingIngredients.length !== ingredientIds.length) {
        throw new BusinessError(
          'One or more ingredients do not exist or are inactive',
          'INVALID_INGREDIENTS'
        );
      }
    }
    menu.ingredients = ingredients;
  }

  if (data.costPrice !== undefined) {
    menu.costPrice = data.costPrice;
  } else if (ingredients !== undefined) {
    menu.costPrice = await calculateIngredientCost(menu.ingredients);
  }

  // INVARIANT: Cannot set isAvailable=true if any ingredient has currentStock <= 0
  if (isAvailable !== undefined) {
    const finalIngredients = menu.ingredients || [];
    if (isAvailable && finalIngredients.length > 0) {
      const ingredientIds = finalIngredients.map(ing => ing.ingredient).filter(Boolean);
      if (ingredientIds.length > 0) {
        const ingredientStocks = await Ingredient.find({
          _id: { $in: ingredientIds },
          isActive: true
        }).select('name currentStock');

        const outOfStock = ingredientStocks.filter(ing => ing.currentStock <= 0);
        if (outOfStock.length > 0) {
          throw new BusinessError(
            `Cannot set menu as available: ingredients out of stock: ${outOfStock.map(i => i.name).join(', ')}`,
            'INGREDIENTS_OUT_OF_STOCK'
          );
        }
      }
    }
    menu.isAvailable = isAvailable;
  }

  applyMenuCostMetrics(menu);
  await menu.save();
  return menu;
}

async function deleteMenu(id) {
  const menu = await Menu.findById(id);
  if (!menu) {
    throw new NotFoundError('Menu');
  }

  // Soft delete: set isAvailable to false
  menu.isAvailable = false;
  await menu.save();
  return menu;
}

module.exports = {
  createMenu,
  getAllMenus,
  updateMenu,
  deleteMenu,
  calculateIngredientCost,
  applyMenuCostMetrics
};
