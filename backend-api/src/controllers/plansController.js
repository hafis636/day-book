const plansService = require('../services/plansService');
const { validatePlanUpdate } = require('../validations/planValidations');

const getPlans = async (req, res) => {
  try {
    const plans = await plansService.getActivePlans();
    return res.json({ plans });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

const getAdminPlans = async (req, res) => {
  try {
    const plans = await plansService.getAllCustomerPlans();
    return res.json({ plans });
  } catch (error) {
    console.error('Failed to fetch plans for administration:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

const updateAdminPlan = async (req, res) => {
  const planCode = String(req.params.planCode || '').trim();
  if (!planCode || planCode.length > 50) {
    return res.status(400).json({ error: 'A valid plan code is required' });
  }
  if (planCode.toUpperCase() === 'ADMIN') {
    return res.status(403).json({ error: 'The admin plan cannot be modified' });
  }

  const validationError = validatePlanUpdate(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const plan = await plansService.updateCustomerPlan(planCode, req.body);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    return res.json({ plan });
  } catch (error) {
    console.error('Failed to update subscription plan:', error);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
};

module.exports = { getPlans, getAdminPlans, updateAdminPlan };
