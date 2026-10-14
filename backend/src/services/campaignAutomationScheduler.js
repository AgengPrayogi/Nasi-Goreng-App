const { evaluateActiveCampaigns } = require('./campaignService');

function startCampaignAutomationScheduler() {
  const intervalMs = Number(process.env.CAMPAIGN_AUTOMATION_INTERVAL_MS || 86400000);
  const run = async () => {
    try {
      const count = await evaluateActiveCampaigns();
      if (count) console.log(`Evaluated ${count} automated CRM campaign(s)`);
    } catch (error) {
      console.error('Campaign automation evaluation failed:', error.message);
    }
  };
  run();
  return setInterval(run, intervalMs);
}

module.exports = { startCampaignAutomationScheduler };