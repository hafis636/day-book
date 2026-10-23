import { normalizeRole } from './menuNames'

export const menuConfig = {
  default: {
    left: [{ label: 'Dashboard', path: '/dashboard' }],
    top: [
      { label: 'Profile', path: '/profile' },
      { label: 'Settings', path: '/settings' }
    ]
  },
  engineer: {
    left: [
      { label: 'Dashboard', path: '/dashboard' },
      {
        label: 'Projects',
        children: [
          { label: 'Manage Projects', path: '/manage-projects' },
          { label: 'Add Projects', path: '/add-projects' }
        ]
      }
    ],
  },
  admin: {
    left: [{ label: 'Dashboard', path: '/dashboard' }],
  },
}

export const getMenuItems = (role, position) => {
  const roleConfig = menuConfig[normalizeRole(role)]
  return roleConfig?.[position] ?? menuConfig.default[position]
}
