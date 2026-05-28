const {
  restockIngredient,
  adjustIngredientStock
} = require('../services/stockMovementService');

async function restockIngredientHandler(req, res, next) {
  try {
    const ingredient = await restockIngredient({
      ingredientId: req.body.ingredientId,
      amount: req.body.amount
    });

    res.status(200).json({ data: ingredient });
  } catch (err) {
    next(err);
  }
}

async function adjustIngredientStockHandler(req, res, next) {
  try {
    const ingredient = await adjustIngredientStock({
      ingredientId: req.body.ingredientId,
      amount: req.body.amount
    });

    res.status(200).json({ data: ingredient });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  restockIngredientHandler,
  adjustIngredientStockHandler
};

