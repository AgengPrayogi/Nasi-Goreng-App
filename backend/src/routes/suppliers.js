const express = require('express');
const {
  createSupplierHandler,
  getAllSuppliersHandler,
  getSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler
} = require('../controllers/supplierController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// All supplier routes require admin auth
router.use(authenticate, requireAdmin);

// Create supplier
router.post('/', createSupplierHandler);

// Get all suppliers
router.get('/', getAllSuppliersHandler);

// Get supplier by ID
router.get('/:id', getSupplierHandler);

// Update supplier
router.patch('/:id', updateSupplierHandler);

// Delete supplier
router.delete('/:id', deleteSupplierHandler);

module.exports = router;
