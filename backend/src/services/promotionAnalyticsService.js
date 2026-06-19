const Order = require('../models/Order');
const Promotion = require('../models/Promotion');
const PromoCode = require('../models/PromoCode');
const Campaign = require('../models/Campaign');

function getDateRange(query = {}, defaultDays = 30) {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.setDate(now.getDate() - defaultDays + 1));
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

async function getPromotionPerformance(promotionId) {
  const promotion = await Promotion.findById(promotionId).lean();
  if (!promotion) return null;

  const orders = await Order.find({
    status: 'completed',
    $or: [
      { promoCodeUsed: { $ne: '' } },
      { discountAmount: { $gt: 0 } }
    ],
    createdAt: { $gte: promotion.validFrom, $lte: promotion.validTo }
  }).select('totalAmount discountAmount amountAfterDiscount customerId createdAt promoCodeUsed').lean();

  const totalRevenue = orders.reduce((s, o) => s + (o.amountAfterDiscount || o.totalAmount), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const uniqueCustomers = new Set(orders.filter((o) => o.customerId).map((o) => o.customerId.toString())).size;

  const promoCodes = await PromoCode.find({ promotionId }).lean();
  const totalRedemptions = promoCodes.reduce((s, c) => s + (c.usedCount || 0), 0);

  return {
    promotion,
    metrics: {
      orderCount: orders.length,
      totalRevenue,
      totalDiscount,
      netRevenue: totalRevenue,
      avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
      uniqueCustomers,
      redemptionRate: promoCodes.length
        ? Math.round((totalRedemptions / promoCodes.reduce((s, c) => s + (c.maxUse || 1), 0)) * 10000) / 100
        : 0,
      roi: totalDiscount > 0 ? Math.round(((totalRevenue - totalDiscount) / totalDiscount) * 100) / 100 : 0,
      costPerAcquisition: uniqueCustomers > 0 ? Math.round(totalDiscount / uniqueCustomers) : 0
    },
    promoCodes: promoCodes.length
  };
}

async function getCampaignPerformance() {
  const campaigns = await Campaign.find().sort({ startDate: -1 }).limit(50).lean();

  return campaigns.map((c) => {
    const roi = c.metrics.costIncurred > 0
      ? Math.round(((c.metrics.revenueGenerated - c.metrics.costIncurred) / c.metrics.costIncurred) * 10000) / 100
      : 0;
    const conversionRate = c.metrics.impressions > 0
      ? Math.round((c.metrics.redemptions / c.metrics.impressions) * 10000) / 100
      : 0;

    return {
      campaignId: c._id,
      name: c.name,
      type: c.type,
      status: c.status,
      period: { startDate: c.startDate, endDate: c.endDate },
      metrics: { ...c.metrics, roi, conversionRate },
      budget: c.budget,
      budgetUsed: c.metrics.costIncurred,
      budgetRemaining: Math.max(0, c.budget - c.metrics.costIncurred)
    };
  });
}

async function getDiscountAnalysis(query = {}) {
  const { from, to } = getDateRange(query);

  const [withDiscount, withoutDiscount, dailyTrend] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to }, discountAmount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$amountAfterDiscount' },
          totalDiscount: { $sum: '$discountAmount' },
          avgDiscount: { $avg: '$discountAmount' }
        }
      }
    ]),
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to }, $or: [{ discountAmount: 0 }, { discountAmount: { $exists: false } }] } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]),
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orderCount: { $sum: 1 },
          totalDiscount: { $sum: '$discountAmount' },
          discountedOrders: { $sum: { $cond: [{ $gt: ['$discountAmount', 0] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const discounted = withDiscount[0] || { orderCount: 0, totalRevenue: 0, totalDiscount: 0, avgDiscount: 0 };
  const fullPrice = withoutDiscount[0] || { orderCount: 0, totalRevenue: 0 };
  const totalOrders = discounted.orderCount + fullPrice.orderCount;

  return {
    range: { from, to },
    summary: {
      totalOrders,
      discountedOrders: discounted.orderCount,
      fullPriceOrders: fullPrice.orderCount,
      discountDependency: totalOrders ? Math.round((discounted.orderCount / totalOrders) * 10000) / 100 : 0,
      totalDiscountSpent: discounted.totalDiscount,
      avgDiscountPerOrder: Math.round((discounted.avgDiscount || 0) * 100) / 100,
      discountedRevenue: discounted.totalRevenue,
      fullPriceRevenue: fullPrice.totalRevenue
    },
    dailyTrend: dailyTrend.map((d) => ({
      date: d._id,
      orderCount: d.orderCount,
      totalDiscount: d.totalDiscount,
      discountedOrders: d.discountedOrders,
      discountRate: d.orderCount ? Math.round((d.discountedOrders / d.orderCount) * 10000) / 100 : 0
    })),
    recommendations: buildDiscountRecommendations(discounted, fullPrice, totalOrders)
  };
}

function buildDiscountRecommendations(discounted, fullPrice, totalOrders) {
  const recs = [];
  const dependency = totalOrders ? discounted.orderCount / totalOrders : 0;

  if (dependency > 0.5) {
    recs.push({ type: 'warning', message: 'Lebih dari 50% penjualan memakai diskon — pertimbangkan mengurangi ketergantungan promo.' });
  }
  if (discounted.orderCount > 0 && fullPrice.orderCount > discounted.orderCount * 2) {
    recs.push({ type: 'positive', message: 'Mayoritas pelanggan bayar harga penuh — margin sehat.' });
  }
  if (discounted.totalDiscount > discounted.totalRevenue * 0.15) {
    recs.push({ type: 'warning', message: 'Total diskon melebihi 15% revenue — review efektivitas promo.' });
  }
  if (recs.length === 0) {
    recs.push({ type: 'info', message: 'Pola diskon dalam batas normal.' });
  }
  return recs;
}

module.exports = {
  getPromotionPerformance,
  getCampaignPerformance,
  getDiscountAnalysis
};
