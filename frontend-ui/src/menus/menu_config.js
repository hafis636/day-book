import { normalizeRole } from './menuNames'
import { hasPermission } from '../utils/permissions'

const projectRoleMenu = {
  left: [
    { label: 'Dashboard', path: '/dashboard' },
    {
      label: 'Projects',
      children: [
        { label: 'Manage Projects', path: '/manage-projects' },
        {
          label: 'Add Projects',
          path: '/add-projects',
          permission: 'ADD_PROJECTS',
        }
      ]
    }
  ],
}

export const menuConfig = {
  default: {
    left: [{ label: 'Dashboard', path: '/dashboard' }],
    top: [
      { label: 'Profile', path: '/profile' },
      { label: 'Settings', path: '/settings' }
    ]
  },
  engineers: projectRoleMenu,
  architects: projectRoleMenu,
  'interior-designers': projectRoleMenu,
  admin: {
    left: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Modify plans', path: '/modify-plans' },
      { label: 'Roles & Permissions', path: '/roles-permissions' },
    ],
  },
}

const filterMenuItems = (items, permissions) =>
  items.flatMap((item) => {
    if (item.permission && !hasPermission(permissions, item.permission)) return []
    if (!item.children) return [item]

    const children = filterMenuItems(item.children, permissions)
    return children.length ? [{ ...item, children }] : []
  })

export const getMenuItems = (role, position, permissions) => {
  const roleConfig = menuConfig[normalizeRole(role)]
  return filterMenuItems(roleConfig?.[position] ?? menuConfig.default[position], permissions)
}
