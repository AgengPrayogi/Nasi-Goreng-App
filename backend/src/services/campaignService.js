const Campaign = require('../models/Campaign');
const { AppError } = require('../errors/AppError');

async function listCampaigns(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  return Campaign.find(filter).sort({ startDate: -1 }).limit(100).lean();
}

async function getCampaignById(id) {
  const campaign = await Campaign.findById(id).lean();
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
  return campaign;
}

async function createCampaign(data, adminId) {
  return Campaign.create({ ...data, createdBy: adminId });
}

async function updateCampaign(id, data) {
  const campaign = await Campaign.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
  return campaign;
}

module.exports = {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign
};
