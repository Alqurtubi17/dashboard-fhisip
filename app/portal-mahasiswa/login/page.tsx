'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { FhisipLogo } from '@/components/ui/fhisip-logo'

export default function StudentLoginPage() {
  const router = useRouter()
  const [nim, setNim] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Login | Portal Mahasiswa FHISIP'
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nim.trim() || !password.trim()) {
      setErrorMessage('NIM dan Password wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/mahasiswa/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: nim.trim(), password: password.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        setErrorMessage(json.error || 'NIM atau password tidak sesuai. Silakan periksa kembali.')
        return
      }

      // Berhasil login
      router.push('/portal-mahasiswa/dashboard')
    } catch (err: any) {
      setErrorMessage('Terjadi gangguan jaringan server. Silakan coba sesaat lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001D33] via-[#002B49] to-[#003B64] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full">
        {/* Brand Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 p-8 sm:p-10 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <FhisipLogo className="w-16 h-16" variant="gold" />
            </div>
            <div>
              <p className="text-md font-semibold text-slate-500 mt-2">
                Portal Pengajuan Pengguguran Mata Kuliah
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: 045130359"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#002B49] hover:bg-[#003B64] active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-blue-950/20 transition duration-150"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Portal</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </form>

          {/* Guide Card */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Info className="w-3.5 h-3.5" />
              <span>Petunjuk Login Mahasiswa</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Gunakan NIM resmi Universitas Terbuka. Untuk login pertama kali, gunakan password inisial{' '}
              <code className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">Ut@[NIM]</code>{' '}
              (contoh untuk NIM 1234567890: <code className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">Ut@1234567890</code>). Anda dapat mengubah password kapan saja di menu Profil.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

