const alertService = require('../services/alertService');

async function getAlertsHandler(req, res, next) {
  try {
    const data = await alertService.getAlerts(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeAlertHandler(req, res, next) {
  try {
    const data = await alertService.acknowledgeAlert(req.params.id, req.user?.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function resolveAlertHandler(req, res, next) {
  try {
    const data = await alertService.resolveAlert(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getAlertHistoryHandler(req, res, next) {
  try {
    const data = await alertService.getAlertHistory(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getAlertConfigsHandler(req, res, next) {
  try {
    const data = await alertService.getAlertConfigs();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function createAlertConfigHandler(req, res, next) {
  try {
    const data = await alertService.createAlertConfig({
      ...req.body,
      createdBy: req.user?.id
    });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateAlertConfigHandler(req, res, next) {
  try {
    const data = await alertService.updateAlertConfig(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function deleteAlertConfigHandler(req, res, next) {
  try {
    const data = await alertService.deleteAlertConfig(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function checkAlertsHandler(req, res, next) {
  try {
    const data = await alertService.checkAndGenerateAlerts();
    res.json({ data, message: `${data.length} alerts generated` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAlertsHandler,
  acknowledgeAlertHandler,
  resolveAlertHandler,
  getAlertHistoryHandler,
  getAlertConfigsHandler,
  createAlertConfigHandler,
  updateAlertConfigHandler,
  deleteAlertConfigHandler,
  checkAlertsHandler
};