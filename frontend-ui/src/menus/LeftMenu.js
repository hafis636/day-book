import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getRoleMenuId } from './menuNames'
import { getMenuItems } from './menu_config'

export const LeftMenuToggle = ({ role, open, onToggle }) => {
  const menuId = getRoleMenuId(role, 'left')

  return (
    <button
      type="button"
      aria-controls={menuId}
      aria-expanded={open}
      aria-label={open ? 'Close navigation menu panel' : 'Open navigation menu'}
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {open ? '×' : '☰'}
      </span>
    </button>
  )
}

const LeftMenu = ({ role, open }) => {
  const menuId = getRoleMenuId(role, 'left')
  const menuItems = getMenuItems(role, 'left')
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState(() =>
    menuItems.reduce((expanded, item) => {
      if (item.children?.some((child) => child.path === location.pathname)) {
        expanded[item.label] = true
      }
      return expanded
    }, {})
  )

  return (
    <aside
      id={menuId}
      aria-hidden={!open}
      inert={!open}
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }}
      className={`fixed bottom-0 left-0 top-[4.5rem] z-40 w-60 border-r border-slate-200 bg-white p-4 shadow-xl transition-[transform,width,padding] duration-200 ease-out lg:static lg:z-auto lg:h-auto lg:translate-x-0 lg:opacity-100 lg:visible lg:shadow-none lg:shrink-0 ${
        open
          ? 'overflow-y-auto lg:w-60'
          : 'overflow-hidden lg:w-0 lg:border-r-0 lg:p-0'
      }`}
    >
      <nav aria-label={menuId}>
        {menuItems.map((item) => {
          if (!item.children) {
            return (
              <NavLink
                key={`${item.label}-${item.path}`}
                to={item.path}
                className={({ isActive }) =>
                  `mb-1 block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            )
          }

          const isExpanded = Boolean(expandedItems[item.label])
          const hasActiveChild = item.children.some((child) => child.path === location.pathname)

          return (
            <div key={item.label}>
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() =>
                  setExpandedItems((current) => ({
                    ...current,
                    [item.label]: !current[item.label]
                  }))
                }
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  hasActiveChild
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
                <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
              </button>
              {isExpanded && (
                <div className="ml-3 border-l border-slate-200 pl-2">
                  {item.children.map((child) => (
                    <NavLink
                      key={`${child.label}-${child.path}`}
                      to={child.path}
                      className={({ isActive }) =>
                        `mb-1 block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default LeftMenu
