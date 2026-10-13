import React from 'react'
import { NavLink } from 'react-router-dom'
import { getRoleMenuId } from './menuNames'
import { getMenuItems } from './menu_config'

export const LeftMenuToggle = ({ role, open, onToggle }) => {
  const menuId = getRoleMenuId(role, 'left')

  return (
    <button
      type="button"
      aria-controls={menuId}
      aria-expanded={open}
      aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {open ? '×' : '☰'}
      </span>
      <span className="hidden sm:inline">Menu</span>
    </button>
  )
}

const LeftMenu = ({ role, open }) => {
  const menuId = getRoleMenuId(role, 'left')
  const menuItems = getMenuItems(role, 'left')

  return (
    <aside
      id={menuId}
      hidden={!open}
      className="w-60 shrink-0 border-r border-slate-200 bg-white p-4"
    >
      <nav aria-label={menuId}>
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {role || 'User'} menu
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={`${item.label}-${item.path}`}
            to={item.path}
            className={({ isActive }) =>
              `mb-1 block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default LeftMenu
