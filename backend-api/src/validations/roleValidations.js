const ROLE_NAME_MAX_LENGTH = 50;

const createRoleCode = (roleName) =>
  roleName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const validateRoleCreation = (body) => {
  const roleName = body?.role_name;
  if (typeof roleName !== 'string' || !roleName.trim()) {
    return 'Role name is required';
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'Role description must be a string';
  }

  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    return 'Role active status must be a boolean';
  }

  if (roleName.trim().length > ROLE_NAME_MAX_LENGTH) {
    return `Role name must be ${ROLE_NAME_MAX_LENGTH} characters or fewer`;
  }

  const roleCode = createRoleCode(roleName);
  if (!roleCode) {
    return 'Role name must include at least one letter or number';
  }

  if (roleCode === 'ADMIN') {
    return 'The administrator role is reserved';
  }

  return null;
};

const validateRoleUpdate = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Role details must be an object';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'role_code')) {
    return 'Role code cannot be changed';
  }

  const allowedFields = ['role_name', 'description', 'is_active'];
  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    return `Unexpected role field: ${unexpectedField}`;
  }

  if (Object.keys(body).length === 0) {
    return 'At least one role field must be provided';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'role_name')) {
    const roleName = body.role_name;
    if (typeof roleName !== 'string' || !roleName.trim()) {
      return 'Role name is required';
    }

    if (roleName.trim().length > ROLE_NAME_MAX_LENGTH) {
      return `Role name must be ${ROLE_NAME_MAX_LENGTH} characters or fewer`;
    }

    if (!createRoleCode(roleName)) {
      return 'Role name must include at least one letter or number';
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description') && typeof body.description !== 'string') {
    return 'Role description must be a string';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'is_active') && typeof body.is_active !== 'boolean') {
    return 'Role active status must be a boolean';
  }

  return null;
};

module.exports = { createRoleCode, validateRoleCreation, validateRoleUpdate };
