'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'

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
    <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <p className="text-sm font-medium text-slate-700">
            Halo, {user.name.split(' ')[0]} <span className="inline-block animate-bounce">👋</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-slate-700">{user.name}</p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
          title="Keluar dari Sistem"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
