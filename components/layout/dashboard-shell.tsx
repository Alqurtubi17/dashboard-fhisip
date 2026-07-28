'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()

  useEffect(() => {
    const findMenuTitle = (items: MenuItem[], path: string): string | null => {
      for (const item of items) {
        if (item.url && item.url === path) return item.name
        if (item.children) {
          const found = findMenuTitle(item.children, path)
          if (found) return found
        }
      }
      return null
    }

    let pageTitle = findMenuTitle(menus, pathname)

    if (!pageTitle) {
      const pathMap: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/laporan': 'Laporan',
        '/users': 'Manajemen User',
        '/roles': 'Role & Akses',
        '/menus': 'Manajemen Menu',
        '/mahasiswa': 'Data Mahasiswa',
        '/akademik': 'Layanan Akademik',
        '/kemahasiswaan': 'Kemahasiswaan',
        '/audit': 'Audit Log',
      }
      pageTitle = pathMap[pathname]

      if (!pageTitle) {
        const segments = pathname.split('/').filter(Boolean)
        if (segments.length > 0) {
          pageTitle = segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
        } else {
          pageTitle = 'Dashboard'
        }
      }
    }

    document.title = `${pageTitle} | FHISIP`
  }, [pathname, menus])

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
