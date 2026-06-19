const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const budgetController = require('../controllers/budgetController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', budgetController.listBudgetsHandler);
router.post('/', budgetController.createBudgetHandler);
router.patch('/:id', budgetController.updateBudgetHandler);

module.exports = router;
