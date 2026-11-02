const { query } = require('../config/db');

const getAdminPermissions = async () => {
  const result = await query(
    `SELECT id, permission_key, plan_ids, role_ids, description, is_active
     FROM "daybook-dev-db".permissions
     ORDER BY permission_key`
  );

  return result.rows;
};

const createAdminPermission = async ({
  permissionKey,
  planCodes,
  roleIds,
  description,
  isActive,
}) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0 || roleIds.some(
    (roleId) => typeof roleId !== 'string' || roleId.trim() === ''
  )) {
    const error = new Error('At least one valid role must be selected');
    error.code = 'INVALID_ROLE_ASSIGNMENT';
    throw error;
  }

  if (!Array.isArray(planCodes) || planCodes.length === 0 || planCodes.some(
    (planCode) => typeof planCode !== 'string' || planCode.trim() === ''
  )) {
    const error = new Error('At least one valid plan must be selected');
    error.code = 'INVALID_PLAN_ASSIGNMENT';
    throw error;
  }

  if (roleIds.length > 0) {
    const roles = await query(
      `SELECT id::text AS id
       FROM "daybook-dev-db".roles
       WHERE id::text = ANY($1::text[])
         AND UPPER(TRIM(role_code::text)) <> 'ADMIN'`,
      [roleIds]
    );
    if (roles.rows.length !== new Set(roleIds).size) {
      const error = new Error('One or more selected roles are invalid or unavailable');
      error.code = 'INVALID_ROLE_ASSIGNMENT';
      throw error;
    }
  }

  if (planCodes.length > 0) {
    const plans = await query(
      `SELECT plan_code
       FROM "daybook-dev-db".subscription_plans
       WHERE plan_code = ANY($1::text[])
         AND UPPER(TRIM(plan_code::text)) <> 'ADMIN'`,
      [planCodes]
    );
    if (plans.rows.length !== new Set(planCodes).size) {
      const error = new Error('One or more selected plans are invalid or unavailable');
      error.code = 'INVALID_PLAN_ASSIGNMENT';
      throw error;
    }
  }

  const result = await query(
    `INSERT INTO "daybook-dev-db".permissions
       (permission_key, plan_ids, role_ids, description, is_active)
     SELECT $1::text, $2::json, $3::json, $4::text, $5::boolean
     WHERE NOT EXISTS (
       SELECT 1
       FROM "daybook-dev-db".permissions
       WHERE permission_key = $1::text
     )
     RETURNING id, permission_key, plan_ids, role_ids, description, is_active`,
    [
      permissionKey,
      JSON.stringify(planCodes),
      JSON.stringify(roleIds),
      description,
      isActive,
    ]
  );

  return result.rows[0] || null;
};

const updateAdminPermission = async (
  permissionId,
  { planCodes, roleIds, description, isActive }
) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0 || roleIds.some(
    (roleId) => typeof roleId !== 'string' || roleId.trim() === ''
  )) {
    const error = new Error('At least one valid role must be selected');
    error.code = 'INVALID_ROLE_ASSIGNMENT';
    throw error;
  }

  if (!Array.isArray(planCodes) || planCodes.length === 0 || planCodes.some(
    (planCode) => typeof planCode !== 'string' || planCode.trim() === ''
  )) {
    const error = new Error('At least one valid plan must be selected');
    error.code = 'INVALID_PLAN_ASSIGNMENT';
    throw error;
  }

  const roles = await query(
    `SELECT id::text AS id
     FROM "daybook-dev-db".roles
     WHERE id::text = ANY($1::text[])
       AND UPPER(TRIM(role_code::text)) <> 'ADMIN'`,
    [roleIds]
  );
  if (roles.rows.length !== new Set(roleIds).size) {
    const error = new Error('One or more selected roles are invalid or unavailable');
    error.code = 'INVALID_ROLE_ASSIGNMENT';
    throw error;
  }

  const plans = await query(
    `SELECT plan_code
     FROM "daybook-dev-db".subscription_plans
     WHERE plan_code = ANY($1::text[])
       AND UPPER(TRIM(plan_code::text)) <> 'ADMIN'`,
    [planCodes]
  );
  if (plans.rows.length !== new Set(planCodes).size) {
    const error = new Error('One or more selected plans are invalid or unavailable');
    error.code = 'INVALID_PLAN_ASSIGNMENT';
    throw error;
  }

  const result = await query(
    `UPDATE "daybook-dev-db".permissions
     SET plan_ids = $1::json,
         role_ids = $2::json,
         description = $3::text,
         is_active = $4::boolean
     WHERE id::text = $5::text
     RETURNING id, permission_key, plan_ids, role_ids, description, is_active`,
    [
      JSON.stringify(planCodes),
      JSON.stringify(roleIds),
      description,
      isActive,
      String(permissionId),
    ]
  );

  return result.rows[0] || null;
};

module.exports = { getAdminPermissions, createAdminPermission, updateAdminPermission };
