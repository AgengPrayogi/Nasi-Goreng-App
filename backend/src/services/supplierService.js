const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Ingredient = require('../models/Ingredient');
const { AppError, BusinessError } = require('../errors/AppError');

/**
 * Create supplier
 */
async function createSupplier(data) {
  const { name, contact, email, phone, address, leadTime, paymentTerms, notes } = data;

  const existing = await Supplier.findOne({ name });
  if (existing) {
    throw new BusinessError('Supplier with this name already exists', 'SUPPLIER_EXISTS');
  }

  const supplier = await Supplier.create({
    name,
    contact: contact || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    leadTime: leadTime || 1,
    paymentTerms: paymentTerms || '',
    notes: notes || '',
    isActive: true
  });

  return supplier.toObject();
}

/**
 * Get all suppliers
 */
async function getAllSuppliers(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const query = {};
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { contact: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Supplier.countDocuments(query)
  ]);

  return {
    data: suppliers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

/**
 * Get supplier by ID
 */
async function getSupplierById(supplierId) {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  }
  return supplier.toObject();
}

/**
 * Update supplier
 */
async function updateSupplier(supplierId, data) {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  }

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.contact !== undefined) updates.contact = data.contact;
  if (data.email !== undefined) updates.email = data.email;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.address !== undefined) updates.address = data.address;
  if (data.leadTime !== undefined) updates.leadTime = data.leadTime;
  if (data.paymentTerms !== undefined) updates.paymentTerms = data.paymentTerms;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  const updated = await Supplier.findByIdAndUpdate(supplierId, updates, { new: true });
  return updated.toObject();
}

/**
 * Delete supplier (soft delete)
 */
async function deleteSupplier(supplierId) {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  }

  supplier.isActive = false;
  await supplier.save();
  return supplier.toObject();
}

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
};
