const express = require('express');
const {
  createMenuHandler,
  getAllMenusHandler,
  updateMenuHandler,
  deleteMenuHandler
} = require('../controllers/menuController');
const { validate } = require('../middlewares/validation');
const {
  createMenuSchema,
  updateMenuSchema
} = require('../validators/menuValidator');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Public endpoint for frontend: get available menus
router.get('/', getAllMenusHandler);

// Admin-only for managing menus
router.use(authenticate, requireAdmin);

router.post('/', validate(createMenuSchema), createMenuHandler);
router.patch('/:id', validate(updateMenuSchema), updateMenuHandler);
router.delete('/:id', deleteMenuHandler);

module.exports = router;
