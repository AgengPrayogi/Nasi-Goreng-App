const Menu = require('../models/Menu');
const Ingredient = require('../models/Ingredient');
const { BusinessError, NotFoundError } = require('../errors/AppError');

async function createMenu(data) {
  const { name, price, description = '', imageUrl = '', ingredients = [], isAvailable = true } = data;

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
    isAvailable
  });

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
  deleteMenu
};
