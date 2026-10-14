const crypto = require('crypto');
const Order = require('../models/Order');
const OrderFeedback = require('../models/OrderFeedback');
const { AppError, BusinessError, NotFoundError } = require('../errors/AppError');

function matchesToken(expected, supplied) {
  const a = Buffer.from(String(expected || ''), 'hex');
  const b = Buffer.from(crypto.createHash('sha256').update(String(supplied || '')).digest('hex'), 'hex');
  return a.length === 32 && b.length === 32 && crypto.timingSafeEqual(a, b);
}

async function getFeedback(orderCode, token) {
  const order = await Order.findOne({ orderCode }).select('+feedbackTokenHash').populate('items.menu', 'name');
  if (!order) throw new NotFoundError('Order');
  if (!matchesToken(order.feedbackTokenHash, token)) throw new AppError('Feedback link is invalid or expired', 403, 'INVALID_FEEDBACK_TOKEN');
  if (order.status !== 'completed') throw new BusinessError('Feedback is available after the order is completed', 'ORDER_NOT_COMPLETED');

  const [feedback, totals] = await Promise.all([
    OrderFeedback.findOne({ order: order._id }).select('rating comment createdAt updatedAt').lean(),
    OrderFeedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ])
  ]);
  const counts = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: totals.find((item) => item._id === rating)?.count || 0 }));
  const count = counts.reduce((sum, item) => sum + item.count, 0);
  const weighted = counts.reduce((sum, item) => sum + item.rating * item.count, 0);
  return {
    order: { orderCode: order.orderCode, status: order.status, items: order.items.map((item) => ({ name: item.menu?.name || 'Menu', quantity: item.quantity })) },
    feedback,
    ratingSummary: { average: count ? Number((weighted / count).toFixed(1)) : 0, count, distribution: counts }
  };
}

async function submitFeedback(orderCode, { token, rating, comment }) {
  const order = await Order.findOne({ orderCode }).select('+feedbackTokenHash');
  if (!order) throw new NotFoundError('Order');
  if (!matchesToken(order.feedbackTokenHash, token)) throw new AppError('Feedback link is invalid or expired', 403, 'INVALID_FEEDBACK_TOKEN');
  if (order.status !== 'completed') throw new BusinessError('Feedback is available after the order is completed', 'ORDER_NOT_COMPLETED');
  const feedback = await OrderFeedback.findOneAndUpdate(
    { order: order._id },
    { $set: { orderCode: order.orderCode, rating, comment } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select('rating comment createdAt updatedAt').lean();
  return feedback;
}

module.exports = { getFeedback, submitFeedback };
