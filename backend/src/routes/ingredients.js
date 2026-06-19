const express = require('express');
const {
  createIngredientHandler,
  getAllIngredientsHandler,
  getIngredientByIdHandler,
  updateIngredientHandler,
  deleteIngredientHandler,
  getLowStockIngredientsHandler
} = require('../controllers/ingredientController');
const { validate } = require('../middlewares/validation');
const {
  createIngredientSchema,
  updateIngredientSchema
} = require('../validators/ingredientValidator');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All ingredient endpoints are admin-only
router.use(authenticate, requireAdmin);

router.post('/', validate(createIngredientSchema), createIngredientHandler);
router.get('/', getAllIngredientsHandler);
// Low stock endpoint should be defined before the generic :id route to avoid route shadowing
router.get('/low-stock', getLowStockIngredientsHandler);
// New endpoint: fetch a single ingredient by ID (admin only)
router.get('/:id', getIngredientByIdHandler);
router.patch('/:id', validate(updateIngredientSchema), updateIngredientHandler);
router.delete('/:id', deleteIngredientHandler);

module.exports = router;
