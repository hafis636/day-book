import { hasPermission } from '../utils/permissions'
import { getMenuItems } from '../menus/menu_config'

test('grants access only when a permission is explicitly true', () => {
  expect(hasPermission({ ADD_PROJECTS: true }, 'ADD_PROJECTS')).toBe(true)
  expect(hasPermission({ ADD_PROJECTS: false }, 'ADD_PROJECTS')).toBe(false)
  expect(hasPermission({}, 'ADD_PROJECTS')).toBe(false)
  expect(hasPermission(undefined, 'ADD_PROJECTS')).toBe(false)
})

test('shows permission-gated menu items only when the permission is enabled', () => {
  const enabledItems = getMenuItems('engineers', 'left', { ADD_PROJECTS: true })
  const disabledItems = getMenuItems('engineers', 'left', { ADD_PROJECTS: false })

  expect(enabledItems[1].children.map((item) => item.label)).toContain('Add Projects')
  expect(disabledItems[1].children.map((item) => item.label)).not.toContain('Add Projects')
})

test.each(['engineers', 'architects', 'interior designers', 'architect', 'interior designer'])(
  'shows shared project navigation for %s',
  (role) => {
    const items = getMenuItems(role, 'left', { ADD_PROJECTS: true })

    expect(items[1].children.map((item) => item.label)).toEqual([
      'Manage Projects',
      'Add Projects',
    ])
  }
)
