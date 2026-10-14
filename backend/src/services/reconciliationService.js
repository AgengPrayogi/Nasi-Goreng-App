const DailyReconciliation = require('../models/DailyReconciliation');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
require('../models/Staff'); // Register the model referenced by DailyReconciliation.closedBy.
const { AppError } = require('../errors/AppError');

/**
 * Daily Reconciliation Service
 * Handles daily sales closing, reconciliation, and reporting
 */

module.exports = {
  /**
   * Close daily sales - aggregate all completed orders for the day
   * @param {Date} date - The date to close (e.g., '2024-01-15')
   * @param {string} staffId - Staff ID doing the closing
   * @param {object} actualData - Actual cash/data from cash counter
   * @param {object} metadata - Additional metadata
   * @returns {object} DailyReconciliation document
   */
  async closeDay(date, staffId, actualData = {}, metadata = {}) {
    try {
      // Check if day already closed
      const existing = await DailyReconciliation.findOne({
        date: new Date(date)
      });

      if (existing && existing.status !== 'open') {
        throw new AppError(
          `Penjualan ${date} sudah ditutup`,
          409,
          'DAY_ALREADY_CLOSED'
        );
      }

      // Set date range (start of day to end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregate completed orders for the day
      const orderStats = await Order.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$amountAfterDiscount' },
            totalDiscount: { $sum: '$discountAmount' },
            totalBeforeDiscount: { $sum: '$totalAmount' },
            cashCount: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amountAfterDiscount', 0]
              }
            },
            transferCount: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', 'transfer'] }, '$amountAfterDiscount', 0]
              }
            },
            qrisCount: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', 'qris_static'] }, '$amountAfterDiscount', 0]
              }
            }
          }
        }
      ]);

      const stats = orderStats.length > 0 ? orderStats[0] : {
        totalOrders: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        totalBeforeDiscount: 0,
        cashCount: 0,
        transferCount: 0,
        qrisCount: 0
      };

      // Calculate discrepancy
      const expectedTotal = stats.totalRevenue;
      const actualPayments = actualData.actualPaymentBreakdown || {};
      const actualTotal = actualData.actualTotal || (
        Number(actualPayments.cash || 0) + Number(actualPayments.transfer || 0) + Number(actualPayments.qris || 0)
      ) || expectedTotal;
      const discrepancy = actualTotal - expectedTotal;
      const expectedPayments = {
        cash: stats.cashCount,
        transfer: stats.transferCount,
        qris: stats.qrisCount
      };
      const recordedActualPayments = actualData.actualPaymentBreakdown || expectedPayments;

      // Create or update DailyReconciliation
      let dailyRec = await DailyReconciliation.findOneAndUpdate(
        { date: new Date(date) },
        {
          date: new Date(date),
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          paymentBreakdown: {
            cash: stats.cashCount,
            transfer: stats.transferCount,
            qris: stats.qrisCount,
            other: 0
          },
          actualPaymentBreakdown: recordedActualPayments,
          paymentDiscrepancy: {
            cash: Number(recordedActualPayments.cash || 0) - expectedPayments.cash,
            transfer: Number(recordedActualPayments.transfer || 0) - expectedPayments.transfer,
            qris: Number(recordedActualPayments.qris || 0) - expectedPayments.qris
          },
          discountApplied: stats.totalDiscount,
          expectedTotal: expectedTotal,
          actualTotal: actualTotal,
          discrepancy: discrepancy,
          status: 'closed',
          closedBy: staffId,
          closedAt: new Date(),
          notes: actualData.notes || '',
          metadata: {
            ...metadata,
            beforeDiscount: stats.totalBeforeDiscount,
            paymentMethods: {
              cash: stats.cashCount,
              transfer: stats.transferCount,
              qris: stats.qrisCount
            }
          }
        },
        { upsert: true, new: true }
      ).populate('closedBy', 'name email role');

      // Log audit entry
      await AuditLog.create({
        adminId: staffId,
        adminName: staffId,
        action: 'close_day',
        resource: 'DailyReconciliation',
        resourceId: dailyRec._id,
        description: `Menutup penjualan hari ${date}. Total: Rp ${expectedTotal}`,
        metadata: {
          date,
          totalOrders: stats.totalOrders,
          totalRevenue: expectedTotal,
          discrepancy,
          status: dailyRec.status
        }
      });

      return dailyRec;
    } catch (err) {
      if (err.name === 'AppError') throw err;
      throw new AppError(err.message || 'Could not close sales day', 500, 'CLOSE_DAY_ERROR');
    }
  },

  async finalizeDay(date, staffId) {
    const dailyRec = await DailyReconciliation.findOne({ date: new Date(date) });
    if (!dailyRec) throw new AppError(`Data penjualan untuk ${date} tidak ditemukan`, 404, 'RECONCILIATION_NOT_FOUND');
    if (dailyRec.status !== 'closed') throw new AppError('Hari harus berstatus closed sebelum difinalisasi', 409, 'INVALID_RECONCILIATION_STATUS');
    dailyRec.status = 'finalized';
    dailyRec.finalizedAt = new Date();
    await dailyRec.save();
    await AuditLog.create({ adminId: staffId, adminName: staffId, action: 'finalize_day', resource: 'DailyReconciliation', resourceId: dailyRec._id, description: `Finalisasi penjualan hari ${date}` });
    return dailyRec;
  },

  /**
   * Get daily reconciliation for specific date
   * @param {Date} date - The date to retrieve
   * @returns {object} DailyReconciliation document with order details
   */
  async getDailyReconciliation(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get reconciliation data
      const dailyRec = await DailyReconciliation.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('closedBy', 'name email phone role');

      if (!dailyRec) {
        throw new AppError(
          `Data penjualan untuk ${date} tidak ditemukan`,
          404,
          'RECONCILIATION_NOT_FOUND'
        );
      }

      // Get detailed orders for the day
      const orders = await Order.find({
        status: 'completed',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
        .select('orderCode totalAmount amountAfterDiscount paymentMethod paymentStatus')
        .sort({ createdAt: -1 });

      return {
        ...dailyRec.toObject(),
        orderDetails: orders
      };
    } catch (err) {
      if (err.name === 'AppError') throw err;
      throw new AppError(err.message || 'Could not get reconciliation', 500, 'GET_RECONCILIATION_ERROR');
    }
  },

  /**
   * Get reconciliation for date range
   * @param {Date} from - Start date
   * @param {Date} to - End date
   * @param {object} filters - Additional filters
   * @returns {array} Array of reconciliation documents
   */
  async getReconciliationRange(from, to, filters = {}) {
    try {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);

      const query = {
        date: { $gte: startOfDay, $lte: endOfDay }
      };

      if (filters.status) query.status = filters.status;

      const reconciliations = await DailyReconciliation.find(query)
        .sort({ date: -1 })
        .populate('closedBy', 'name email role');

      // Calculate summary
      const summary = await DailyReconciliation.aggregate([
        {
          $match: {
            date: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            totalOrders: { $sum: '$totalOrders' },
            totalRevenue: { $sum: '$totalRevenue' },
            totalDiscount: { $sum: '$discountApplied' },
            totalDiscrepancy: { $sum: '$discrepancy' },
            avgRevenuePerDay: { $avg: '$totalRevenue' },
            avgOrdersPerDay: { $avg: '$totalOrders' }
          }
        }
      ]);

      return {
        reconciliations,
        summary: summary.length > 0 ? summary[0] : {}
      };
    } catch (err) {
      throw new AppError(err.message || 'Could not get reconciliation range', 500, 'GET_RANGE_ERROR');
    }
  },

  /**
   * Compare two days reconciliation
   * @param {Date} date1 - First date to compare
   * @param {Date} date2 - Second date to compare
   * @returns {object} Comparison result
   */
  async compareReconciliations(date1, date2) {
    try {
      const rec1 = await this.getDailyReconciliation(date1);
      const rec2 = await this.getDailyReconciliation(date2);

      return {
        date1: {
          date: rec1.date,
          totalOrders: rec1.totalOrders,
          totalRevenue: rec1.totalRevenue,
          discountApplied: rec1.discountApplied,
          avgOrderValue: rec1.totalOrders > 0 ? rec1.totalRevenue / rec1.totalOrders : 0
        },
        date2: {
          date: rec2.date,
          totalOrders: rec2.totalOrders,
          totalRevenue: rec2.totalRevenue,
          discountApplied: rec2.discountApplied,
          avgOrderValue: rec2.totalOrders > 0 ? rec2.totalRevenue / rec2.totalOrders : 0
        },
        comparison: {
          orderDifference: rec2.totalOrders - rec1.totalOrders,
          orderDifferencePercent: rec1.totalOrders > 0 
            ? ((rec2.totalOrders - rec1.totalOrders) / rec1.totalOrders * 100).toFixed(2)
            : 0,
          revenueDifference: rec2.totalRevenue - rec1.totalRevenue,
          revenueDifferencePercent: rec1.totalRevenue > 0 
            ? ((rec2.totalRevenue - rec1.totalRevenue) / rec1.totalRevenue * 100).toFixed(2)
            : 0,
          discountDifference: rec2.discountApplied - rec1.discountApplied
        }
      };
    } catch (err) {
      throw new AppError(err.message || 'Could not compare reconciliations', 500, 'COMPARE_ERROR');
    }
  },

  /**
   * Get monthly reconciliation summary
   * @param {string} year - Year (e.g., '2024')
   * @param {string} month - Month (e.g., '01')
   * @returns {object} Monthly summary with daily breakdown
   */
  async getMonthlyReconciliation(year, month) {
    try {
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month

      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all reconciliations for month
      const dailyRecs = await DailyReconciliation.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ date: 1 });

      // Get monthly aggregate
      const monthlyStats = await DailyReconciliation.aggregate([
        {
          $match: {
            date: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: '$totalOrders' },
            totalRevenue: { $sum: '$totalRevenue' },
            totalDiscount: { $sum: '$discountApplied' },
            totalDiscrepancy: { $sum: '$discrepancy' },
            daysReconciled: { $sum: 1 },
            avgRevenuePerDay: { $avg: '$totalRevenue' },
            avgOrdersPerDay: { $avg: '$totalOrders' },
            maxRevenueDay: { $max: '$totalRevenue' },
            minRevenueDay: { $min: '$totalRevenue' },
            maxOrdersDay: { $max: '$totalOrders' }
          }
        }
      ]);

      const stats = monthlyStats.length > 0 ? monthlyStats[0] : {
        totalOrders: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        daysReconciled: 0
      };

      return {
        period: `${year}-${month}`,
        dailyBreakdown: dailyRecs,
        monthlySummary: {
          ...stats,
          lastUpdated: new Date()
        }
      };
    } catch (err) {
      throw new AppError(err.message || 'Could not get monthly reconciliation', 500, 'GET_MONTHLY_ERROR');
    }
  },

  /**
   * Get revenue trend (daily/weekly/monthly)
   * @param {Date} from - Start date
   * @param {Date} to - End date
   * @param {string} granularity - 'daily', 'weekly', or 'monthly'
   * @returns {array} Array of revenue data points
   */
  async getRevenueTrend(from, to, granularity = 'daily') {
    try {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);

      let groupBy;
      if (granularity === 'weekly') {
        groupBy = {
          year: { $year: '$date' },
          week: { $week: '$date' }
        };
      } else if (granularity === 'monthly') {
        groupBy = {
          year: { $year: '$date' },
          month: { $month: '$date' }
        };
      } else {
        // daily
        groupBy = {
          $dateToString: { format: '%Y-%m-%d', date: '$date' }
        };
      }

      const trend = await DailyReconciliation.aggregate([
        {
          $match: {
            date: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: '$totalRevenue' },
            orders: { $sum: '$totalOrders' },
            discount: { $sum: '$discountApplied' },
            avgOrderValue: {
              $avg: {
                $cond: [
                  { $gt: ['$totalOrders', 0] },
                  { $divide: ['$totalRevenue', '$totalOrders'] },
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return trend;
    } catch (err) {
      throw new AppError(err.message || 'Could not get reconciliation trend', 500, 'GET_TREND_ERROR');
    }
  },

  /**
   * Calculate reconciliation health metrics
   * @param {Date} from - Start date
   * @param {Date} to - End date
   * @returns {object} Health metrics
   */
  async getHealthMetrics(from, to) {
    try {
      const startOfDay = new Date(from);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);

      const metrics = await DailyReconciliation.aggregate([
        {
          $match: {
            date: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            daysWithErrors: {
              $sum: {
                $cond: [{ $ne: ['$discrepancy', 0] }, 1, 0]
              }
            },
            totalDiscrepancy: { $sum: '$discrepancy' },
            avgDiscrepancyPerDay: { $avg: '$discrepancy' },
            maxDiscrepancy: { $max: { $abs: '$discrepancy' } },
            discrepancyStdDev: { $stdDevPop: '$discrepancy' }
          }
        }
      ]);

      const data = metrics.length > 0 ? metrics[0] : {};

      return {
        accuracy: data.totalDays > 0 
          ? (((data.totalDays - data.daysWithErrors) / data.totalDays) * 100).toFixed(2)
          : 100,
        totalDays: data.totalDays || 0,
        daysWithErrors: data.daysWithErrors || 0,
        totalDiscrepancy: data.totalDiscrepancy || 0,
        avgDiscrepancyPerDay: Math.abs(data.avgDiscrepancyPerDay || 0).toFixed(0),
        maxDiscrepancy: data.maxDiscrepancy || 0,
        riskLevel: this._calculateRiskLevel(data)
      };
    } catch (err) {
      throw new AppError(err.message || 'Could not get reconciliation health metrics', 500, 'GET_HEALTH_ERROR');
    }
  },

  /**
   * Internal: Calculate risk level based on metrics
   */
  _calculateRiskLevel(data) {
    if (!data.totalDays || data.totalDays === 0) return 'UNKNOWN';

    const errorRate = (data.daysWithErrors / data.totalDays) * 100;

    if (errorRate === 0) return 'EXCELLENT';
    if (errorRate <= 5) return 'GOOD';
    if (errorRate <= 15) return 'WARNING';
    return 'CRITICAL';
  }
};
