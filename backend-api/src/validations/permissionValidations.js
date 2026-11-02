const validatePermissionCreation = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Permission details must be an object';
  }

  if (typeof body.permission_key !== 'string' || !/^[A-Z_]+$/.test(body.permission_key)) {
    return 'Permission key must contain only uppercase letters and underscores';
  }

  for (const [field, label] of [['role_ids', 'role'], ['plan_ids', 'plan']]) {
    if (Array.isArray(body[field]) && body[field].length === 0) {
      return `At least one ${label} must be selected`;
    }

    if (
      !Array.isArray(body[field]) ||
      body[field].some((value) => typeof value !== 'string' || value.trim() === '')
    ) {
      return `${field} must be an array of non-empty strings`;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'description') &&
    typeof body.description !== 'string'
  ) {
    return 'Description must be a string';
  }
  if (
    Object.prototype.hasOwnProperty.call(body, 'is_active') &&
    typeof body.is_active !== 'boolean'
  ) {
    return 'Active status must be a boolean';
  }

  return null;
};

const validatePermissionUpdate = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Permission updates must be an object';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'permission_key')) {
    return 'Permission key cannot be changed';
  }

  const allowedFields = ['role_ids', 'plan_ids', 'description', 'is_active'];
  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    return `Unexpected permission field: ${unexpectedField}`;
  }

  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return `${field} is required`;
    }
  }

  for (const [field, label] of [['role_ids', 'role'], ['plan_ids', 'plan']]) {
    if (!Array.isArray(body[field])) {
      return `${field} must be an array of non-empty strings`;
    }
    if (body[field].length === 0) {
      return `At least one ${label} must be selected`;
    }
    if (body[field].some((value) => typeof value !== 'string' || value.trim() === '')) {
      return `${field} must be an array of non-empty strings`;
    }
  }

  if (typeof body.description !== 'string') {
    return 'Description must be a string';
  }
  if (typeof body.is_active !== 'boolean') {
    return 'Active status must be a boolean';
  }

  return null;
};

module.exports = { validatePermissionCreation, validatePermissionUpdate };
