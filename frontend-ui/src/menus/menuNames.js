export const normalizeRole = (role) => {
  if (typeof role !== 'string') return ''

  const normalizedRole = role
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (normalizedRole === 'administrator') return 'admin'
  if (normalizedRole === 'engineer') return 'engineers'
  if (normalizedRole === 'architect') return 'architects'
  if (normalizedRole === 'interior-designer') return 'interior-designers'
  return normalizedRole
}

export const getRoleMenuId = (role, position) =>
  `${normalizeRole(role) || 'user'}-${position}-menu`
