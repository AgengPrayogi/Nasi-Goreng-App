const SavedReport = require('../models/SavedReport');
const reportService = require('./reportService');
const { sendReportEmail } = require('./emailService');

function nextScheduleDate(frequency, from = new Date()) {
  const next = new Date(from);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}

async function runScheduledReports() {
  const now = new Date();
  const reports = await SavedReport.find({ 'schedule.enabled': true, 'schedule.recipients.0': { $exists: true }, $or: [{ 'schedule.nextSend': null }, { 'schedule.nextSend': { $lte: now } }] });
  for (const report of reports) {
    const query = { from: report.filters?.dateFrom, to: report.filters?.dateTo, ...(report.filters?.customFilters || {}) };
    const data = await reportService.generateReport(report.reportType, query);
    const exported = await reportService.exportReport(data, 'pdf');
    await sendReportEmail(report.schedule.recipients, `Scheduled report: ${report.name}`, `Attached is the scheduled ${report.reportType} report.`, exported);
    report.schedule.lastSent = now;
    report.schedule.nextSend = nextScheduleDate(report.schedule.frequency, now);
    await report.save();
  }
  return reports.length;
}

function startReportScheduler() {
  const intervalMs = Number(process.env.REPORT_SCHEDULER_INTERVAL_MS || 3600000);
  const run = () => runScheduledReports().catch((error) => console.error('Scheduled report failed:', error.message));
  run();
  return setInterval(run, intervalMs);
}

module.exports = { startReportScheduler, runScheduledReports, nextScheduleDate };