const { query } = require('../config/db');

const getAdminRoles = async () => {
  const result = await query(
    'SELECT id, role_name, role_code, description, is_active FROM "daybook-dev-db".roles ORDER BY role_name'
  );

  return result.rows;
};

const createAdminRole = async (roleName, roleCode, description = '', isActive = true) => {
  const result = await query(
    `INSERT INTO "daybook-dev-db".roles (role_name, role_code, description, is_active)
     SELECT $1::text, $2::text, $3::text, $4::boolean
     WHERE NOT EXISTS (
       SELECT 1
       FROM "daybook-dev-db".roles
       WHERE UPPER(TRIM(role_name::text)) = UPPER(TRIM($1::text))
          OR UPPER(TRIM(role_code::text)) = UPPER(TRIM($2::text))
     )
     RETURNING id, role_name, role_code, description, is_active`,
    [roleName, roleCode, description, isActive]
  );

  return result.rows[0] || null;
};

const updateAdminRole = async (roleId, updates) => {
  const mutableColumns = {
    role_name: 'role_name',
    description: 'description',
    is_active: 'is_active',
  };
  const fields = Object.keys(mutableColumns).filter((field) =>
    Object.prototype.hasOwnProperty.call(updates, field)
  );
  if (fields.length === 0) {
    return null;
  }

  const params = [roleId];
  const assignments = fields.map((field) => {
    params.push(updates[field]);
    const cast = field === 'is_active' ? 'boolean' : 'text';
    return `${mutableColumns[field]} = $${params.length}::${cast}`;
  });
  const roleNamePlaceholder = fields.includes('role_name')
    ? `$${fields.indexOf('role_name') + 2}::text`
    : null;
  const duplicateGuard = roleNamePlaceholder
    ? `AND NOT EXISTS (
         SELECT 1
         FROM "daybook-dev-db".roles AS duplicate_role
         WHERE duplicate_role.id <> target_role.id
           AND UPPER(TRIM(duplicate_role.role_name::text)) =
               UPPER(TRIM(${roleNamePlaceholder}))
       )`
    : '';

  const result = await query(
    `UPDATE "daybook-dev-db".roles AS target_role
     SET ${assignments.join(', ')}
     WHERE target_role.id = $1
       ${duplicateGuard}
     RETURNING id, role_name, role_code, description, is_active`,
    params
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const existingRole = await query(
    'SELECT id FROM "daybook-dev-db".roles WHERE id = $1',
    [roleId]
  );
  if (existingRole.rows.length === 0) {
    return null;
  }

  if (roleNamePlaceholder) {
    const conflict = new Error('A role with this name already exists');
    conflict.code = 'ROLE_NAME_CONFLICT';
    throw conflict;
  }

  return null;
};

module.exports = { getAdminRoles, createAdminRole, updateAdminRole };
