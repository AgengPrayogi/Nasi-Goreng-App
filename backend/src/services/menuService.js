const Menu = require('../models/Menu');
const Ingredient = require('../models/Ingredient');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const MenuReview = require('../models/MenuReview');
const { AppError, BusinessError, NotFoundError } = require('../errors/AppError');

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

async function validateIngredientReferences(ingredients = [], recipe = null) {
  const ids = [...ingredients.map((ing) => ing.ingredient).filter(Boolean)];

  if (recipe?.portionSizes?.length) {
    for (const portion of recipe.portionSizes) {
      if (portion.ingredients?.length) {
        ids.push(...portion.ingredients.map((ing) => ing.ingredient).filter(Boolean));
      }
    }
  }

  if (!ids.length) return;

  const uniqueIds = [...new Set(ids.map((id) => id.toString()))];
  const existingIngredients = await Ingredient.find({
    _id: { $in: uniqueIds },
    isActive: true
  });

  if (existingIngredients.length !== uniqueIds.length) {
    throw new BusinessError(
      'One or more ingredients do not exist or are inactive',
      'INVALID_INGREDIENTS'
    );
  }
}

async function createMenu(data) {
  const {
    name,
    price,
    description = '',
    imageUrl = '',
    ingredients = [],
    recipe = null,
    isAvailable = true,
    overheadAllocation = 0
  } = data;

  await validateIngredientReferences(ingredients, recipe);

  const menu = new Menu({
    name: name.trim(),
    price,
    description,
    imageUrl,
    ingredients,
    recipe,
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

  const { name, price, description, imageUrl, ingredients, recipe, isAvailable } = data;

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
    await validateIngredientReferences(ingredients, recipe ?? menu.recipe);
    menu.ingredients = ingredients;
  }

  if (recipe !== undefined) {
    await validateIngredientReferences(menu.ingredients || [], recipe);
    menu.recipe = recipe;
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

async function createMenuReview(menuId, payload = {}) {
  const { customerId, orderCode, rating, comment = '' } = payload;

  if (!customerId || !orderCode || rating === undefined) {
    throw new BusinessError('Customer, order code, and rating are required', 'INVALID_MENU_REVIEW');
  }

  const menu = await Menu.findById(menuId);
  if (!menu) {
    throw new NotFoundError('Menu');
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const normalizedRating = Number(rating);
  if (Number.isNaN(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new BusinessError('Rating must be between 1 and 5', 'INVALID_MENU_RATING');
  }

  const order = await Order.findOne({
    orderCode: String(orderCode).trim().toUpperCase(),
    customerId: customer._id,
    status: 'completed'
  }).lean();

  if (!order) {
    throw new BusinessError('A verified completed order is required before posting a menu review', 'INVALID_REVIEW_ORDER');
  }

  const isMenuInOrder = Array.isArray(order.items) && order.items.some((item) => String(item.menu) === String(menuId));
  if (!isMenuInOrder) {
    throw new BusinessError('This menu item was not included in the completed order', 'INVALID_REVIEW_ORDER');
  }

  const existing = await MenuReview.findOne({ menu: menuId, customer: customerId });
  if (existing) {
    throw new AppError('You have already reviewed this menu', 409, 'DUPLICATE_MENU_REVIEW');
  }

  const review = await MenuReview.create({
    menu: menuId,
    customer: customerId,
    order: order._id,
    orderCode: String(orderCode).trim().toUpperCase(),
    rating: normalizedRating,
    comment: String(comment || '').trim(),
    status: 'approved',
    isVerified: true
  });

  return review.toObject();
}

async function getMenuReviews(menuId) {
  const menu = await Menu.findById(menuId);
  if (!menu) {
    throw new NotFoundError('Menu');
  }

  const reviews = await MenuReview.find({ menu: menuId, status: 'approved' })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .lean();

  return reviews;
}

module.exports = {
  createMenu,
  getAllMenus,
  updateMenu,
  deleteMenu,
  createMenuReview,
  getMenuReviews,
  calculateIngredientCost,
  applyMenuCostMetrics
};
