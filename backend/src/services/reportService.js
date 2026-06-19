const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Ingredient = require('../models/Ingredient');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const SavedReport = require('../models/SavedReport');
const PDFDocument = require('pdfkit');
const inventoryAnalyticsService = require('./inventoryAnalyticsService');
const financialAnalyticsService = require('./financialAnalyticsService');
const analyticsService = require('./analyticsService');

async function getDateRangeFromQuery(query) {
  const { from, to } = query;
  let start;
  let end;

  if (from) start = new Date(from);
  if (to) end = new Date(to);

  if (!start && !end) {
    end = new Date();
    start = new Date();
    start.setDate(end.getDate() - 6);
  }

  if (end) end.setHours(23, 59, 59, 999);
  if (start) start.setHours(0, 0, 0, 0);

  return { start, end };
}

async function getSalesSummary(query) {
  const { start, end } = await getDateRangeFromQuery(query);

  const match = { status: 'completed' };
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
        totalAmount: { $sum: '$amountAfterDiscount' },
        orderCount: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' }
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id.day',
        totalAmount: 1,
        orderCount: 1,
        totalDiscount: 1
      }
    },
    { $sort: { date: 1 } }
  ];

  const daily = await Order.aggregate(pipeline);
  const grandTotal = daily.reduce(
    (acc, d) => ({
      totalAmount: acc.totalAmount + d.totalAmount,
      orderCount: acc.orderCount + d.orderCount,
      totalDiscount: acc.totalDiscount + d.totalDiscount
    }),
    { totalAmount: 0, orderCount: 0, totalDiscount: 0 }
  );

  return {
    reportType: 'sales',
    range: { from: start, to: end },
    daily,
    summary: {
      ...grandTotal,
      averageOrderValue: grandTotal.orderCount ? Math.round(grandTotal.totalAmount / grandTotal.orderCount) : 0
    }
  };
}

async function getTopMenus(query) {
  const { start, end } = await getDateRangeFromQuery(query);
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 5;

  const match = { status: 'completed' };
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menu',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtOrder'] } }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit }
  ];

  const agg = await Order.aggregate(pipeline);
  const menuIds = agg.map((a) => a._id);
  const menus = await Menu.find({ _id: { $in: menuIds } }).select('name price costPrice profitMargin');
  const menuMap = new Map(menus.map((m) => [m._id.toString(), m]));

  const items = agg.map((row) => {
    const menu = menuMap.get(row._id.toString());
    const cost = (menu?.costPrice || 0) * row.totalQuantity;
    return {
      menuId: row._id,
      name: menu ? menu.name : 'Unknown menu',
      currentPrice: menu ? menu.price : null,
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue,
      totalCost: cost,
      profit: row.totalRevenue - cost,
      profitMargin: row.totalRevenue ? Math.round(((row.totalRevenue - cost) / row.totalRevenue) * 10000) / 100 : 0
    };
  });

  return { reportType: 'menu_performance', range: { from: start, to: end }, items };
}

async function getCustomerAnalysisReport(query) {
  const { start, end } = await getDateRangeFromQuery(query);

  const [topCustomers, segments, repeatRate] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: start, $lte: end }, customerId: { $ne: null } } },
      {
        $group: {
          _id: '$customerId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$amountAfterDiscount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]),
    Customer.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$tier', count: { $sum: 1 }, avgSpent: { $avg: '$totalSpent' } } }
    ]),
    Order.aggregate([
      { $match: { status: 'completed', customerId: { $ne: null } } },
      { $group: { _id: '$customerId', orders: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          repeat: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } }
        }
      }
    ])
  ]);

  const customerIds = topCustomers.map((c) => c._id);
  const customers = await Customer.find({ _id: { $in: customerIds } }).select('name phone tier');
  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

  const repeat = repeatRate[0] || { total: 0, repeat: 0 };

  return {
    reportType: 'customer_analysis',
    range: { from: start, to: end },
    topCustomers: topCustomers.map((c) => ({
      customerId: c._id,
      name: customerMap.get(c._id.toString())?.name || 'Unknown',
      tier: customerMap.get(c._id.toString())?.tier || 'bronze',
      orderCount: c.orderCount,
      totalSpent: c.totalSpent
    })),
    segments: segments.map((s) => ({ tier: s._id, count: s.count, avgSpent: Math.round(s.avgSpent || 0) })),
    repeatCustomerRate: repeat.total ? Math.round((repeat.repeat / repeat.total) * 10000) / 100 : 0
  };
}

async function getStaffPerformanceReport(query) {
  const data = await analyticsService.getStaffPerformance({
    from: query.from,
    to: query.to
  });
  return { reportType: 'staff_performance', ...data };
}

async function getInventoryReport() {
  const [overview, reorder, aging] = await Promise.all([
    inventoryAnalyticsService.getInventoryOverview(),
    inventoryAnalyticsService.getReorderRecommendations(),
    inventoryAnalyticsService.getInventoryAging()
  ]);
  return { reportType: 'inventory', overview, reorderRecommendations: reorder, aging: aging.slice(0, 20) };
}

async function getFinancialReport(query) {
  const [profitability, costAnalysis, cashFlow] = await Promise.all([
    financialAnalyticsService.getProfitabilitySummary(query),
    financialAnalyticsService.getCostAnalysis(query),
    financialAnalyticsService.getCashFlow(query)
  ]);
  return { reportType: 'financial', profitability, costAnalysis, cashFlow };
}

async function getSupplierReport() {
  const suppliers = await inventoryAnalyticsService.getAllSupplierPerformance();
  const pos = await PurchaseOrder.find({ status: { $ne: 'cancelled' } })
    .sort({ orderDate: -1 })
    .limit(20)
    .populate('supplierId', 'name')
    .lean();

  return {
    reportType: 'supplier',
    supplierPerformance: suppliers,
    recentPurchaseOrders: pos.map((p) => ({
      poNumber: p.poNumber,
      supplier: p.supplierId?.name || 'Unknown',
      status: p.status,
      totalCost: p.totalCost,
      orderDate: p.orderDate,
      expectedDate: p.expectedDate,
      receivedDate: p.receivedDate
    }))
  };
}

function getReportTemplates() {
  return [
    { id: 'sales', name: 'Laporan Penjualan', description: 'Ringkasan penjualan harian dengan revenue dan diskon' },
    { id: 'menu_performance', name: 'Performa Menu', description: 'Ranking menu by revenue, quantity, dan profit margin' },
    { id: 'customer_analysis', name: 'Analisis Pelanggan', description: 'Top customers, segmentasi tier, repeat rate' },
    { id: 'staff_performance', name: 'Performa Staff', description: 'Ranking staff by orders completed dan revenue' },
    { id: 'inventory', name: 'Laporan Inventori', description: 'Stok overview, reorder suggestions, aging' },
    { id: 'financial', name: 'Laporan Keuangan', description: 'Profitability, cost analysis, cash flow' },
    { id: 'supplier', name: 'Laporan Supplier', description: 'Supplier reliability dan purchase order history' }
  ];
}

const REPORT_GENERATORS = {
  sales: getSalesSummary,
  menu_performance: getTopMenus,
  customer_analysis: getCustomerAnalysisReport,
  staff_performance: getStaffPerformanceReport,
  inventory: getInventoryReport,
  financial: getFinancialReport,
  supplier: getSupplierReport
};

async function generateReport(templateName, query = {}) {
  const generator = REPORT_GENERATORS[templateName];
  if (!generator) {
    throw new Error(`Unknown report template: ${templateName}`);
  }
  return generator(query);
}

async function generateCustomReport(body) {
  const { reportType, filters = {}, grouping = 'daily' } = body;
  const query = {
    from: filters.dateFrom,
    to: filters.dateTo,
    ...filters.customFilters
  };
  const data = await generateReport(reportType, query);
  return { ...data, grouping, filters };
}

function exportAsJSON(data) {
  return JSON.stringify(data, null, 2);
}

function exportAsCSV(data) {
  const rows = flattenReportData(data);
  if (rows.length === 0) return 'No data';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

function flattenReportData(data) {
  if (data.daily) return data.daily;
  if (data.items) return data.items;
  if (data.topCustomers) return data.topCustomers;
  if (data.data) return data.data;
  if (data.cashFlow) return data.cashFlow;
  if (data.supplierPerformance) return data.supplierPerformance;
  return [data.summary || data];
}

function exportAsPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Nasi Goreng Polonia - Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report Type: ${data.reportType || 'custom'}`);
    if (data.range) {
      doc.text(`Period: ${data.range.from ? new Date(data.range.from).toLocaleDateString('id-ID') : '-'} - ${data.range.to ? new Date(data.range.to).toLocaleDateString('id-ID') : '-'}`);
    }
    doc.moveDown();

    const rows = flattenReportData(data);
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]).slice(0, 6);
      doc.fontSize(10).text(headers.join(' | '));
      doc.moveDown(0.5);
      rows.slice(0, 50).forEach((row) => {
        doc.text(headers.map((h) => String(row[h] ?? '')).join(' | '));
      });
    } else if (data.summary) {
      Object.entries(data.summary).forEach(([k, v]) => doc.text(`${k}: ${v}`));
    }

    doc.end();
  });
}

async function exportReport(data, format = 'json') {
  switch (format) {
    case 'csv':
      return { content: exportAsCSV(data), contentType: 'text/csv', filename: `report-${Date.now()}.csv` };
    case 'pdf': {
      const buffer = await exportAsPDF(data);
      return { content: buffer, contentType: 'application/pdf', filename: `report-${Date.now()}.pdf` };
    }
    default:
      return { content: exportAsJSON(data), contentType: 'application/json', filename: `report-${Date.now()}.json` };
  }
}

async function listSavedReports(adminId) {
  return SavedReport.find({ createdBy: adminId }).sort({ updatedAt: -1 }).lean();
}

async function saveReport(data, adminId) {
  return SavedReport.create({ ...data, createdBy: adminId });
}

async function deleteSavedReport(id, adminId) {
  return SavedReport.findOneAndDelete({ _id: id, createdBy: adminId });
}

module.exports = {
  getSalesSummary,
  getTopMenus,
  getCustomerAnalysisReport,
  getStaffPerformanceReport,
  getInventoryReport,
  getFinancialReport,
  getSupplierReport,
  getReportTemplates,
  generateReport,
  generateCustomReport,
  exportReport,
  listSavedReports,
  saveReport,
  deleteSavedReport
};
