export const normalizeRole = (role) => {
  if (typeof role !== 'string') return ''

  return role.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const getRoleMenuId = (role, position) =>
  `${normalizeRole(role) || 'user'}-${position}-menu`
