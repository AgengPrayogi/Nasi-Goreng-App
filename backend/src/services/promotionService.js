const Promotion = require('../models/Promotion');
const PromoCode = require('../models/PromoCode');
const { AppError, BusinessError } = require('../errors/AppError');
const crypto = require('crypto');

/**
 * Create promotion
 */
async function createPromotion(data) {
  const {
    name,
    description,
    type,
    discountValue,
    applicableTo,
    applicableMenuIds,
    minimumOrderValue,
    maximumDiscount,
    validFrom,
    validTo,
    notes
  } = data;

  if (new Date(validTo) <= new Date(validFrom)) {
    throw new BusinessError('validTo must be after validFrom', 'INVALID_DATE_RANGE');
  }

  const promotion = await Promotion.create({
    name,
    description: description || '',
    type,
    discountValue,
    applicableTo: applicableTo || 'all',
    applicableMenuIds: applicableMenuIds || [],
    minimumOrderValue: minimumOrderValue || 0,
    maximumDiscount,
    validFrom,
    validTo,
    notes: notes || '',
    isActive: true
  });

  return promotion.toObject();
}

/**
 * Get all active promotions
 */
async function getActivePromotions(limit = 50) {
  const now = new Date();
  const promotions = await Promotion.find({
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now }
  })
    .limit(limit)
    .lean();

  return promotions;
}

/**
 * Get promotion by ID
 */
async function getPromotionById(promotionId) {
  const promotion = await Promotion.findById(promotionId);
  if (!promotion) {
    throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
  }
  return promotion.toObject();
}

/**
 * Generate promo codes for a promotion
 */
async function generatePromoCodes(promotionId, count = 1, prefix = '') {
  const promotion = await getPromotionById(promotionId);

  const codes = [];
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique code
    do {
      const random = crypto.randomBytes(4).toString('hex').toUpperCase();
      code = prefix ? `${prefix}${random}` : `PROMO${random}`;
      attempts++;

      if (attempts >= maxAttempts) {
        throw new AppError('Failed to generate unique code', 500, 'CODE_GENERATION_ERROR');
      }
    } while (await PromoCode.findOne({ code }));

    const promoCode = await PromoCode.create({
      code,
      promotionId,
      maxUse: -1, // unlimited
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      isActive: true
    });

    codes.push(promoCode.toObject());
  }

  return codes;
}

/**
 * Validate and get promo code details
 */
async function validatePromoCode(code) {
  const now = new Date();

  const promoCode = await PromoCode.findOne({ code, isActive: true })
    .populate('promotionId');

  if (!promoCode) {
    throw new BusinessError('Invalid promo code', 'INVALID_PROMO_CODE');
  }

  const promotion = promoCode.promotionId;

  // Check if promotion is active
  if (!promotion.isActive) {
    throw new BusinessError('Promo code is expired', 'PROMO_EXPIRED');
  }

  // Check dates
  if (now < promotion.validFrom || now > promotion.validTo) {
    throw new BusinessError('Promo code is not valid for this period', 'PROMO_OUT_OF_RANGE');
  }

  // Check usage limit
  if (promoCode.maxUse !== -1 && promoCode.usedCount >= promoCode.maxUse) {
    throw new BusinessError('Promo code usage limit reached', 'PROMO_LIMIT_REACHED');
  }

  return {
    code: promoCode.code,
    promotion: {
      name: promotion.name,
      type: promotion.type,
      discountValue: promotion.discountValue,
      minimumOrderValue: promotion.minimumOrderValue,
      maximumDiscount: promotion.maximumDiscount
    }
  };
}

/**
 * Calculate discount for order
 */
async function calculateDiscount(promoCode, orderAmount, orderItems) {
  const promo = await validatePromoCode(promoCode);
  const promotion = promo.promotion;

  // Check minimum order value
  if (orderAmount < promotion.minimumOrderValue) {
    throw new BusinessError(
      `Minimum order value is Rp ${promotion.minimumOrderValue}`,
      'MINIMUM_ORDER_NOT_MET'
    );
  }

  let discountAmount = 0;

  if (promotion.type === 'percentage') {
    discountAmount = (orderAmount * promotion.discountValue) / 100;
  } else if (promotion.type === 'fixed') {
    discountAmount = promotion.discountValue;
  }

  // Apply maximum discount limit
  if (promotion.maximumDiscount && discountAmount > promotion.maximumDiscount) {
    discountAmount = promotion.maximumDiscount;
  }

  return {
    discountAmount: Math.round(discountAmount),
    discountPercentage: ((discountAmount / orderAmount) * 100).toFixed(2),
    finalAmount: Math.round(orderAmount - discountAmount)
  };
}

/**
 * Record promo code usage
 */
async function recordPromoCodeUsage(code) {
  const promoCode = await PromoCode.findOne({ code });
  if (promoCode) {
    promoCode.usedCount += 1;
    await promoCode.save();
  }
}

/**
 * Get promotion performance
 */
async function getPromotionPerformance(promotionId, from = null, to = null) {
  const Order = require('../models/Order');

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }

  const matchStage = {
    promoCodeUsed: { $ne: '' }
  };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const stats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$promoCodeUsed',
        usageCount: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' },
        totalRevenue: { $sum: '$amountAfterDiscount' }
      }
    },
    { $sort: { usageCount: -1 } }
  ]);

  return stats;
}

module.exports = {
  createPromotion,
  getActivePromotions,
  getPromotionById,
  generatePromoCodes,
  validatePromoCode,
  calculateDiscount,
  recordPromoCodeUsage,
  getPromotionPerformance
};
