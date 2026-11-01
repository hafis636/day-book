const PLAN_FIELDS = [
  'plan_name',
  'description',
  'monthly_price',
  'yearly_price',
  'is_active',
];

const validatePlanUpdate = (plan) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return 'Plan details are required';
  }

  const keys = Object.keys(plan);
  if (
    keys.length !== PLAN_FIELDS.length ||
    PLAN_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(plan, field)) ||
    keys.some((field) => !PLAN_FIELDS.includes(field))
  ) {
    return 'Plan details must include only name, description, prices, and active status';
  }

  if (
    typeof plan.plan_name !== 'string' ||
    !plan.plan_name.trim() ||
    plan.plan_name.trim().length > 100
  ) {
    return 'Plan name must be between 1 and 100 characters';
  }

  if (typeof plan.description !== 'string' || plan.description.length > 1000) {
    return 'Plan description must be 1000 characters or fewer';
  }

  for (const field of ['monthly_price', 'yearly_price']) {
    const price = plan[field];
    if (
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 999999999.99 ||
      Number(price.toFixed(2)) !== price
    ) {
      return `${field === 'monthly_price' ? 'Monthly' : 'Yearly'} price must be a non-negative amount with at most two decimal places`;
    }
  }

  if (typeof plan.is_active !== 'boolean') {
    return 'Active status must be true or false';
  }

  return null;
};

module.exports = { validatePlanUpdate };
