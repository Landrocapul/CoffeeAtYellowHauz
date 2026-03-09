import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="font-semibold">Coffee @ Yellowhauz POS</div>
          <nav className="flex gap-2 text-sm">
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                cx(
                  'rounded px-3 py-1.5',
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                )
              }
            >
              POS
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                cx(
                  'rounded px-3 py-1.5',
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                )
              }
            >
              Products
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                cx(
                  'rounded px-3 py-1.5',
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                )
              }
            >
              Reports
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
