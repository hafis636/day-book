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

const selectPlan = async (req, res) => {
  try {
    const user = await plansService.updateUserPlan(
      req.authenticatedUser.id,
      req.params.planCode
    );

    if (!user) {
      return res.status(404).json({ error: 'Active plan not found' });
    }

    return res.json({ user_plan: user.user_plan });
  } catch (error) {
    console.error('Failed to update user plan:', error);
    return res.status(500).json({ error: 'Failed to update user plan' });
  }
};

module.exports = { getPlans, selectPlan };
