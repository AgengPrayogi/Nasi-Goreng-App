const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
} = require('../services/supplierService');

/**
 * Create supplier
 * POST /api/suppliers
 */
async function createSupplierHandler(req, res, next) {
  try {
    const { name, contact, email, phone, address, leadTime, paymentTerms, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const supplier = await createSupplier({
      name,
      contact,
      email,
      phone,
      address,
      leadTime,
      paymentTerms,
      notes
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all suppliers
 * GET /api/suppliers?isActive=true&page=1&limit=20
 */
async function getAllSuppliersHandler(req, res, next) {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (isActive) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    const result = await getAllSuppliers(filters, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get supplier by ID
 * GET /api/suppliers/:id
 */
async function getSupplierHandler(req, res, next) {
  try {
    const { id } = req.params;
    const supplier = await getSupplierById(id);

    res.json({
      success: true,
      data: supplier
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update supplier
 * PATCH /api/suppliers/:id
 */
async function updateSupplierHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { name, contact, email, phone, address, leadTime, paymentTerms, notes, isActive } = req.body;

    const supplier = await updateSupplier(id, {
      name,
      contact,
      email,
      phone,
      address,
      leadTime,
      paymentTerms,
      notes,
      isActive
    });

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete supplier (soft delete)
 * DELETE /api/suppliers/:id
 */
async function deleteSupplierHandler(req, res, next) {
  try {
    const { id } = req.params;
    const supplier = await deleteSupplier(id);

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSupplierHandler,
  getAllSuppliersHandler,
  getSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler
};
