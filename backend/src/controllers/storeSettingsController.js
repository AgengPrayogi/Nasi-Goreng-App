const { getStoreSettings, updateStoreSettings } = require('../services/storeSettingsService');

async function getStoreSettingsHandler(req, res, next) {
  try {
    res.json({ data: await getStoreSettings() });
  } catch (err) {
    next(err);
  }
}

async function updateStoreSettingsHandler(req, res, next) {
  try {
    res.json({ data: await updateStoreSettings(req.body, req.user.id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStoreSettingsHandler, updateStoreSettingsHandler };
