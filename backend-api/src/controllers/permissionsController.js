const permissionsService = require('../services/permissionsService');
const {
  validatePermissionCreation,
  validatePermissionUpdate,
} = require('../validations/permissionValidations');

const getAdminPermissions = async (req, res) => {
  try {
    const permissions = await permissionsService.getAdminPermissions();
    return res.json(permissions);
  } catch (error) {
    console.error('Failed to fetch permissions for administration:', error);
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

const createAdminPermission = async (req, res) => {
  const validationError = validatePermissionCreation(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const permission = await permissionsService.createAdminPermission({
      permissionKey: req.body.permission_key.trim(),
      roleIds: req.body.role_ids,
      planCodes: req.body.plan_ids,
      description: (req.body.description ?? '').trim(),
      isActive: req.body.is_active ?? true,
    });
    if (!permission) {
      return res.status(409).json({ error: 'A permission with this key already exists' });
    }

    return res.status(201).json({ permission });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A permission with this key already exists' });
    }
    if (error.code === 'INVALID_ROLE_ASSIGNMENT' || error.code === 'INVALID_PLAN_ASSIGNMENT') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Failed to create permission:', error);
    return res.status(500).json({ error: 'Failed to create permission' });
  }
};

const updateAdminPermission = async (req, res) => {
  const validationError = validatePermissionUpdate(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const permission = await permissionsService.updateAdminPermission(req.params.permissionId, {
      roleIds: req.body.role_ids,
      planCodes: req.body.plan_ids,
      description: req.body.description.trim(),
      isActive: req.body.is_active,
    });
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    return res.json({ permission });
  } catch (error) {
    if (error.code === 'INVALID_ROLE_ASSIGNMENT' || error.code === 'INVALID_PLAN_ASSIGNMENT') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Permission update conflicts with an existing record' });
    }
    console.error('Failed to update permission:', error);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
};

module.exports = { getAdminPermissions, createAdminPermission, updateAdminPermission };
