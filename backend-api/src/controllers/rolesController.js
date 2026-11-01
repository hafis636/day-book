const rolesService = require('../services/rolesService');
const {
  createRoleCode,
  validateRoleCreation,
  validateRoleUpdate,
} = require('../validations/roleValidations');

const getAdminRoles = async (req, res) => {
  try {
    const roles = await rolesService.getAdminRoles();
    return res.json(roles);
  } catch (error) {
    console.error('Failed to fetch roles for administration:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

const createAdminRole = async (req, res) => {
  const validationError = validateRoleCreation(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const roleName = req.body.role_name.trim();
  const roleCode = createRoleCode(roleName);
  const description = (req.body.description ?? '').trim();
  const isActive = req.body.is_active ?? true;

  try {
    const role = await rolesService.createAdminRole(
      roleName,
      roleCode,
      description,
      isActive
    );
    if (!role) {
      return res.status(409).json({ error: 'A role with this name or code already exists' });
    }

    return res.status(201).json({ role });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name or code already exists' });
    }
    console.error('Failed to create role:', error);
    return res.status(500).json({ error: 'Failed to create role' });
  }
};

const updateAdminRole = async (req, res) => {
  const validationError = validateRoleUpdate(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'role_name')) {
    updates.role_name = req.body.role_name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
    updates.description = req.body.description.trim();
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'is_active')) {
    updates.is_active = req.body.is_active;
  }

  try {
    const role = await rolesService.updateAdminRole(req.params.roleId, updates);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    return res.json({ role });
  } catch (error) {
    if (error.code === 'ROLE_NAME_CONFLICT' || error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }
    console.error('Failed to update role:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
};

module.exports = { getAdminRoles, createAdminRole, updateAdminRole };
