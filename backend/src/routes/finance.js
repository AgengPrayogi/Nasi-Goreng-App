const express = require('express');
const {
  createTransaction,
  listTransactions,
  getFinanceSummary,
} = require('../controllers/financeController');
const { validate } = require('../middlewares/validation');
const { createTransactionSchema } = require('../validators/financeValidator');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.post('/', validate(createTransactionSchema), createTransaction);
router.get('/', listTransactions);
router.get('/summary', getFinanceSummary);

module.exports = router;