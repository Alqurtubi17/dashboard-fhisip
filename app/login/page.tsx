'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { GraduationCap, Loader2, Lock, Mail } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Masukkan email yang valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 backdrop-blur-sm bg-white/80">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Academic Management Platform</h1>
            <p className="text-sm text-slate-500 mt-1">Masuk untuk melanjutkan ke dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="nama@kampus.ac.id"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="input pl-10"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Default superadmin: <span className="font-mono">admin@kampus.ac.id</span> / <span className="font-mono">Admin123!</span>
          </p>
        </div>
      </div>
    </div>
  )
}
