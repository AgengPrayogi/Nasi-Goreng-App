const express = require('express');
const {
  restockIngredientHandler,
  adjustIngredientStockHandler
} = require('../controllers/stockMovementController');
const { validate } = require('../middlewares/validation');
const { restockSchema, adjustmentSchema } = require('../validators/stockMovementValidator');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Admin-only: stock operations
router.use(authenticate, requireAdmin);

router.post('/restock', validate(restockSchema), restockIngredientHandler);
router.post('/adjustment', validate(adjustmentSchema), adjustIngredientStockHandler);

module.exports = router;

