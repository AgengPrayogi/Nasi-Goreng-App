const { evaluateAllCustomerTiers } = require('./customerService');

const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

function startCustomerTierScheduler() {
  const interval = Number(process.env.CUSTOMER_TIER_EVALUATION_INTERVAL_MS) || WEEK_IN_MILLISECONDS;
  let running = false;

  const evaluate = async () => {
    if (running) return;
    running = true;
    try {
      const count = await evaluateAllCustomerTiers({ reason: 'scheduled_weekly_evaluation' });
      console.log(`Customer tier evaluation completed for ${count} customers`);
    } catch (err) {
      console.error('Customer tier evaluation failed:', err);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(evaluate, interval);
  timer.unref();
  evaluate();
  return { evaluate, timer };
}

module.exports = { startCustomerTierScheduler };