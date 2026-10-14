const reconciliationService = require('../services/reconciliationService');
const { AppError } = require('../errors/AppError');

/**
 * Daily Reconciliation Controller
 * Handles HTTP requests for reconciliation endpoints
 */

module.exports = {
  /**
   * Close daily sales
   * POST /api/reconciliation/close
   */
  async closeDayHandler(req, res, next) {
    try {
      const { date, actualTotal, actualPaymentBreakdown, notes } = req.body;

      if (!date) {
        throw new AppError('Tanggal penjualan harus diisi', 400, 'MISSING_DATE');
      }

      const result = await reconciliationService.closeDay(
        date,
        req.user.id,
        { actualTotal, actualPaymentBreakdown, notes }
      );

      res.status(201).json({
        success: true,
        message: `Penjualan ${date} berhasil ditutup`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async finalizeDayHandler(req, res, next) {
    try {
      const result = await reconciliationService.finalizeDay(req.params.date, req.user.id);
      res.json({ success: true, message: `Penjualan ${req.params.date} berhasil difinalisasi`, data: result });
    } catch (err) { next(err); }
  },

  /**
   * Get daily reconciliation
   * GET /api/reconciliation/:date
   */
  async getDailyHandler(req, res, next) {
    try {
      const { date } = req.params;

      if (!date) {
        throw new AppError('Tanggal harus diisi', 400, 'MISSING_DATE');
      }

      const result = await reconciliationService.getDailyReconciliation(date);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get reconciliation range
   * GET /api/reconciliation/range/date1/date2
   * Query: ?status=closed
   */
  async getRangeHandler(req, res, next) {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        throw new AppError(
          'Parameter from dan to harus diisi',
          400,
          'MISSING_DATES'
        );
      }

      const filters = {};
      if (req.query.status) filters.status = req.query.status;

      const result = await reconciliationService.getReconciliationRange(from, to, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Compare two reconciliations
   * GET /api/reconciliation/compare
   * Query: ?date1=2024-01-15&date2=2024-01-16
   */
  async compareHandler(req, res, next) {
    try {
      const { date1, date2 } = req.query;

      if (!date1 || !date2) {
        throw new AppError(
          'Parameter date1 dan date2 harus diisi',
          400,
          'MISSING_DATES'
        );
      }

      const result = await reconciliationService.compareReconciliations(date1, date2);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get monthly reconciliation
   * GET /api/reconciliation/monthly/2024/01
   */
  async getMonthlyHandler(req, res, next) {
    try {
      const { year, month } = req.params;

      if (!year || !month) {
        throw new AppError(
          'Tahun dan bulan harus diisi',
          400,
          'MISSING_PERIOD'
        );
      }

      const result = await reconciliationService.getMonthlyReconciliation(year, month);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get revenue trend
   * GET /api/reconciliation/trend
   * Query: ?from=2024-01-01&to=2024-01-31&granularity=daily
   */
  async getTrendHandler(req, res, next) {
    try {
      const { from, to, granularity = 'daily' } = req.query;

      if (!from || !to) {
        throw new AppError(
          'Parameter from dan to harus diisi',
          400,
          'MISSING_DATES'
        );
      }

      const validGranularities = ['daily', 'weekly', 'monthly'];
      if (!validGranularities.includes(granularity)) {
        throw new AppError(
          'Granularitas harus: daily, weekly, atau monthly',
          400,
          'INVALID_GRANULARITY'
        );
      }

      const result = await reconciliationService.getRevenueTrend(from, to, granularity);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get health metrics
   * GET /api/reconciliation/health
   * Query: ?from=2024-01-01&to=2024-01-31
   */
  async getHealthMetricsHandler(req, res, next) {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        throw new AppError(
          'Parameter from dan to harus diisi',
          400,
          'MISSING_DATES'
        );
      }

      const result = await reconciliationService.getHealthMetrics(from, to);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
