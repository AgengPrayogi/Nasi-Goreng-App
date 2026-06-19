const Order = require('../models/Order');
const Customer = require('../models/Customer');

async function getRfmAnalysis() {
  const customers = await Customer.find({ isActive: true })
    .select('_id name phone totalOrders totalSpent totalQuantity lastOrderDate tier createdAt')
    .lean();

  const now = new Date();

  const rfmData = customers.map(c => {
    // Recency: days since last order
    const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate) : c.createdAt;
    const recency = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));

    // Frequency: total orders
    const frequency = c.totalOrders;

    // Monetary: total spent
    const monetary = c.totalSpent;

    // RFM Scores (1-5)
    return {
      customerId: c._id,
      name: c.name || 'Unknown',
      phone: c.phone,
      tier: c.tier,
      recency,
      frequency,
      monetary,
      recencyScore: scoreRecency(recency),
      frequencyScore: scoreFrequency(frequency),
      monetaryScore: scoreMonetary(monetary),
      rfmTotal: 0 // calculated below
    };
  });

  // Calculate RFM total
  rfmData.forEach(c => {
    c.rfmTotal = c.recencyScore + c.frequencyScore + c.monetaryScore;
    c.segment = getRfmSegment(c.recencyScore, c.frequencyScore, c.monetaryScore);
  });

  // Sort by RFM total descending
  rfmData.sort((a, b) => b.rfmTotal - a.rfmTotal);

  // Aggregate segments
  const segmentDistribution = {};
  rfmData.forEach(c => {
    segmentDistribution[c.segment] = (segmentDistribution[c.segment] || 0) + 1;
  });

  return {
    customers: rfmData,
    segments: segmentDistribution,
    summary: {
      totalAnalyzed: rfmData.length,
      averageRecency: rfmData.length
        ? Math.round(rfmData.reduce((s, c) => s + c.recency, 0) / rfmData.length)
        : 0,
      averageFrequency: rfmData.length
        ? Math.round((rfmData.reduce((s, c) => s + c.frequency, 0) / rfmData.length) * 100) / 100
        : 0,
      averageMonetary: rfmData.length
        ? Math.round((rfmData.reduce((s, c) => s + c.monetary, 0) / rfmData.length) * 100) / 100
        : 0
    }
  };
}

function scoreRecency(days) {
  if (days <= 7) return 5;
  if (days <= 30) return 4;
  if (days <= 60) return 3;
  if (days <= 90) return 2;
  return 1;
}

function scoreFrequency(orders) {
  if (orders >= 20) return 5;
  if (orders >= 10) return 4;
  if (orders >= 5) return 3;
  if (orders >= 2) return 2;
  return orders >= 1 ? 1 : 0;
}

function scoreMonetary(spent) {
  if (spent >= 1000000) return 5;
  if (spent >= 500000) return 4;
  if (spent >= 200000) return 3;
  if (spent >= 100000) return 2;
  return spent > 0 ? 1 : 0;
}

function getRfmSegment(recency, frequency, monetary) {
  const total = recency + frequency + monetary;

  if (total >= 13) return 'Champions';
  if (total >= 10 && frequency >= 3 && monetary >= 3) return 'Loyal Customers';
  if (total >= 10 && recency >= 4 && frequency <= 2) return 'Potential Loyalists';
  if (total >= 8 && recency <= 2 && frequency >= 3) return 'At Risk';
  if (total >= 8 && recency <= 2 && monetary >= 3) return 'Cannot Lose';
  if (total >= 6 && recency <= 3 && frequency <= 2) return 'Hibernating';
  if (total <= 5) return 'Lost';
  return 'Promising';
}

async function getCustomerIntelligence(customerId) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw new Error('Customer not found');

  const orders = await Order.find({ customerId })
    .sort({ createdAt: -1 })
    .select('orderCode createdAt totalAmount status items paymentMethod')
    .lean();

  // Order history summary
  const orderHistory = orders.map(o => ({
    orderCode: o.orderCode,
    date: o.createdAt,
    totalAmount: o.totalAmount,
    status: o.status,
    paymentMethod: o.paymentMethod,
    itemCount: o.items ? o.items.length : 0
  }));

  // Preferred items
  const itemFrequency = {};
  for (const order of orders) {
    if (order.items) {
      for (const item of order.items) {
        const menuId = item.menu.toString();
        itemFrequency[menuId] = (itemFrequency[menuId] || 0) + item.quantity;
      }
    }
  }

  const preferredItems = Object.entries(itemFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([menuId, count]) => ({ menuId, count }));

  // Purchase intervals
  let avgDaysBetweenOrders = 0;
  if (orders.length >= 2) {
    const sortedOrders = [...orders].sort((a, b) => a.createdAt - b.createdAt);
    let totalDays = 0;
    for (let i = 1; i < sortedOrders.length; i++) {
      const diff = (sortedOrders[i].createdAt - sortedOrders[i - 1].createdAt) / (1000 * 60 * 60 * 24);
      totalDays += diff;
    }
    avgDaysBetweenOrders = Math.round((totalDays / (sortedOrders.length - 1)) * 100) / 100;
  }

  // Lifecycle stage
  const now = new Date();
  const daysSinceFirstOrder = orders.length > 0
    ? Math.floor((now - orders[orders.length - 1].createdAt) / (1000 * 60 * 60 * 24))
    : 0;
  const daysSinceLastOrder = customer.lastOrderDate
    ? Math.floor((now - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
    : 0;

  let lifecycleStage = 'new';
  if (customer.totalOrders >= 10 && daysSinceLastOrder <= 30) lifecycleStage = 'loyal';
  else if (customer.totalOrders >= 5 && daysSinceLastOrder <= 60) lifecycleStage = 'regular';
  else if (daysSinceLastOrder > 90 && customer.totalOrders > 0) lifecycleStage = 'at_risk';
  else if (daysSinceLastOrder > 180 && customer.totalOrders > 0) lifecycleStage = 'dormant';
  else if (customer.totalOrders >= 1) lifecycleStage = 'active';

  return {
    customer: {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: customer.tier,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      lastOrderDate: customer.lastOrderDate,
      createdAt: customer.createdAt
    },
    orderHistory,
    preferredItems,
    avgDaysBetweenOrders,
    lifecycleStage,
    rfmScore: {
      recency: scoreRecency(daysSinceLastOrder),
      frequency: scoreFrequency(customer.totalOrders),
      monetary: scoreMonetary(customer.totalSpent),
      total: scoreRecency(daysSinceLastOrder) + scoreFrequency(customer.totalOrders) + scoreMonetary(customer.totalSpent)
    }
  };
}

async function getCustomerSegments() {
  const rfmData = await getRfmAnalysis();

  const segments = {};
  for (const c of rfmData.customers) {
    if (!segments[c.segment]) {
      segments[c.segment] = {
        segment: c.segment,
        count: 0,
        avgRecency: 0,
        avgFrequency: 0,
        avgMonetary: 0,
        customers: []
      };
    }
    segments[c.segment].count++;
    segments[c.segment].avgRecency += c.recency;
    segments[c.segment].avgFrequency += c.frequency;
    segments[c.segment].avgMonetary += c.monetary;
    segments[c.segment].customers.push({
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      tier: c.tier
    });
  }

  const segmentArray = Object.values(segments);
  for (const seg of segmentArray) {
    seg.avgRecency = Math.round(seg.avgRecency / seg.count);
    seg.avgFrequency = Math.round((seg.avgFrequency / seg.count) * 100) / 100;
    seg.avgMonetary = Math.round((seg.avgMonetary / seg.count) * 100) / 100;
  }

  return segmentArray;
}

async function getCustomerRecommendations(customerId) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw new Error('Customer not found');

  const orders = await Order.find({ customerId })
    .sort({ createdAt: -1 })
    .select('items totalAmount createdAt status')
    .lean();

  const now = new Date();
  const daysSinceLastOrder = customer.lastOrderDate
    ? Math.floor((now - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
    : 0;

  const recommendations = [];

  // Churn risk
  if (daysSinceLastOrder > 30) {
    recommendations.push({
      type: 'churn_prevention',
      priority: daysSinceLastOrder > 90 ? 'high' : 'medium',
      message: `Pelanggan belum order ${daysSinceLastOrder} hari. Kirim promo khusus untuk re-engagement.`
    });
  }

  // Upsell opportunity
  if (customer.totalSpent < 200000) {
    recommendations.push({
      type: 'upsell',
      priority: 'medium',
      message: 'Pelanggan dengan nilai rendah — rekomendasikan paket hemat atau menu spesial.'
    });
  }

  // Best time to promote
  if (orders.length > 0) {
    const hourDistribution = {};
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }
    const bestHour = Object.entries(hourDistribution).sort((a, b) => b[1] - a[1])[0];
    if (bestHour) {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        message: `Waktu terbaik untuk promosi: jam ${bestHour[0]}:00 (berdasarkan ${bestHour[1]} pesanan)`
      });
    }
  }

  // Loyalty progression
  if (customer.tier === 'bronze' && customer.totalOrders >= 3) {
    recommendations.push({
      type: 'loyalty',
      priority: 'high',
      message: `Pelanggan butuh ${5 - customer.totalOrders} order lagi untuk naik ke Silver. Dorong dengan program loyalitas.`
    });
  }

  return recommendations;
}

module.exports = {
  getRfmAnalysis,
  getCustomerIntelligence,
  getCustomerSegments,
  getCustomerRecommendations
};
