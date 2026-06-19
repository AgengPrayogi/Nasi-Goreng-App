const campaignService = require('../services/campaignService');

async function listCampaignsHandler(req, res, next) {
  try {
    const data = await campaignService.listCampaigns(req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getCampaignHandler(req, res, next) {
  try {
    const data = await campaignService.getCampaignById(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function createCampaignHandler(req, res, next) {
  try {
    const data = await campaignService.createCampaign(req.body, req.user?.id);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function updateCampaignHandler(req, res, next) {
  try {
    const data = await campaignService.updateCampaign(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  updateCampaignHandler
};
