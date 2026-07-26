'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import Header from './header'

type MenuItem = {
  id: string
  name: string
  icon: string | null
  url: string | null
  children?: MenuItem[]
}

export default function DashboardShell({
  menus,
  user,
  children,
}: {
  menus: MenuItem[]
  user: { name: string; role: string }
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen ut-bg-pattern">
      <Sidebar menus={menus} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
