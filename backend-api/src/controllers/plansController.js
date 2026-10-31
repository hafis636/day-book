const plansService = require('../services/plansService');

const getPlans = async (req, res) => {
  try {
    const plans = await plansService.getActivePlans();
    return res.json({ plans });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

module.exports = { getPlans };
