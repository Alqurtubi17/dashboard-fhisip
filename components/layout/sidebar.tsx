'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import * as Icons from 'lucide-react'
import { ChevronDown, X, ShieldCheck } from 'lucide-react'
import { FhisipLogo } from '../ui/fhisip-logo'

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
    <aside className="w-72 h-full bg-[#002B49] text-slate-100 flex flex-col shadow-2xl relative z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 bg-gradient-to-b from-black/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FhisipLogo className="w-10 h-10" variant="gold" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-wide text-base">FHISIP UT</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  ADM
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium line-clamp-1">Fakultas Hukum, Sosial & Politik</p>
            </div>
          </div>
          {onMobileClose && (
            <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-xl hover:bg-white/10 text-slate-300">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-Header Banner */}
      <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2 text-xs text-amber-300 font-medium">
        <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
        <span className="truncate">Sistem Informasi Administrasi Kampus</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Navigasi Utama</div>

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
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <DynamicIcon name={menu.icon} className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{menu.name}</span>
              </Link>
            )
          }

          const expanded = open[menu.id] ?? isParentActive

          return (
            <div key={menu.id}>
              <button
                onClick={() => toggle(menu.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isParentActive
                    ? 'bg-white/10 text-white font-bold border-l-4 border-amber-400 pl-2.5'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <DynamicIcon name={menu.icon} className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{menu.name}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              {expanded && (
                <div className="ml-5 mt-1.5 space-y-1 border-l border-amber-400/30 pl-3">
                  {menu.children!.map((child) => {
                    const isChildActive = pathname === child.url
                    return (
                      <Link
                        key={child.id}
                        href={child.url || '#'}
                        onClick={onMobileClose}
                        className={`block px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                          isChildActive
                            ? 'text-amber-300 font-bold bg-white/10 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20 text-center">
        <p className="text-[11px] font-medium text-slate-300">Universitas Terbuka</p>
        <p className="text-[10px] text-slate-400 mt-0.5">PTTJJ - Pendidikan Jarak Jauh</p>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">{content}</div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  )
}
