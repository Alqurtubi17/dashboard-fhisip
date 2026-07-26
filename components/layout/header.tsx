'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Menu, Calendar, Building2 } from 'lucide-react'

export default function Header({
  user,
  onMenuToggle,
}: {
  user: { name: string; role: string }
  onMenuToggle?: () => void
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-ut-navy"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-3 text-xs border-r border-slate-200 pr-4">
          <div className="flex items-center gap-1.5 font-bold text-ut-navy bg-ut-navy/5 px-2.5 py-1 rounded-lg border border-ut-navy/10">
            <Building2 className="w-3.5 h-3.5 text-ut-blue" />
            <span>FHISIP UT</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>T.A. 2026/2027 Ganjil</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Selamat datang, <span className="text-ut-navy font-bold">{user.name}</span>
          </p>
          <p className="text-[11px] text-slate-500 hidden sm:block">Panel Administrasi Akademik & Layanan Data</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Info Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-ut-navy text-amber-400 font-bold text-xs flex items-center justify-center border border-ut-navy/20 shadow-sm">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-bold text-slate-800">{user.name}</p>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
          title="Keluar dari Sistem"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
