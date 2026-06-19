const {
  createIngredient,
  getAllIngredients,
  updateIngredient,
  deleteIngredient,
  getLowStockIngredients
} = require('../services/ingredientService');
const Ingredient = require('../models/Ingredient');
const { NotFoundError } = require('../errors/AppError');

async function createIngredientHandler(req, res, next) {
  try {
    const ingredient = await createIngredient(req.body);
    res.status(201).json({ data: ingredient });
  } catch (err) {
    next(err);
  }
}

  async function getAllIngredientsHandler(req, res, next) {
    try {
      const ingredients = await getAllIngredients();
      res.json({ data: ingredients });
    } catch (err) {
      next(err);
    }
  }

  // Handler to fetch a single ingredient by its ID (admin only)
  async function getIngredientByIdHandler(req, res, next) {
    try {
      const { id } = req.params;
      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        throw new NotFoundError('Ingredient');
      }
      res.json({ data: ingredient });
    } catch (err) {
      next(err);
    }
  }

async function updateIngredientHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ingredient = await updateIngredient(id, req.body);
    res.json({ data: ingredient });
  } catch (err) {
    next(err);
  }
}

async function deleteIngredientHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ingredient = await deleteIngredient(id);
    res.json({ data: ingredient, message: 'Ingredient deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function getLowStockIngredientsHandler(req, res, next) {
  try {
    const ingredients = await getLowStockIngredients();
    res.json({ data: ingredients });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIngredientHandler,
  getAllIngredientsHandler,
    getIngredientByIdHandler,
  updateIngredientHandler,
  deleteIngredientHandler,
  getLowStockIngredientsHandler
};
