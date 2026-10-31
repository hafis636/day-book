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

module.exports = { getActivePlans };
