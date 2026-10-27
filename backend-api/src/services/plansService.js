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

const updateUserPlan = async (userId, planCode) => {
  const result = await query(
    `UPDATE "daybook-dev-db".users AS u
     SET user_plan = $1
     WHERE u.id = $2
       AND EXISTS (
         SELECT 1
         FROM "daybook-dev-db".subscription_plans AS p
         WHERE p.plan_code = $1 AND p.is_active = TRUE
       )
     RETURNING u.user_plan`,
    [planCode, userId]
  );

  return result.rows[0] || null;
};

module.exports = { getActivePlans, updateUserPlan };
