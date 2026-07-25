'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import * as Icons from 'lucide-react'
import { GraduationCap, ChevronDown, X } from 'lucide-react'

type MenuItem = {
  id: string
  name: string
  icon: string | null
  url: string | null
  children?: MenuItem[]
}

function DynamicIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (Icons as any)[name]) || Icons.Circle
  return <Icon className={className} />
}

export default function Sidebar({
  menus,
  mobileOpen = false,
  onMobileClose,
}: {
  menus: MenuItem[]
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  const content = (
    <aside className="w-64 h-full bg-white/90 backdrop-blur-md border-r border-slate-100 flex flex-col">
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-slate-800 tracking-tight">AMP FHISIP</span>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menus.map((menu) => {
          const hasChildren = menu.children && menu.children.length > 0
          const isActive = menu.url && pathname === menu.url
          const isParentActive = hasChildren && menu.children!.some((c) => c.url === pathname)

          if (!hasChildren) {
            return (
              <Link
                key={menu.id}
                href={menu.url || '#'}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <DynamicIcon name={menu.icon} className="w-4 h-4" />
                {menu.name}
              </Link>
            )
          }

          const expanded = open[menu.id] ?? isParentActive

          return (
            <div key={menu.id}>
              <button
                onClick={() => toggle(menu.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isParentActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <DynamicIcon name={menu.icon} className="w-4 h-4" />
                  {menu.name}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div className="ml-6 mt-1 space-y-1 border-l border-slate-100 pl-3">
                  {menu.children!.map((child) => (
                    <Link
                      key={child.id}
                      href={child.url || '#'}
                      onClick={onMobileClose}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                        pathname === child.url
                          ? 'text-primary font-semibold bg-primary/5'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">{content}</div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  )
}
