'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  GraduationCap,
  LayoutDashboard,
  BookX,
  History,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Clock,
  Sparkles,
} from 'lucide-react'
import { FhisipLogo } from '@/components/ui/fhisip-logo'

type StudentProfile = {
  nim: string
  name: string
  prodi: string
  prodiCode: string
  semester: number
}

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isLoginPage = pathname === '/portal-mahasiswa/login'

  useEffect(() => {
    if (isLoginPage) return

    fetch('/api/mahasiswa/me')
      .then((res) => {
        if (!res.ok) {
          router.replace('/portal-mahasiswa/login')
          return null
        }
        return res.json()
      })
      .then((json) => {
        if (json && json.success) {
          setStudent(json.student)
        }
      })
      .catch(() => {
        router.replace('/portal-mahasiswa/login')
      })
  }, [pathname, isLoginPage, router])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await fetch('/api/mahasiswa/auth/logout', { method: 'POST' })
      router.replace('/portal-mahasiswa/login')
    } catch {
      router.replace('/portal-mahasiswa/login')
    } finally {
      setLoggingOut(false)
    }
  }

  // Jika di halaman login mahasiswa, render polos tanpa student header
  if (isLoginPage) {
    return <>{children}</>
  }

  const navLinks = [
    { label: 'Dashboard', href: '/portal-mahasiswa/dashboard', icon: LayoutDashboard },
    { label: 'Pengajuan Pengguguran', href: '/portal-mahasiswa/pengguguran', icon: BookX },
    { label: 'Riwayat Pengajuan', href: '/portal-mahasiswa/riwayat', icon: History },
    { label: 'Profil Saya', href: '/portal-mahasiswa/profil', icon: User },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#002B49] text-white shadow-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Brand */}
          <div className="flex items-center gap-3">
            <Link href="/portal-mahasiswa/dashboard" className="flex items-center gap-2.5 group">
              <FhisipLogo className="w-8 h-8" variant="gold" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-base tracking-wide">FHISIP UT</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider">
                    PORTAL MAHASISWA
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium hidden sm:block">
                  Sistem Layanan Akademik Mandiri
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/portal-mahasiswa/dashboard' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile Pill & Logout */}
          <div className="hidden md:flex items-center gap-3">
            {student && (
              <div className="text-right">
                <div className="text-xs font-bold text-white truncate max-w-[160px]">{student.name}</div>
                <div className="text-[10px] font-mono text-amber-300">NIM: {student.nim}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-slate-200 hover:text-white transition shadow-sm"
              title="Keluar dari Portal Mahasiswa"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/10 text-slate-200 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#00223A] px-4 pt-3 pb-5 space-y-2">
            {student && (
              <div className="p-3 mb-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs font-bold text-white">{student.name}</div>
                <div className="text-[11px] font-mono text-amber-300">NIM: {student.nim}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{student.prodi}</div>
              </div>
            )}

            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/portal-mahasiswa/dashboard' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Fakultas Hukum, Ilmu Sosial, dan Ilmu Politik (FHISIP)</p>
        <p className="mt-0.5">Universitas Terbuka © {new Date().getFullYear()} — Portal Layanan Akademik Mahasiswa</p>
      </footer>
    </div>
  )
}

