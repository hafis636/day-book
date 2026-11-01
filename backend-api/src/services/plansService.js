const { query } = require('../config/db');

const getActivePlans = async () => {
  const result = await query(
    `SELECT plan_code, plan_name, description, monthly_price, yearly_price, is_active
     FROM "daybook-dev-db".subscription_plans
     WHERE is_active = TRUE
     ORDER BY monthly_price ASC, plan_name ASC`
  );

  return result.rows;
};

const getAllCustomerPlans = async () => {
  const result = await query(
    `SELECT plan_code, plan_name, description, monthly_price, yearly_price, is_active
     FROM "daybook-dev-db".subscription_plans
     WHERE UPPER(TRIM(plan_code)) <> 'ADMIN'
     ORDER BY monthly_price ASC, plan_name ASC`
  );

  return result.rows;
};

const updateCustomerPlan = async (planCode, plan) => {
  const result = await query(
    `UPDATE "daybook-dev-db".subscription_plans
     SET plan_name = $2,
         description = $3,
         monthly_price = $4,
         yearly_price = $5,
         is_active = $6
     WHERE UPPER(TRIM(plan_code)) = UPPER(TRIM($1))
       AND UPPER(TRIM(plan_code)) <> 'ADMIN'
     RETURNING plan_code, plan_name, description, monthly_price, yearly_price, is_active`,
    [
      planCode,
      plan.plan_name.trim(),
      plan.description.trim(),
      plan.monthly_price,
      plan.yearly_price,
      plan.is_active,
    ]
  );

  return result.rows[0] || null;
};

module.exports = { getActivePlans, getAllCustomerPlans, updateCustomerPlan };
