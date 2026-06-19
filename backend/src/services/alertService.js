const { Alert, AlertConfig } = require('../models/Alert');
const Ingredient = require('../models/Ingredient');
const Order = require('../models/Order');

const SEVERITY_ORDER = { info: 0, warning: 1, critical: 2 };

async function checkAndGenerateAlerts() {
  const configs = await AlertConfig.find({ enabled: true }).lean();
  const generatedAlerts = [];

  for (const config of configs) {
    try {
      const alerts = await evaluateAlertConfig(config);
      generatedAlerts.push(...alerts);
    } catch (err) {
      console.error(`Error evaluating alert config ${config._id}:`, err.message);
    }
  }

  return generatedAlerts;
}

async function evaluateAlertConfig(config) {
  const alerts = [];

  switch (config.type) {
    case 'low_stock':
      alerts.push(...await checkLowStock(config));
      break;
    case 'overstock':
      alerts.push(...await checkOverstock(config));
      break;
    case 'sales_spike':
      alerts.push(...await checkSalesSpike(config));
      break;
    case 'sales_drop':
      alerts.push(...await checkSalesDrop(config));
      break;
    case 'high_wait_time':
      alerts.push(...await checkHighWaitTime(config));
      break;
    case 'payment_failure':
      alerts.push(...await checkPaymentFailures(config));
      break;
  }

  return alerts;
}

async function checkLowStock(config) {
  const alerts = [];
  const threshold = config.thresholds?.critical || { stockLevel: 0 };
  const warningThreshold = config.thresholds?.warning || { stockLevel: 5 };

  const lowStockItems = await Ingredient.find({
    isActive: true,
    $expr: { $lte: ['$currentStock', { $ifNull: [threshold.stockLevel, '$minimumStock'] }] }
  }).select('name unit currentStock minimumStock').lean();

  for (const item of lowStockItems) {
    const severity = item.currentStock === 0 ? 'critical' : 'warning';

    // Check if similar alert already exists and is not resolved
    const existingAlert = await Alert.findOne({
      type: 'low_stock',
      'data.ingredientId': item._id,
      resolved: false
    });

    if (existingAlert) {
      // Update the existing alert if severity increased
      if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[existingAlert.severity]) {
        await Alert.findByIdAndUpdate(existingAlert._id, { severity, message: `Stok ${item.name} habis! (${item.currentStock} ${item.unit})` });
      }
      continue;
    }

    const alert = await Alert.create({
      configId: config._id,
      type: 'low_stock',
      severity,
      title: `Stok ${item.name} ${item.currentStock === 0 ? 'Habis' : 'Menipis'}`,
      message: `${item.name}: ${item.currentStock} ${item.unit} tersisa (min: ${item.minimumStock} ${item.unit})`,
      data: { ingredientId: item._id, name: item.name, currentStock: item.currentStock, minimumStock: item.minimumStock }
    });

    alerts.push(alert);
  }

  return alerts;
}

async function checkOverstock(config) {
  const alerts = [];
  const threshold = config.thresholds?.warning || { maxStock: 100 };

  const overstockItems = await Ingredient.find({
    isActive: true,
    currentStock: { $gt: threshold.maxStock }
  }).select('name unit currentStock').lean();

  for (const item of overstockItems) {
    const existingAlert = await Alert.findOne({
      type: 'overstock',
      'data.ingredientId': item._id,
      resolved: false
    });

    if (existingAlert) continue;

    const alert = await Alert.create({
      configId: config._id,
      type: 'overstock',
      severity: 'warning',
      title: `Overstock: ${item.name}`,
      message: `${item.name}: ${item.currentStock} ${item.unit} (melebihi batas ${threshold.maxStock})`,
      data: { ingredientId: item._id, name: item.name, currentStock: item.currentStock }
    });

    alerts.push(alert);
  }

  return alerts;
}

async function checkSalesSpike(config) {
  const alerts = [];
  const threshold = config.thresholds?.critical || { percentIncrease: 50 };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // Today's completed orders
  const todayCount = await Order.countDocuments({
    status: 'completed',
    createdAt: { $gte: todayStart, $lte: now }
  });

  const yesterdayCount = await Order.countDocuments({
    status: 'completed',
    createdAt: { $gte: yesterdayStart, $lte: todayStart }
  });

  if (yesterdayCount > 0) {
    const increasePercent = ((todayCount - yesterdayCount) / yesterdayCount) * 100;

    if (increasePercent >= threshold.percentIncrease) {
      const alert = await Alert.create({
        configId: config._id,
        type: 'sales_spike',
        severity: 'info',
        title: 'Sales Spike Terdeteksi',
        message: `Pesanan hari ini ${todayCount} (naik ${Math.round(increasePercent)}% dari kemarin)`,
        data: { todayCount, yesterdayCount, increasePercent: Math.round(increasePercent) }
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

async function checkSalesDrop(config) {
  const alerts = [];
  const threshold = config.thresholds?.warning || { percentDecrease: 30 };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todayCount = await Order.countDocuments({
    status: 'completed',
    createdAt: { $gte: todayStart, $lte: now }
  });

  const yesterdayCount = await Order.countDocuments({
    status: 'completed',
    createdAt: { $gte: yesterdayStart, $lte: todayStart }
  });

  if (yesterdayCount > 0 && todayCount < yesterdayCount) {
    const decreasePercent = ((yesterdayCount - todayCount) / yesterdayCount) * 100;

    if (decreasePercent >= threshold.percentDecrease) {
      const alert = await Alert.create({
        configId: config._id,
        type: 'sales_drop',
        severity: 'warning',
        title: 'Penurunan Penjualan',
        message: `Pesanan hari ini ${todayCount} (turun ${Math.round(decreasePercent)}% dari kemarin)`,
        data: { todayCount, yesterdayCount, decreasePercent: Math.round(decreasePercent) }
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

async function checkHighWaitTime(config) {
  const alerts = [];
  const threshold = config.thresholds?.warning || { minutes: 30 };

  const longWaitingOrders = await Order.find({
    status: { $ne: 'cancelled' },
    kitchenStatus: { $in: ['queued', 'preparing'] },
    createdAt: { $lte: new Date(Date.now() - threshold.minutes * 60 * 1000) }
  })
    .select('orderCode customerName createdAt kitchenStatus')
    .limit(5)
    .lean();

  if (longWaitingOrders.length > 0) {
    const existingAlert = await Alert.findOne({
      type: 'high_wait_time',
      resolved: false
    });

    if (!existingAlert) {
      const alert = await Alert.create({
        configId: config._id,
        type: 'high_wait_time',
        severity: 'warning',
        title: 'Waktu Tunggu Tinggi',
        message: `${longWaitingOrders.length} pesanan menunggu lebih dari ${threshold.minutes} menit`,
        data: { count: longWaitingOrders.length, orders: longWaitingOrders.map(o => o.orderCode) }
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

async function checkPaymentFailures(config) {
  const alerts = [];

  const failedPayments = await Order.countDocuments({
    paymentStatus: 'unpaid',
    status: { $ne: 'cancelled' },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  const threshold = config.thresholds?.warning || { count: 5 };

  if (failedPayments >= threshold.count) {
    const existingAlert = await Alert.findOne({
      type: 'payment_failure',
      resolved: false
    });

    if (!existingAlert) {
      const alert = await Alert.create({
        configId: config._id,
        type: 'payment_failure',
        severity: 'warning',
        title: 'Pembayaran Gagal',
        message: `${failedPayments} pesanan belum dibayar dalam 24 jam terakhir`,
        data: { count: failedPayments }
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

// Alert management functions
async function getAlerts(query = {}) {
  const { type, severity, resolved, acknowledged, limit = 50 } = query;
  const filter = {};

  if (type) filter.type = type;
  if (severity) filter.severity = severity;
  if (resolved !== undefined) filter.resolved = resolved === 'true';
  if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

  const alerts = await Alert.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  const counts = {
    total: await Alert.countDocuments({ resolved: false }),
    critical: await Alert.countDocuments({ resolved: false, severity: 'critical' }),
    warning: await Alert.countDocuments({ resolved: false, severity: 'warning' }),
    info: await Alert.countDocuments({ resolved: false, severity: 'info' }),
    unacknowledged: await Alert.countDocuments({ acknowledged: false, resolved: false })
  };

  return { alerts, counts };
}

async function getAlertHistory(query = {}) {
  const { days = 7, type, severity } = query;
  const since = new Date(Date.now() - parseInt(days) * 86400000);
  const filter = { createdAt: { $gte: since } };

  if (type) filter.type = type;
  if (severity) filter.severity = severity;

  const alerts = await Alert.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // Aggregate by type
  const byType = {};
  const byDay = {};

  for (const a of alerts) {
    byType[a.type] = (byType[a.type] || 0) + 1;
    const day = a.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return {
    total: alerts.length,
    byType,
    byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    alerts
  };
}

async function acknowledgeAlert(alertId, adminId) {
  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { acknowledged: true, acknowledgedBy: adminId, acknowledgedAt: new Date() },
    { new: true }
  );
  if (!alert) throw new Error('Alert not found');
  return alert;
}

async function resolveAlert(alertId) {
  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { resolved: true, resolvedAt: new Date() },
    { new: true }
  );
  if (!alert) throw new Error('Alert not found');
  return alert;
}

async function getAlertConfigs() {
  return AlertConfig.find().sort({ type: 1 }).lean();
}

async function createAlertConfig(data) {
  const config = await AlertConfig.create(data);
  return config;
}

async function updateAlertConfig(configId, data) {
  const config = await AlertConfig.findByIdAndUpdate(configId, data, { new: true });
  if (!config) throw new Error('Alert config not found');
  return config;
}

async function deleteAlertConfig(configId) {
  const config = await AlertConfig.findByIdAndDelete(configId);
  if (!config) throw new Error('Alert config not found');
  return { deleted: true };
}

// Initialize default alert configs
async function initializeDefaultConfigs() {
  const existingCount = await AlertConfig.countDocuments();
  if (existingCount > 0) return;

  const defaults = [
    {
      type: 'low_stock',
      name: 'Low Stock Warning',
      description: 'Diberitahu ketika stok bahan baku menipis',
      enabled: true,
      thresholds: {
        warning: {},
        critical: { stockLevel: 0 }
      },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'realtime'
    },
    {
      type: 'overstock',
      name: 'Overstock Warning',
      description: 'Diberitahu ketika stok bahan baku melebihi batas',
      enabled: false,
      thresholds: { warning: { maxStock: 100 } },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'daily'
    },
    {
      type: 'sales_spike',
      name: 'Sales Spike Detection',
      description: 'Diberitahu ketika ada lonjakan penjualan signifikan',
      enabled: true,
      thresholds: { critical: { percentIncrease: 50 } },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'realtime'
    },
    {
      type: 'sales_drop',
      name: 'Sales Drop Alert',
      description: 'Diberitahu ketika ada penurunan penjualan signifikan',
      enabled: true,
      thresholds: { warning: { percentDecrease: 30 } },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'daily'
    },
    {
      type: 'high_wait_time',
      name: 'High Wait Time Alert',
      description: 'Diberitahu ketika ada pesanan yang menunggu terlalu lama',
      enabled: true,
      thresholds: { warning: { minutes: 30 } },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'realtime'
    },
    {
      type: 'payment_failure',
      name: 'Payment Failure Alert',
      description: 'Diberitahu ketika banyak pembayaran gagal',
      enabled: true,
      thresholds: { warning: { count: 5 } },
      channels: { dashboard: true, email: false, sms: false },
      frequency: 'daily'
    }
  ];

  await AlertConfig.insertMany(defaults);
}

module.exports = {
  checkAndGenerateAlerts,
  getAlerts,
  getAlertHistory,
  acknowledgeAlert,
  resolveAlert,
  getAlertConfigs,
  createAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  initializeDefaultConfigs
};