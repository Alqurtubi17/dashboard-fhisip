'use client'

import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Mail, ShieldCheck, Building2, Eye, EyeOff } from 'lucide-react'
import { FhisipLogo } from '@/components/ui/fhisip-logo'

const loginSchema = z.object({
  email: z.string().email('Masukkan email yang valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type LoginForm = z.infer<typeof loginSchema>

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(json.error ?? 'Login gagal')
        return
      }
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      router.push(redirectTo)
      router.refresh()
    } catch {
      setServerError('Terjadi kesalahan jaringan, coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">
          Email Sivitas / Administrator
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            {...register('email')}
            type="email"
            placeholder="admin@kampus.ac.id"
            className="input pl-10 focus:ring-ut-blue"
            autoComplete="email"
          />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">
          Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="input pl-10 pr-10 focus:ring-ut-blue"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-lg"
            title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>}
      </div>

      {serverError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold flex items-center gap-2">
          <span>⚠️ {serverError}</span>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-bold shadow-lg">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
        {loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Dashboard FHISIP'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  useEffect(() => {
    document.title = 'Login | FHISIP'
  }, [])

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-[#001D33] via-[#002B49] to-[#004273] px-4 py-8 overflow-hidden">
      {/* Decorative Orbs & Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,199,0,0.12)_0%,transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,86,145,0.25)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-ut-blue/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Top Institutional Header Badge */}
        <div className="text-center space-y-2">
          <div className="flex justify-center my-3">
            <FhisipLogo className="w-20 h-20 shadow-2xl rounded-2xl" variant="gold" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">FHISIP UT DASHBOARD</h1>
          <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
            Fakultas Hukum, Ilmu Sosial dan Ilmu Politik - Universitas Terbuka
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-6 sm:p-8 backdrop-blur-xl bg-white/95 border border-white/40 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Autentikasi Akses</h2>
              <p className="text-xs text-slate-500">Masukkan kredensial akun terdaftar</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-ut-navy/10 text-ut-navy text-[11px] font-bold border border-ut-navy/15 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-ut-blue" />
              <span>PTTJJ</span>
            </div>
          </div>

          <Suspense fallback={<div className="text-center py-6 text-slate-400 text-xs font-semibold">Memuat form login...</div>}>
            <LoginFormContent />
          </Suspense>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Pengguna Superadmin Default: <br />
              <span className="font-mono font-bold text-ut-navy bg-slate-100 px-1.5 py-0.5 rounded">admin@kampus.ac.id</span> /{' '}
              <span className="font-mono font-bold text-ut-navy bg-slate-100 px-1.5 py-0.5 rounded">Admin123!</span>
            </p>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="text-center text-slate-300 text-xs space-y-1">
          <p>© {new Date().getFullYear()} Universitas Terbuka. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">Pendidikan Tinggi Terbuka dan Jarak Jauh (PTTJJ)</p>
        </div>
      </div>
    </div>
  )
}
