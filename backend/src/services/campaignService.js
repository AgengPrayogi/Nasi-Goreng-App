const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
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

async function evaluateCampaign(id) {
  const campaign = await Campaign.findById(id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
  const target = campaign.targetSegment || {};
  const filter = { isActive: true };
  if (target.customerTiers?.length) filter.tier = { $in: target.customerTiers };
  if (target.audienceSegments?.length) filter.audienceSegment = { $in: target.audienceSegments };
  if (target.minOrders > 0) filter.totalOrders = { $gte: target.minOrders };
  if (target.minSpent > 0) filter.totalSpent = { $gte: target.minSpent };
  if (campaign.automation?.trigger === 'inactivity') {
    const cutoff = new Date(Date.now() - campaign.automation.inactivityDays * 86400000);
    filter.lastOrderDate = { $lt: cutoff };
  }
  const customers = await Customer.find(filter).select('_id name phone audienceSegment tier lastOrderDate').lean();
  campaign.automation.lastEvaluatedAt = new Date();
  campaign.automation.lastMatchedCount = customers.length;
  await campaign.save();
  return { campaignId: campaign._id, matchedCount: customers.length, customers, evaluatedAt: campaign.automation.lastEvaluatedAt };
}

async function evaluateActiveCampaigns() {
  const campaigns = await Campaign.find({ status: 'active', 'automation.enabled': true }).select('_id').lean();
  let evaluated = 0;
  for (const campaign of campaigns) {
    await evaluateCampaign(campaign._id);
    evaluated += 1;
  }
  return evaluated;
}

module.exports = {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  evaluateCampaign,
  evaluateActiveCampaigns
};
