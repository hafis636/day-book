import { Link } from 'react-router-dom'
import { getRoleMenuId } from './menuNames'
import { getMenuItems } from './menu_config'
import React from 'react'

const TopMenu = ({ role, displayName, isLoading, onLogout }) => {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuId = getRoleMenuId(role, 'top')
  const menuItems = getMenuItems(role, 'top')

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden text-sm font-medium text-slate-700 sm:block">
          {displayName}
        </span>
        <span aria-hidden="true" className="text-slate-500">▾</span>
      </button>
      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          {role && (
            <>
              <div role="none" className="px-3 py-2">
                <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800">
                  {role}
                </p>
              </div>
              <hr className="my-1 border-slate-200" />
            </>
          )}
          {menuItems.map((item) => (
            <Link
              key={`${item.label}-${item.path}`}
              to={item.path}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={isLoading}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {isLoading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}

export default TopMenu
