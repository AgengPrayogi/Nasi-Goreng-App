const reportService = require('../services/reportService');

async function salesSummaryHandler(req, res, next) {
  try {
    const data = await reportService.getSalesSummary(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function topMenusHandler(req, res, next) {
  try {
    const data = await reportService.getTopMenus(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function templatesHandler(req, res, next) {
  try {
    const data = reportService.getReportTemplates();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function menuPerformanceHandler(req, res, next) {
  try {
    const data = await reportService.getTopMenus(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customerAnalysisHandler(req, res, next) {
  try {
    const data = await reportService.getCustomerAnalysisReport(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function staffPerformanceReportHandler(req, res, next) {
  try {
    const data = await reportService.getStaffPerformanceReport(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function inventoryReportHandler(req, res, next) {
  try {
    const data = await reportService.getInventoryReport();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function financialReportHandler(req, res, next) {
  try {
    const data = await reportService.getFinancialReport(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function supplierReportHandler(req, res, next) {
  try {
    const data = await reportService.getSupplierReport();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function customReportHandler(req, res, next) {
  try {
    const data = await reportService.generateCustomReport(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function exportReportHandler(req, res, next) {
  try {
    const { templateName, format = 'json', ...query } = req.body;
    const reportData = await reportService.generateReport(templateName, query);
    const exported = await reportService.exportReport(reportData, format);

    if (format === 'pdf') {
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      return res.send(exported.content);
    }

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  } catch (err) {
    next(err);
  }
}

async function savedReportsHandler(req, res, next) {
  try {
    const data = await reportService.listSavedReports(req.user?.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function saveReportHandler(req, res, next) {
  try {
    const data = await reportService.saveReport(req.body, req.user?.id);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteSavedReportHandler(req, res, next) {
  try {
    const data = await reportService.deleteSavedReport(req.params.id, req.user?.id);
    if (!data) return res.status(404).json({ success: false, message: 'Saved report not found' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  salesSummaryHandler,
  topMenusHandler,
  templatesHandler,
  menuPerformanceHandler,
  customerAnalysisHandler,
  staffPerformanceReportHandler,
  inventoryReportHandler,
  financialReportHandler,
  supplierReportHandler,
  customReportHandler,
  exportReportHandler,
  savedReportsHandler,
  saveReportHandler,
  deleteSavedReportHandler
};
